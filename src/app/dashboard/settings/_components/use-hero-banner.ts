"use client";
// Homepage banner — the settings page's state and every change it makes
// (server.me docs/site-hero.md).
//
// Operations. Each change carries an op token the server issued (from the
// last read or the last change). A request whose answer never arrives — a
// dropped connection, a stalled upload, a proxy timeout, a request that hangs
// past its deadline — is looked up by its operation id instead of being
// guessed at: `completed` / `failed` come from the server's receipt,
// `processing` means the image job is still running, and `unknown` (no
// receipt, no job) means it has not been applied — so far. "Try again" after
// an unanswered request repeats the very same request with the same token,
// so it can only ever apply once; after a definite failure it starts a new
// operation. Nothing here retries on its own.
//
// Images are prepared one at a time (the server runs one image job across
// all admins): choosing "Prepare" on the second slot while the first is busy
// queues it. Leaving the page stops anything not yet started and every
// lookup; an upload already sent finishes on the server.
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ApiError,
  NetworkError,
  discardHeroDraft,
  editHeroAlt,
  fetchHeroAdmin,
  fetchHeroOperation,
  publishHero,
  restoreHeroDefault,
  uploadHeroDraft,
  type HeroMutation,
  type HeroSlotName,
  type HeroState,
} from "@/lib/admin-api";
import { queryKeys } from "@/lib/query-keys";
import { LIVE } from "@/lib/query-presets";
import { MAX_UPLOAD_BYTES, NEEDS_ANOTHER_FILE, opIdOf, type Focal } from "@/lib/hero-banner";
import { CompressionFailed, compressForUpload } from "@/lib/hero-compress";

const KEY = queryKeys.siteHero;
const TOKEN_FRESH_MS = 25 * 60 * 1000; // the server honours them for 30
const STALL_MS = 90 * 1000; // uploaded, no answer yet → look the operation up
const UPLOAD_IDLE_MS = 60 * 1000; // no upload progress at all for this long → give up the request
const POLL_EVERY_MS = 3000;
const POLL_FOR_MS = 3 * 60 * 1000;
const UNKNOWN_CONFIRMS = 4; // "no such operation" this many times in a row (≈ 10 s) → not applied (yet)

export type OpKey = HeroSlotName | "banner" | "discard-desktop" | "discard-mobile";
export type OpState =
  | { phase: "idle" }
  | { phase: "queued" }
  | { phase: "compressing" }
  | { phase: "uploading"; progress: number }
  | { phase: "processing"; since: number }
  | { phase: "checking"; detail: "processing" | "unknown" | "offline" }
  | { phase: "unconfirmed" }
  | { phase: "failed"; code: string; message: string; sameOp: boolean; canRetry: boolean }
  | { phase: "done"; at: number };
const IDLE: OpState = { phase: "idle" };

export interface DraftInput {
  file: File;
  url: string; // the object URL the page previews (compression reads it)
  focal: Focal;
  acceptRatio: boolean;
}
export interface LastChange {
  kind: "publish" | "alt" | "restore";
  at: number;
  notified: HeroMutation["notified"] | null; // null: confirmed by lookup, no refresh status
}

interface DraftAttempt {
  slot: HeroSlotName;
  opId: string;
  blob: Blob;
  filename: string;
  fields: Record<string, string>;
}
interface BannerAttempt {
  key: OpKey;
  opId: string;
  token: string;
  send: (token: string) => Promise<HeroMutation>;
  onDone: (res: HeroMutation | null) => void;
}
type Reconciled = { kind: "completed" } | { kind: "failed"; error: ApiError } | { kind: "unknown" } | { kind: "unconfirmed" } | { kind: "cancelled" };

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const onAbort = () => {
      clearTimeout(t);
      resolve();
    };
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const OFFLINE: OpState = { phase: "failed", code: "OFFLINE", message: "You're offline — reconnect, then try again.", sameOp: false, canRetry: true };
const NOT_CONFIRMED = "The server didn't confirm this (connection problem). Trying again is safe — it can only be applied once.";

// An answer that does not say whether the change happened.
function isUncertain(err: unknown) {
  if (!(err instanceof ApiError)) return true; // no answer at all (or it timed out)
  if (err.code === "HERO_OUTCOME_UNKNOWN" || err.code === "SERVER_ERROR") return true;
  return err.status >= 500 && err.code.startsWith("HTTP_"); // a proxy or the platform, not our API
}

const CONFLICTS = new Set(["HERO_DRAFT_CHANGED", "HERO_VERSION_CONFLICT", "HERO_DRAFT_EXPIRED", "HERO_NOT_CUSTOM"]);
const waitText = (s: number) => (s >= 90 ? `about ${Math.round(s / 60)} minutes` : `about ${s} s`);
function describe(err: unknown): { code: string; message: string } {
  if (err instanceof ApiError) {
    const retryAfter = (err.data as { retryAfter?: number } | undefined)?.retryAfter;
    switch (err.code) {
      case "HERO_DRAFT_CHANGED":
        return { code: err.code, message: "Someone else changed this draft in the meantime — the latest version is shown now. Review it, then try again." };
      case "HERO_VERSION_CONFLICT":
        return { code: err.code, message: "The banner was changed by someone else while you were reviewing — the latest version is shown now. Review it, then try again." };
      case "HERO_DRAFT_EXPIRED":
        return { code: err.code, message: "A draft expired before it was published — prepare that image again." };
      case "HERO_NOT_CUSTOM":
        return { code: err.code, message: "The website is showing its built-in banner, so there is no description to edit. Publish your own banner first." };
      case "HERO_BUSY":
        return { code: err.code, message: `Another banner image is being prepared right now — try again in ${retryAfter ? waitText(Math.min(retryAfter, 180)) : "a minute"}.` };
      case "IMAGE_NOT_ALLOWED":
        return { code: err.code, message: "This image contains a QR code, and the banner can't show QR codes. Remove it from the artwork, export it again and choose the new file." };
      case "OP_EXPIRED":
      case "OP_TOKEN_REQUIRED":
      case "OP_TOKEN_INVALID":
      case "OP_ID_REUSED":
        return { code: err.code, message: "This page was open too long before the change was sent. Nothing was changed — try again." };
      case "HERO_ACK_REQUIRED":
        return { code: err.code, message: "An image is below the quality target or over the size limit — review the details in the publish dialog and confirm to publish it anyway." };
      case "HTTP_413":
        return { code: err.code, message: "The file is too large for the server (the limit is 4 MB). Export a smaller JPEG and choose it again." };
      default:
        if (err.code.startsWith("HTTP_")) return { code: err.code, message: `The server didn't answer properly (${err.status}) — try again.` };
        return { code: err.code, message: err.message };
    }
  }
  if (err instanceof NetworkError) return { code: "NETWORK", message: "Connection problem — check your internet connection and try again." };
  return { code: "CLIENT_ERROR", message: (err as Error)?.message || "Something went wrong — try again." };
}

async function reconcile(opId: string, { unknownLimit, signal, onDetail }: { unknownLimit: number; signal?: AbortSignal; onDetail: (d: "processing" | "unknown" | "offline") => void }): Promise<Reconciled> {
  const end = Date.now() + POLL_FOR_MS;
  let unknowns = 0;
  while (!signal?.aborted) {
    let detail: "processing" | "unknown" | "offline";
    try {
      const st = await fetchHeroOperation(opId);
      if (st.status === "completed") return { kind: "completed" };
      if (st.status === "failed") {
        const r = st.result || {};
        return { kind: "failed", error: new ApiError(r.httpStatus || 409, r.code || "HERO_FAILED", r.message || "The change failed.") };
      }
      detail = st.status;
      unknowns = st.status === "unknown" ? unknowns + 1 : 0;
      if (unknowns >= unknownLimit) return { kind: "unknown" };
    } catch (err) {
      // The lookup itself failed — that says nothing about the change. A
      // throttled or timed-out lookup is tried again; any other refusal
      // (signed out, forbidden…) ends the lookup as "not confirmed", never
      // as a failure of the change.
      if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408 && err.status !== 429) return { kind: "unconfirmed" };
      detail = "offline";
    }
    if (signal?.aborted) break;
    onDetail(detail);
    if (Date.now() + POLL_EVERY_MS > end) return { kind: "unconfirmed" };
    await sleep(POLL_EVERY_MS, signal);
  }
  return { kind: "cancelled" };
}

export function useHeroBanner() {
  const queryClient = useQueryClient();
  const tokenRef = useRef<{ token: string; at: number } | null>(null);
  const remember = (token: string | undefined) => {
    if (token) tokenRef.current = { token, at: Date.now() };
  };

  const queryFn = useCallback(async (): Promise<HeroState> => {
    const { state, opToken } = await fetchHeroAdmin();
    remember(opToken);
    return state;
  }, []);
  const query = useQuery({ queryKey: KEY, queryFn, ...LIVE });

  const [ops, setOps] = useState<Record<OpKey, OpState>>({ desktop: IDLE, mobile: IDLE, banner: IDLE, "discard-desktop": IDLE, "discard-mobile": IDLE });
  const setOp = useCallback((key: OpKey, next: OpState) => setOps((prev) => ({ ...prev, [key]: next })), []);
  const [lastChange, setLastChange] = useState<LastChange | null>(null);

  // Leaving the page: nothing new starts, every lookup stops.
  const alive = useRef(new AbortController());
  useEffect(() => {
    const ctl = new AbortController();
    alive.current = ctl;
    return () => ctl.abort();
  }, []);

  // A fresh read — never one that started before the change it follows.
  const refreshState = useCallback(async () => {
    await queryClient.cancelQueries({ queryKey: KEY });
    return queryClient.fetchQuery({ queryKey: KEY, queryFn, staleTime: 0 });
  }, [queryClient, queryFn]);

  // An unused token, fresh enough; otherwise a read hands out a new one.
  // Every token is used once: taken out of the store before the request.
  // A read cancelled by another change's result is simply retried.
  const takeToken = useCallback(async () => {
    for (let i = 0; i < 4; i += 1) {
      const t = tokenRef.current;
      tokenRef.current = null;
      if (t && Date.now() - t.at < TOKEN_FRESH_MS) return t.token;
      await refreshState().catch(() => {});
    }
    throw new NetworkError("Couldn't start the change — reload the page and try again.");
  }, [refreshState]);

  // A change's answer carries the whole state; an older answer arriving late
  // (another change finished in between) must not put stale data back.
  const apply = useCallback(
    async (res: HeroMutation) => {
      remember(res.opToken);
      await queryClient.cancelQueries({ queryKey: KEY });
      const cached = queryClient.getQueryData<HeroState>(KEY);
      const t = (s: HeroState | undefined) => (s && s.updatedAt ? new Date(s.updatedAt).getTime() : 0);
      if (!cached || t(res.state) >= t(cached)) queryClient.setQueryData(KEY, res.state);
      else refreshState().catch(() => {});
    },
    [queryClient, refreshState],
  );

  const failWith = useCallback(
    (key: OpKey, err: unknown) => {
      const { code, message } = describe(err);
      setOp(key, { phase: "failed", code, message, sameOp: false, canRetry: !NEEDS_ANOTHER_FILE.has(code) });
      if (CONFLICTS.has(code)) refreshState().catch(() => {});
    },
    [refreshState, setOp],
  );

  const finish = useCallback(
    async (key: OpKey, r: Reconciled): Promise<boolean> => {
      if (r.kind === "completed") {
        await refreshState().catch(() => {});
        setOp(key, { phase: "done", at: Date.now() });
        return true;
      }
      if (r.kind === "failed") failWith(key, r.error);
      else if (r.kind === "unknown") setOp(key, { phase: "failed", code: "NOT_CONFIRMED", message: NOT_CONFIRMED, sameOp: true, canRetry: true });
      else if (r.kind === "unconfirmed") setOp(key, { phase: "unconfirmed" });
      return false;
    },
    [failWith, refreshState, setOp],
  );

  const settle = useCallback(
    async (key: OpKey, opId: string, unknownLimit: number) => {
      setOp(key, { phase: "checking", detail: "unknown" });
      return finish(key, await reconcile(opId, { unknownLimit, signal: alive.current.signal, onDetail: (detail) => setOp(key, { phase: "checking", detail }) }));
    },
    [finish, setOp],
  );

  // --- images -------------------------------------------------------------------
  const draftAttempts = useRef<Partial<Record<HeroSlotName, DraftAttempt>>>({});
  const activeDraft = useRef<HeroSlotName | null>(null);
  const queue = useRef<Array<{ slot: HeroSlotName; run: () => Promise<boolean>; resolve: (ok: boolean) => void }>>([]);

  const sendDraft = useCallback(
    async (a: DraftAttempt): Promise<boolean> => {
      const form = new FormData();
      for (const [k, v] of Object.entries(a.fields)) form.append(k, v);
      form.append("image", a.blob, a.filename);
      setOp(a.slot, { phase: "uploading", progress: 0 });
      const xhr = new AbortController();
      let stallTimer: ReturnType<typeof setTimeout> | undefined;
      let idleTimer: ReturnType<typeof setTimeout> | undefined;
      let onStall: () => void = () => {};
      const stalled = new Promise<"stalled">((resolve) => {
        onStall = () => resolve("stalled");
      });
      const armIdle = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => xhr.abort(), UPLOAD_IDLE_MS);
      };
      armIdle();
      const request = uploadHeroDraft(a.slot, form, {
        signal: xhr.signal,
        onProgress: (f) => {
          armIdle();
          setOp(a.slot, { phase: "uploading", progress: f });
        },
        onSent: () => {
          clearTimeout(idleTimer);
          setOp(a.slot, { phase: "processing", since: Date.now() });
          stallTimer = setTimeout(onStall, STALL_MS);
        },
      }).then(
        (body) => ({ body }),
        (error: unknown) => ({ error }),
      );
      try {
        let answer = await Promise.race([request, stalled]);
        if (answer === "stalled") {
          // Keep waiting for the answer, and meanwhile ask the server directly.
          const poll = new AbortController();
          const stop = () => poll.abort();
          // the page may already have been left (an abort listener added
          // after the fact never fires)
          if (alive.current.signal.aborted) poll.abort();
          else alive.current.signal.addEventListener("abort", stop, { once: true });
          const looked = reconcile(a.opId, { unknownLimit: Infinity, signal: poll.signal, onDetail: (detail) => setOp(a.slot, { phase: "checking", detail }) }).then((r) => ({ reconciled: r }));
          const next = await Promise.race([request, looked]);
          alive.current.signal.removeEventListener("abort", stop);
          if ("reconciled" in next) {
            xhr.abort();
            return finish(a.slot, next.reconciled);
          }
          poll.abort();
          answer = next;
        }
        if ("error" in answer) {
          if (isUncertain(answer.error)) return settle(a.slot, a.opId, UNKNOWN_CONFIRMS);
          failWith(a.slot, answer.error);
          return false;
        }
        if ("status" in answer.body && answer.body.status === "processing") return settle(a.slot, a.opId, Infinity); // an earlier attempt is still running
        await apply(answer.body as HeroMutation);
        setOp(a.slot, { phase: "done", at: Date.now() });
        return true;
      } finally {
        clearTimeout(stallTimer);
        clearTimeout(idleTimer);
      }
    },
    [apply, failWith, finish, setOp, settle],
  );

  const pump = useCallback(() => {
    if (activeDraft.current || alive.current.signal.aborted) return;
    const next = queue.current.shift();
    if (!next) return;
    activeDraft.current = next.slot;
    next
      .run()
      .catch((err) => {
        failWith(next.slot, err);
        return false;
      })
      .then((ok) => next.resolve(ok))
      .finally(() => {
        activeDraft.current = null;
        pump();
      });
  }, [failWith]);

  const enqueue = useCallback(
    (slot: HeroSlotName, run: () => Promise<boolean>) =>
      new Promise<boolean>((resolve) => {
        queue.current = queue.current.filter((q) => q.slot !== slot);
        queue.current.push({ slot, run, resolve });
        if (activeDraft.current) setOp(slot, { phase: "queued" });
        pump();
      }),
    [pump, setOp],
  );
  // Leaving the page: queued images never start.
  useEffect(
    () => () => {
      for (const q of queue.current) q.resolve(false);
      queue.current = [];
    },
    [],
  );

  const prepare = useCallback(
    (slot: HeroSlotName, input: DraftInput) =>
      enqueue(slot, async () => {
        if (offline()) {
          setOp(slot, OFFLINE);
          return false;
        }
        let blob: Blob = input.file;
        let focal = input.focal;
        let clientReencoded = false;
        if (input.file.size > MAX_UPLOAD_BYTES) {
          setOp(slot, { phase: "compressing" });
          try {
            blob = await compressForUpload({ url: input.url, name: input.file.name, focal: input.focal }, slot);
          } catch (err) {
            const code = err instanceof CompressionFailed ? "TOO_LARGE_AFTER_COMPRESSION" : "COMPRESSION_FAILED";
            setOp(slot, { phase: "failed", code, message: (err as Error).message, sameOp: false, canRetry: false });
            return false;
          }
          focal = { x: 0.5, y: 0.5 }; // already cropped exactly
          clientReencoded = true;
        } else {
          setOp(slot, { phase: "uploading", progress: 0 }); // started: no longer cancellable
        }
        const token = await takeToken();
        const state = queryClient.getQueryData<HeroState>(KEY);
        const attempt: DraftAttempt = {
          slot,
          opId: opIdOf(token) || "",
          blob,
          filename: clientReencoded ? (blob as File).name : input.file.name,
          fields: {
            opToken: token,
            expectedDraftOpId: state?.draft[slot]?.opId || "",
            focalX: String(focal.x),
            focalY: String(focal.y),
            acceptRatio: input.acceptRatio ? "true" : "false",
            clientReencoded: clientReencoded ? "true" : "false",
          },
        };
        draftAttempts.current[slot] = attempt;
        const ok = await sendDraft(attempt);
        if (ok) toast.success(`${slot === "desktop" ? "Desktop" : "Mobile"} draft ready — review it, then publish.`);
        return ok;
      }),
    [enqueue, queryClient, sendDraft, setOp, takeToken],
  );

  // Only a job that has not started can be cancelled.
  const cancelQueued = useCallback(
    (slot: HeroSlotName) => {
      const item = queue.current.find((q) => q.slot === slot);
      if (!item) return;
      queue.current = queue.current.filter((q) => q.slot !== slot);
      item.resolve(false);
      setOp(slot, IDLE);
    },
    [setOp],
  );

  // --- banner changes (publish / description / restore / discard) --------------
  const bannerAttempts = useRef<Partial<Record<OpKey, BannerAttempt>>>({});

  const execute = useCallback(
    async (a: BannerAttempt) => {
      setOp(a.key, { phase: "processing", since: Date.now() });
      try {
        const res = await a.send(a.token);
        await apply(res);
        setOp(a.key, { phase: "done", at: Date.now() });
        a.onDone(res);
        return true;
      } catch (err) {
        if (!isUncertain(err)) {
          failWith(a.key, err);
          return false;
        }
        const ok = await settle(a.key, a.opId, UNKNOWN_CONFIRMS);
        if (ok) a.onDone(null);
        return ok;
      }
    },
    [apply, failWith, setOp, settle],
  );

  const run = useCallback(
    async (key: OpKey, send: (token: string) => Promise<HeroMutation>, onDone: (res: HeroMutation | null) => void = () => {}) => {
      if (offline()) {
        setOp(key, OFFLINE);
        return false;
      }
      setOp(key, { phase: "processing", since: Date.now() });
      let token: string;
      try {
        token = await takeToken();
      } catch (err) {
        failWith(key, err);
        return false;
      }
      const attempt: BannerAttempt = { key, token, opId: opIdOf(token) || "", send, onDone };
      bannerAttempts.current[key] = attempt;
      return execute(attempt);
    },
    [execute, failWith, setOp, takeToken],
  );

  const publish = useCallback(
    (input: { expectedVersion: number; slots: Partial<Record<HeroSlotName, string>>; alt: string; acknowledgeShortfall?: boolean }) =>
      run("banner", (opToken) => publishHero({ opToken, ...input }), (res) => {
        setLastChange({ kind: "publish", at: Date.now(), notified: res ? res.notified || null : null });
        toast.success("Banner published.");
      }),
    [run],
  );
  const saveAlt = useCallback(
    (input: { expectedVersion: number; alt: string }) =>
      run("banner", (opToken) => editHeroAlt({ opToken, ...input }), (res) => {
        setLastChange({ kind: "alt", at: Date.now(), notified: res ? res.notified || null : null });
        toast.success("Description saved.");
      }),
    [run],
  );
  const restore = useCallback(
    (input: { expectedVersion: number }) =>
      run("banner", (opToken) => restoreHeroDefault({ opToken, ...input }), (res) => {
        setLastChange({ kind: "restore", at: Date.now(), notified: res ? res.notified || null : null });
        toast.success("The built-in banner is back.");
      }),
    [run],
  );
  const discard = useCallback(
    (slot: HeroSlotName, expectedDraftOpId: string) =>
      run(slot === "desktop" ? "discard-desktop" : "discard-mobile", (opToken) => discardHeroDraft(slot, { opToken, expectedDraftOpId }), () => {
        toast.success(`${slot === "desktop" ? "Desktop" : "Mobile"} draft discarded.`);
      }),
    [run],
  );

  // "Try again" after an unanswered request: the same request, same token.
  const retrySame = useCallback(
    (key: OpKey) => {
      if (key === "desktop" || key === "mobile") {
        const a = draftAttempts.current[key];
        if (a) return enqueue(key, () => sendDraft(a));
        return Promise.resolve(false);
      }
      const a = bannerAttempts.current[key];
      return a ? execute(a) : Promise.resolve(false);
    },
    [enqueue, execute, sendDraft],
  );
  // "Check again" after the lookup window ran out.
  const checkAgain = useCallback(
    (key: OpKey) => {
      const opId = key === "desktop" || key === "mobile" ? draftAttempts.current[key]?.opId : bannerAttempts.current[key]?.opId;
      if (!opId) return Promise.resolve(false);
      return settle(key, opId, UNKNOWN_CONFIRMS);
    },
    [settle],
  );
  const dismiss = useCallback((key: OpKey) => setOp(key, IDLE), [setOp]);

  // Leaving while a file is being compressed or sent loses that upload: ask
  // first. (Once it is on the server, leaving is harmless — the draft appears
  // the next time this page is opened.)
  const sending = Object.values(ops).some((o) => o.phase === "compressing" || o.phase === "uploading");
  useEffect(() => {
    if (!sending) return undefined;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [sending]);

  return { query, ops, lastChange, dismissLastChange: () => setLastChange(null), prepare, cancelQueued, publish, saveAlt, restore, discard, retrySame, checkAgain, dismiss, refresh: refreshState };
}

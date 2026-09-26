"use client";
// Settings → Homepage banner (server.me docs/site-hero.md).
//
// The banner is two artworks (desktop, mobile) and one description that fits
// both. Each image is prepared as a draft first — optimised copies the admin
// looks at before anything changes — and published afterwards. Publishing
// shows the complete pair that will go live, including artwork that is not
// changing, and sends exactly what was shown: if the banner changes while the
// dialog is open, the server refuses (409) instead of publishing something
// nobody reviewed. "Discard draft" (one prepared image) and "Restore the
// built-in banner" (the whole banner) are separate, differently worded
// actions. Nothing here names a campaign: any festival, offer or season.
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FlaskConical, ImageIcon, Info, Loader2, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiError, type HeroArtwork as Artwork, type HeroSlotName, type HeroState } from "@/lib/admin-api";
import { ALT_MAX, cleanAlt, HERO_SLOT_NAMES } from "@/lib/hero-banner";
import { cn } from "@/lib/utils";
import { HeroArtwork } from "./hero-artwork";
import { BuiltInBanner, SITE_URL } from "./hero-built-in";
import { fmtDay, fmtWhen, HeroSlotCard } from "./hero-slot-card";
import { useHeroBanner, type LastChange, type OpState } from "./use-hero-banner";

const ACTIVE = new Set(["queued", "compressing", "uploading", "processing", "checking"]);
const isActive = (o: OpState) => ACTIVE.has(o.phase);
const ALT_EXAMPLE = "Monsoon offer: 20% off homestays — misty hills at sunrise";

interface Review {
  version: number;
  slots: Partial<Record<HeroSlotName, string>>;
  alt: string;
  pair: Record<HeroSlotName, { art: Artwork | null; isNew: boolean }>;
  altUnchanged: boolean;
}

export function HeroBannerSettings() {
  const h = useHeroBanner();
  const state = h.query.data;

  // A file dropped anywhere else on the page must not open it in the tab
  // (and lose the crop in progress): only the slots' drop areas take files.
  useEffect(() => {
    const guard = (e: DragEvent) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", guard);
    window.addEventListener("drop", guard);
    return () => {
      window.removeEventListener("dragover", guard);
      window.removeEventListener("drop", guard);
    };
  }, []);

  if (h.query.isPending) {
    return (
      <Shell>
        <div className="space-y-4" aria-busy="true" aria-label="Loading the banner settings">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="aspect-[1920/740] w-full" />
          <Skeleton className="mx-auto aspect-[530/720] w-40" />
        </div>
      </Shell>
    );
  }
  if (!state) {
    // 401s already went back to sign-in (admin-api); a 403 says why
    const err = h.query.error;
    const code = err instanceof ApiError ? err.code : "";
    const denied = err instanceof ApiError && err.status === 403;
    const message =
      code === "AUTH_TOKEN_INVALID"
        ? "Your session is no longer valid."
        : code === "USER_BANNED"
          ? "This account has been banned."
          : denied
            ? "Your account can't change the homepage banner."
            : "Couldn't load the banner settings. Nothing has changed.";
    return (
      <Shell>
        <div role="alert" className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p>{message}</p>
            {code === "AUTH_TOKEN_INVALID" ? (
              <Link href="/" className="mt-1 inline-block font-medium underline underline-offset-2">
                Sign in again
              </Link>
            ) : !denied ? (
              <button type="button" onClick={() => h.query.refetch()} className="mt-1 font-medium underline underline-offset-2">
                Retry
              </button>
            ) : null}
          </div>
        </div>
      </Shell>
    );
  }
  return <Loaded h={h} state={state} />;
}

function Shell({ children, status }: { children: React.ReactNode; status?: React.ReactNode }) {
  return (
    <section aria-labelledby="hero-banner-title" className="overflow-hidden rounded-lg bg-white shadow-md">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex items-start gap-4">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primaryGreen/10 text-primaryGreen sm:flex">
            <ImageIcon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 id="hero-banner-title" className="text-lg font-medium text-gray-900">
                  Homepage banner
                </h2>
                <p className="mt-1 text-sm text-gray-600">The large image at the top of the website&apos;s home page — for any season, festival or offer. Desktop and mobile use separate artwork and share one description.</p>
              </div>
              {status}
            </div>
            <div className="mt-5">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Loaded({ h, state }: { h: ReturnType<typeof useHeroBanner>; state: HeroState }) {
  const ids = useId();
  const altRef = useRef<HTMLTextAreaElement>(null);
  const reviewBtnRef = useRef<HTMLButtonElement>(null);
  const restoreBtnRef = useRef<HTMLButtonElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);
  // where focus goes when a dialog closes, if something asked for it
  const afterClose = useRef<HTMLElement | null>(null);
  const focusAfterClose = (fallback: HTMLElement | null) => {
    (afterClose.current || fallback)?.focus();
    afterClose.current = null;
  };
  const [alt, setAlt] = useState(state.alt || "");
  // the version the admin's edit started from: a save is checked against it
  const [altBase, setAltBase] = useState<number | null>(null);
  const [altTouched, setAltTouched] = useState(false);
  // The banner changed (another admin published, restored or saved a
  // description) while this description was being edited: their current
  // description, shown beside the field before anything is sent — never
  // overwritten silently, and the next Save/Publish starts from it.
  const [altConflict, setAltConflict] = useState<{ version: number; alt: string } | null>(null);
  const [chosen, setChosen] = useState<Record<HeroSlotName, boolean>>({ desktop: true, mobile: true });
  const [review, setReview] = useState<Review | null>(null);
  const [restoreAt, setRestoreAt] = useState<number | null>(null); // the version the admin saw when asked
  const altDirty = altBase !== null;

  // Someone else's change arrives: show it, unless the admin is editing.
  useEffect(() => {
    if (!altDirty) setAlt(state.alt || "");
  }, [state.alt, altDirty]);

  const usable = (s: HeroSlotName) => !!state.draft[s] && !state.draft[s]!.expired;
  const selected = HERO_SLOT_NAMES.filter((s) => usable(s) && (!state.custom || chosen[s]));
  const cleaned = cleanAlt(alt);
  const altError = !cleaned ? "Add a description of the banner." : cleaned.length > ALT_MAX ? `Use ${ALT_MAX} characters or fewer.` : null;
  const imageJob = isActive(h.ops.desktop) || isActive(h.ops.mobile);
  const bannerBusy = isActive(h.ops.banner);
  const lease = state.busy && !imageJob ? state.busy : null;

  // Someone's image job holds the lease: look every 5 s (a cheap read) so
  // preparing is offered again as soon as it ends — not only when the
  // lease's safety window runs out. Bounded by that window.
  const leaseUntil = lease ? new Date(lease.until).getTime() : 0;
  const { refresh } = h;
  useEffect(() => {
    if (!leaseUntil) return undefined;
    const t = setInterval(() => {
      if (Date.now() > leaseUntil + 5000) clearInterval(t);
      refresh().catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [leaseUntil, refresh]);
  const blocked = lease ? (lease.own ? "An image you started earlier is still being prepared. You can prepare another as soon as it finishes." : `Another admin is preparing a banner image — possible again by ${fmtWhen(lease.until).split(", ").pop()}.`) : null;

  let publishBlock: string | null = null;
  if (imageJob) publishBlock = "Wait for the image to finish preparing.";
  else if (!state.custom && selected.length < 2) {
    const missing = HERO_SLOT_NAMES.filter((s) => !usable(s));
    publishBlock = missing.length === 2 ? "Prepare a desktop and a mobile image to publish your own banner." : `Prepare the ${missing[0]} image too — the first custom banner needs both.`;
  } else if (selected.length === 0) publishBlock = HERO_SLOT_NAMES.some(usable) ? "Choose at least one draft to publish." : "Prepare a new image above to publish it. To change only the description, edit it and choose Save description.";

  const canPublish = !publishBlock && selected.length > 0 && !bannerBusy;
  const altChanged = state.custom && cleaned !== (state.alt || "");
  const canSaveAlt = state.custom && selected.length === 0 && altChanged && !altError && !bannerBusy;

  const pairNow = useMemo(() => {
    const pick = (s: HeroSlotName) => (selected.includes(s) ? { art: state.draft[s], isNew: true } : { art: state[s], isNew: false });
    return { desktop: pick("desktop"), mobile: pick("mobile") };
  }, [selected, state]);

  // An edit that started from an older banner: show what is there now, once;
  // the next attempt starts from the current version.
  const editStale = () => {
    if (!altDirty || altBase === state.version) return false;
    if (altConflict && altConflict.version === state.version) {
      setAltBase(state.version);
      return false;
    }
    setAltConflict({ version: state.version, alt: state.alt || "" });
    altRef.current?.focus();
    return true;
  };
  useEffect(() => {
    if (altDirty && altBase !== state.version) setAltConflict((c) => (c && c.version === state.version ? c : { version: state.version, alt: state.alt || "" }));
  }, [altDirty, altBase, state.version, state.alt]);

  // The dialog shows — and publishes — this snapshot, never later state.
  const startReview = () => {
    setAltTouched(true);
    if (altError) {
      altRef.current?.focus(); // the field says what is missing
      return;
    }
    if (!canPublish) return;
    if (editStale()) return;
    const slots: Partial<Record<HeroSlotName, string>> = {};
    for (const s of selected) slots[s] = state.draft[s]!.opId;
    setReview({ version: state.version, slots, alt: cleaned, pair: pairNow, altUnchanged: state.custom && cleaned === (state.alt || "") });
  };
  const doPublish = async () => {
    if (!review) return;
    const ok = await h.publish({ expectedVersion: review.version, slots: review.slots, alt: review.alt });
    setReview(null);
    if (ok) {
      setAltBase(null);
      setAltTouched(false);
      setAltConflict(null);
    }
  };
  const doSaveAlt = async () => {
    setAltTouched(true);
    if (altError) {
      altRef.current?.focus();
      return;
    }
    if (editStale()) return;
    if (await h.saveAlt({ expectedVersion: state.version, alt: cleaned })) {
      setAltBase(null);
      setAltConflict(null);
    }
  };
  const doRestore = async () => {
    const at = restoreAt ?? state.version;
    setRestoreAt(null);
    await h.restore({ expectedVersion: at });
  };
  useEffect(() => {
    if (h.lastChange) noticeRef.current?.focus();
  }, [h.lastChange]);

  const statusPill = (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", state.custom ? "bg-green-50 text-green-800 ring-green-200" : "bg-gray-100 text-gray-700 ring-gray-200")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", state.custom ? "bg-green-600" : "bg-gray-500")} aria-hidden="true" />
      {state.custom ? "Your banner is live" : "Built-in banner is live"}
    </span>
  );

  return (
    <Shell status={statusPill}>
      <div className="space-y-5">
        {state.environment && state.environment.writable === false && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-medium">Read only here.</span> These banner settings belong to {state.environment.namespace === "site/hero/" ? "the live website" : "another environment"}; this server is not production, so it can't change them.
            </p>
          </div>
        )}
        {state.environment && !state.environment.production && state.environment.writable !== false && (
          <div className="flex items-start gap-2 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-medium">Test environment.</span> Banners published here are kept apart ({state.environment.prefix}) and never appear on the live website.
            </p>
          </div>
        )}
        <p className="text-sm text-gray-700">
          {state.custom ? (
            <>
              Published {state.updatedAt ? fmtWhen(state.updatedAt) : ""}
              {state.updatedBy ? ` by ${state.updatedBy}` : ""}.{" "}
            </>
          ) : (
            "The website shows its built-in banner (the one that ships with the website). "
          )}
          <a href={SITE_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primaryGreen underline underline-offset-2">
            View the website <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>

        {h.lastChange && (
          <div ref={noticeRef} tabIndex={-1} className="outline-none">
            <ChangeNotice change={h.lastChange} onDismiss={h.dismissLastChange} />
          </div>
        )}

        {blocked && (
          <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>{blocked}</p>
          </div>
        )}

        {HERO_SLOT_NAMES.map((slot) => (
          <HeroSlotCard
            key={slot}
            slot={slot}
            live={state[slot]}
            draft={state.draft[slot]}
            op={h.ops[slot]}
            discardOp={h.ops[slot === "desktop" ? "discard-desktop" : "discard-mobile"]}
            blocked={blocked}
            onPrepare={(input) => h.prepare(slot, input)}
            onCancelQueued={() => h.cancelQueued(slot)}
            onRetrySame={() => {
              h.retrySame(slot);
            }}
            onCheckAgain={() => {
              h.checkAgain(slot);
            }}
            onDismiss={() => h.dismiss(slot)}
            onDiscard={(opId) => h.discard(slot, opId)}
            onDismissDiscard={() => h.dismiss(slot === "desktop" ? "discard-desktop" : "discard-mobile")}
          />
        ))}

        {/* publish */}
        <section aria-labelledby={`${ids}-publish`} className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
          <h3 id={`${ids}-publish`} className="text-base font-semibold text-gray-900">
            {state.custom ? "Publish changes" : "Publish your banner"}
          </h3>

          {state.custom && HERO_SLOT_NAMES.some(usable) && (
            <fieldset className="mt-3">
              <legend className="text-sm text-gray-700">Drafts to publish</legend>
              <div className="mt-2 flex flex-col gap-2">
                {HERO_SLOT_NAMES.filter(usable).map((s) => {
                  const d = state.draft[s]!;
                  return (
                    <label key={s} className="flex min-h-6 cursor-pointer items-start gap-2 text-sm text-gray-900">
                      <Checkbox className="mt-0.5" checked={chosen[s]} disabled={bannerBusy} onCheckedChange={(v) => setChosen((c) => ({ ...c, [s]: v === true }))} />
                      <span>
                        <span className="font-medium">{s === "desktop" ? "Desktop draft" : "Mobile draft"}</span>
                        <span className="text-gray-600">
                          {" "}
                          · prepared{d.stagedBy ? ` by ${d.stagedBy}` : ""}, {fmtDay(d.stagedAt)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-1 text-xs text-gray-600">An image that isn&apos;t selected stays as it is on the website.</p>
            </fieldset>
          )}

          <div className="mt-4">
            <label htmlFor={`${ids}-alt`} className="text-sm font-medium text-gray-900">
              Banner description <span className="font-normal text-gray-600">(required)</span>
            </label>
            <p id={`${ids}-alt-hint`} className="mt-0.5 text-xs text-gray-600">
              What the banner shows, including any words on it. Screen readers read it out and search engines use it. It must fit both images.
            </p>
            <textarea
              ref={altRef}
              id={`${ids}-alt`}
              value={alt}
              rows={2}
              maxLength={ALT_MAX + 50}
              placeholder={`e.g. ${ALT_EXAMPLE}`}
              disabled={bannerBusy}
              aria-invalid={altTouched && !!altError}
              aria-describedby={`${ids}-alt-hint ${ids}-alt-count${altTouched && altError ? ` ${ids}-alt-error` : ""}${altConflict && altDirty ? ` ${ids}-alt-conflict` : ""}`}
              onChange={(e) => {
                setAlt(e.target.value);
                if (altBase === null) setAltBase(state.version);
              }}
              onBlur={() => setAltTouched(true)}
              className={cn(
                "mt-2 block w-full resize-y rounded-md border bg-white px-3 py-2 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryGreen sm:text-sm",
                altTouched && altError ? "border-red-400" : "border-gray-300",
              )}
            />
            <div className="mt-1 flex items-start justify-between gap-3 text-xs">
              <p id={`${ids}-alt-error`} className="text-red-700">
                {altTouched && altError ? altError : ""}
              </p>
              <p id={`${ids}-alt-count`} className={cn("shrink-0 tabular-nums", cleaned.length > ALT_MAX ? "text-red-700" : "text-gray-600")}>
                {cleaned.length} / {ALT_MAX}
              </p>
            </div>
            {altConflict && altDirty && (
              <div id={`${ids}-alt-conflict`} role="status" className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-medium">The banner was changed while you were editing this description (in another tab or by another admin).</p>
                <p className="mt-1">
                  Its description now: {altConflict.alt ? <q className="break-words">{altConflict.alt}</q> : <span>none (the built-in banner is live)</span>}
                </p>
                <p className="mt-1">Your text is kept. Check it against the images above, then save or publish again — that replaces the description shown here.</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button ref={reviewBtnRef} type="button" onClick={startReview} disabled={!canPublish} className="bg-primaryGreen text-white hover:bg-primaryGreen/90">
              Review and publish
            </Button>
            {state.custom && selected.length === 0 && (
              <Button type="button" variant="outline" onClick={doSaveAlt} disabled={!canSaveAlt}>
                {bannerBusy ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : null}
                Save description
              </Button>
            )}
          </div>
          {publishBlock && <p className="mt-2 text-xs text-gray-600">{publishBlock}</p>}
          <BannerOpNotice op={h.ops.banner} inDialog={!!review} onRetrySame={() => h.retrySame("banner")} onCheckAgain={() => h.checkAgain("banner")} onDismiss={() => h.dismiss("banner")} />
        </section>

        {state.custom && (
          <section aria-labelledby={`${ids}-restore`} className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
            <h3 id={`${ids}-restore`} className="text-base font-semibold text-gray-900">
              Restore the built-in banner
            </h3>
            <p className="mt-1 text-sm text-gray-600">Takes your banner off the website and brings back the built-in banner that ships with it. Drafts are kept.</p>
            <Button
              ref={restoreBtnRef}
              type="button"
              variant="outline"
              className="mt-3 border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800"
              disabled={bannerBusy || imageJob}
              onClick={() => setRestoreAt(state.version)}
            >
              <RotateCcw aria-hidden="true" /> Restore built-in banner
            </Button>
          </section>
        )}
      </div>

      {/* the complete pair that will go live — as reviewed, frozen */}
      <AlertDialog open={!!review} onOpenChange={(open) => !bannerBusy && !open && setReview(null)}>
        <AlertDialogContent
          className="max-h-[90dvh] max-w-3xl overflow-y-auto"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            focusAfterClose(h.lastChange ? noticeRef.current : reviewBtnRef.current);
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Publish this banner?</AlertDialogTitle>
            <AlertDialogDescription>This is exactly what the website will show. It goes live within about a minute; people who already have the page open see it when they reload.</AlertDialogDescription>
          </AlertDialogHeader>
          {review && (
            <>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] sm:items-start">
                <PairItem slot="desktop" item={review.pair.desktop} />
                <PairItem slot="mobile" item={review.pair.mobile} />
              </div>
              <div className="rounded-md bg-gray-50 p-3 text-sm">
                <p className="text-xs font-medium text-gray-600">Description</p>
                <p className="mt-0.5 break-words text-gray-900">{review.alt}</p>
              </div>
              {review.altUnchanged && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p>The description hasn&apos;t changed since the current banner. Does it still describe these images?</p>
                    <button
                      type="button"
                      className="mt-1 font-medium underline underline-offset-2"
                      onClick={() => {
                        afterClose.current = altRef.current;
                        setReview(null);
                      }}
                    >
                      Edit description
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          {/* the page behind the dialog is hidden from screen readers: say here what is happening */}
          {review && h.ops.banner.phase === "checking" && <BannerOpNotice op={h.ops.banner} inDialog onRetrySame={() => h.retrySame("banner")} onCheckAgain={() => h.checkAgain("banner")} onDismiss={() => h.dismiss("banner")} />}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bannerBusy}>Cancel</AlertDialogCancel>
            <Button type="button" onClick={doPublish} disabled={bannerBusy} className="bg-primaryGreen text-white hover:bg-primaryGreen/90">
              {bannerBusy ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : null}
              {bannerBusy ? "Publishing…" : "Publish"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreAt !== null} onOpenChange={(open) => !open && setRestoreAt(null)}>
        <AlertDialogContent
          className="max-h-[90dvh] max-w-2xl overflow-y-auto"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            focusAfterClose(h.lastChange ? noticeRef.current : restoreBtnRef.current);
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Restore the built-in banner?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Your desktop and mobile images stop showing on the website within about a minute, and the website&apos;s built-in banner returns:</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] sm:items-start">
            <figure className="space-y-1">
              <BuiltInBanner slot="desktop" />
              <figcaption className="text-xs text-gray-600">Desktop</figcaption>
            </figure>
            <figure className="mx-auto w-full max-w-[160px] space-y-1">
              <BuiltInBanner slot="mobile" />
              <figcaption className="text-xs text-gray-600">Mobile</figcaption>
            </figure>
          </div>
          <p className="text-sm text-gray-600">Drafts are kept. This doesn&apos;t bring back an earlier custom banner — to show one again, prepare and publish it.</p>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my banner</AlertDialogCancel>
            <AlertDialogAction onClick={doRestore} className="bg-red-700 text-white hover:bg-red-800">
              Restore built-in banner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}

function PairItem({ slot, item }: { slot: HeroSlotName; item: { art: Artwork | null; isNew: boolean } }) {
  return (
    <figure className={cn("space-y-1.5", slot === "mobile" && "mx-auto w-full max-w-[180px]")}>
      {item.art ? (
        <HeroArtwork artwork={item.art} slot={slot} alt={`${slot === "desktop" ? "Desktop" : "Mobile"} banner that will be live`} sizes={slot === "desktop" ? "(min-width: 768px) 520px, 100vw" : "180px"} />
      ) : (
        <BuiltInBanner slot={slot} />
      )}
      <figcaption className="flex items-center gap-1.5 text-xs text-gray-700">
        <span className="font-medium">{slot === "desktop" ? "Desktop" : "Mobile"}</span>
        <span className={cn("rounded-full px-1.5 py-px text-[11px] font-medium ring-1 ring-inset", item.isNew ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-gray-100 text-gray-700 ring-gray-200")}>{item.isNew ? "New" : "Unchanged"}</span>
      </figcaption>
    </figure>
  );
}

function ChangeNotice({ change, onDismiss }: { change: LastChange; onDismiss: () => void }) {
  const what = change.kind === "publish" ? "Published" : change.kind === "alt" ? "Description saved" : "Built-in banner restored";
  const n = change.notified;
  const refreshed = n && (n.site === "ok" || n.site === "mocked");
  const text = !n
    ? `${what} (confirmed after a connection problem). The website usually shows it within a minute; if its refresh request was missed, it can take a little over an hour.`
    : refreshed
      ? `${what}. The website was asked to refresh — it shows the change within about a minute.`
      : `${what}. The website didn't confirm the refresh, so it may take a little over an hour to show the change.`;
  return (
    <div role="status" className={cn("flex items-start gap-2 rounded-md border p-3 text-sm motion-safe:animate-in motion-safe:fade-in-0", refreshed ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900")}>
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">{text}</p>
      <button type="button" onClick={onDismiss} className="-m-1 rounded p-1 hover:bg-black/5" aria-label="Dismiss">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function BannerOpNotice({ op, inDialog, onRetrySame, onCheckAgain, onDismiss }: { op: OpState; inDialog: boolean; onRetrySame: () => void; onCheckAgain: () => void; onDismiss: () => void }) {
  if (op.phase === "processing" && !inDialog) {
    return (
      <p role="status" className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
        Saving…
      </p>
    );
  }
  if (op.phase === "checking") {
    return (
      <p role="status" className="mt-3 flex items-center gap-2 text-sm text-gray-700">
        <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
        {op.detail === "offline" ? "You seem to be offline — checking again when the connection is back…" : "Checking the result with the server…"}
      </p>
    );
  }
  if (op.phase === "unconfirmed") {
    return (
      <div role="alert" className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p>We couldn&apos;t confirm whether the change was saved.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCheckAgain}>
            Check again
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onRetrySame}>
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (op.phase !== "failed") return null;
  return (
    <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0">{op.message}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2 pl-6">
        {op.sameOp && (
          <Button type="button" size="sm" variant="outline" onClick={onRetrySame}>
            <RotateCcw aria-hidden="true" /> Try again
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          <X aria-hidden="true" /> Dismiss
        </Button>
      </div>
    </div>
  );
}

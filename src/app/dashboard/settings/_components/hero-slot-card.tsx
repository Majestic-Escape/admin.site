"use client";
// One banner slot (desktop or mobile): what is live, the draft waiting to be
// published, and choosing + preparing a new image.
//
// A chosen file is checked before anything is uploaded — its first bytes
// only (format, pixel count), then the browser's own decode for the upright
// size — and any number of files can be tried: every preview URL is released
// when it is replaced or the card goes away, and an answer for a file that
// has since been replaced is ignored.
//
// Focus follows the work: to the chosen image once it is read, to the
// progress once it is being prepared, back to the card when a dialog closes
// on something that no longer exists.
import { shortfallLines } from "@/lib/hero-banner";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ImagePlus, Info, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
import type { HeroDraft, HeroLive, HeroSlotName } from "@/lib/admin-api";
import {
  cropRegion,
  cutShare,
  formatBytes,
  headerProblem,
  HERO_SLOTS,
  MAX_FILE_BYTES,
  MAX_UPLOAD_BYTES,
  NOTICE_TEXT,
  outputSize,
  RATIO_CONFIRM,
  readImageHeader,
  tooSmall,
  type Focal,
} from "@/lib/hero-banner";
import { cn } from "@/lib/utils";
import { HeroArtwork } from "./hero-artwork";
import { BuiltInBanner } from "./hero-built-in";
import { HeroCropEditor } from "./hero-crop-editor";
import type { DraftInput, OpState } from "./use-hero-banner";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,.jpg,.jpeg,.png,.webp,.avif,.gif";
const LABEL: Record<HeroSlotName, { title: string; where: string }> = {
  desktop: { title: "Desktop banner", where: "Shown on screens 768 px and wider (laptops, desktops, tablets)" },
  mobile: { title: "Mobile banner", where: "Shown on phones (screens narrower than 768 px)" },
};
const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const fmtWhen = (d: string | number | null | undefined) => (d ? when.format(new Date(d)) : "");
export const fmtDay = (d: string | number | null | undefined) => (d ? day.format(new Date(d)) : "");

interface Picked {
  file: File;
  url: string;
  width: number;
  height: number;
  focal: Focal;
  acceptRatio: boolean;
}

function loadSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("decode"));
    img.src = url;
  });
}

const ACTIVE = new Set(["queued", "compressing", "uploading", "processing", "checking"]);
// focus an element that may only exist after the next render
const focusSoon = (get: () => HTMLElement | null) => requestAnimationFrame(() => get()?.focus());

export function HeroSlotCard({
  slot,
  live,
  draft,
  op,
  discardOp,
  blocked,
  onPrepare,
  onCancelQueued,
  onRetrySame,
  onCheckAgain,
  onDismiss,
  onDiscard,
  onDismissDiscard,
}: {
  slot: HeroSlotName;
  live: HeroLive | null;
  draft: HeroDraft | null;
  op: OpState;
  discardOp: OpState;
  blocked: string | null; // why preparing is not possible right now
  onPrepare: (input: DraftInput) => Promise<boolean>;
  onCancelQueued: () => void;
  onRetrySame: () => void;
  onCheckAgain: () => void;
  onDismiss: () => void;
  onDiscard: (draftOpId: string) => Promise<boolean>;
  onDismissDiscard: () => void;
}) {
  const spec = HERO_SLOTS[slot];
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pickedRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // The draft the admin was shown when they asked to discard it: that one —
  // not whichever draft is current when they confirm — is what gets discarded.
  const [confirmDiscard, setConfirmDiscard] = useState<{ opId: string; stagedBy: string | null; stagedAt: string } | null>(null);
  const pickedUrl = useRef<string | null>(null);
  const busy = ACTIVE.has(op.phase);

  const release = useCallback(() => {
    if (pickedUrl.current) URL.revokeObjectURL(pickedUrl.current);
    pickedUrl.current = null;
  }, []);
  // going away: release the preview, and make a read still in flight drop its own
  useEffect(
    () => () => {
      seq.current += 1;
      release();
    },
    [release],
  );

  const clearPick = useCallback(() => {
    seq.current += 1;
    release();
    setPicked(null);
    setPickError(null);
    setReading(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [release]);

  const pick = useCallback(
    async (file: File) => {
      const mine = (seq.current += 1);
      // a new file starts over: a failed or unconfirmed attempt belongs to the old one
      if (op.phase === "failed" || op.phase === "unconfirmed") onDismiss();
      release();
      setPicked(null);
      setPickError(null);
      if (file.size > MAX_FILE_BYTES) {
        setPickError(`This file is ${formatBytes(file.size)} — banner images must be under 50 MB (ideally a JPEG under 4 MB).`);
        return;
      }
      setReading(true);
      try {
        const header = await readImageHeader(async (offset, length) => new Uint8Array(await file.slice(offset, offset + length).arrayBuffer()), file.size);
        if (mine !== seq.current) return;
        const problem = headerProblem(header, file.size);
        if (problem) {
          setPickError(problem);
          return;
        }
        const url = URL.createObjectURL(file);
        let size: { width: number; height: number };
        try {
          size = await loadSize(url);
        } catch {
          URL.revokeObjectURL(url);
          if (mine === seq.current) setPickError("This file couldn't be read as an image — it may be damaged. Export it again as JPEG.");
          return;
        }
        if (mine !== seq.current) {
          URL.revokeObjectURL(url); // replaced (or the card went away) while it was loading
          return;
        }
        pickedUrl.current = url;
        setPicked({ file, url, width: size.width, height: size.height, focal: { x: 0.5, y: 0.5 }, acceptRatio: false });
      } catch {
        if (mine === seq.current) setPickError("This file couldn't be read — choose it again.");
      } finally {
        if (mine === seq.current) setReading(false);
      }
    },
    [release, op.phase, onDismiss],
  );

  // A newly chosen image takes the focus once it is on screen (keyboard and
  // screen-reader users land on it, not back at the top).
  const pickedFile = picked ? picked.file : null;
  useEffect(() => {
    if (pickedFile) pickedRef.current?.focus();
  }, [pickedFile]);

  // The draft arrived: the file it was prepared from has done its job (a
  // file chosen since then stays).
  const prepared = useRef<File | null>(null);
  useEffect(() => {
    if (op.phase === "done") {
      if (!picked || picked.file === prepared.current) clearPick();
      onDismiss();
    }
  }, [op, picked, clearPick, onDismiss]);

  const region = picked ? cropRegion(picked.width, picked.height, slot, picked.focal) : null;
  const result = region ? outputSize(region, slot) : null;
  const small = region ? tooSmall(region, slot) : false;
  const needsConfirm = region ? region.deviation > RATIO_CONFIRM : false;
  const canPrepare = !!picked && !small && (!needsConfirm || picked.acceptRatio) && !busy && !blocked;

  const prepare = () => {
    if (!picked || !canPrepare) return;
    prepared.current = picked.file;
    onPrepare({ file: picked.file, url: picked.url, focal: picked.focal, acceptRatio: picked.acceptRatio });
    focusSoon(() => panelRef.current);
  };
  const chooseAnother = () => {
    onDismiss();
    inputRef.current?.click();
  };

  const status = draft ? (draft.expired ? "Draft expired" : "Draft ready") : live ? "Live" : "Built-in";
  const statusClass = draft ? (draft.expired ? "bg-red-50 text-red-800 ring-red-200" : "bg-amber-50 text-amber-900 ring-amber-200") : live ? "bg-green-50 text-green-800 ring-green-200" : "bg-gray-100 text-gray-700 ring-gray-200";
  // the preview's real width: the card (≤ ~860 px), or half of it beside a draft (xl)
  const sizes = slot === "mobile" ? "220px" : draft ? "(min-width: 1280px) 400px, (min-width: 1024px) 700px, 100vw" : "(min-width: 1024px) 860px, 100vw";
  const figureWidth = slot === "mobile" ? "max-w-[220px]" : "";
  // Side by side only where the card really has the room (the sidebar takes
  // 256 px from 768 px up): phones' tall previews beside the replace section
  // from 1280 px; desktop live + draft from 1280 px.
  const wide = slot === "mobile" ? (draft ? "xl:grid xl:grid-cols-[456px_minmax(0,1fr)] xl:items-start xl:gap-6" : "xl:grid xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start xl:gap-6") : "";

  return (
    <section aria-labelledby={`${ids}-title`} className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`${ids}-title`} ref={headingRef} tabIndex={-1} className="text-base font-semibold text-gray-900 outline-none">
            {LABEL[slot].title}
          </h3>
          <p className="text-sm text-gray-600">{LABEL[slot].where}</p>
        </div>
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", statusClass)}>{status}</span>
      </div>

      <div className={wide}>
        {/* live and draft, side by side */}
        <div className={cn("mt-4 grid gap-4", draft && (slot === "mobile" ? "sm:grid-cols-2" : "xl:grid-cols-2"))}>
          <figure className={cn("space-y-1.5", figureWidth)}>
            {live ? <HeroArtwork artwork={live} slot={slot} alt={`Live ${slot} banner`} sizes={sizes} /> : <BuiltInBanner slot={slot} />}
            <figcaption className="text-xs text-gray-600">
              <span className="font-medium text-gray-800">Live now</span>
              {live ? ` · ${live.width} × ${live.height} px${live.publishedAt ? ` · since ${fmtWhen(live.publishedAt)}` : ""}` : " · built-in"}
            </figcaption>
          </figure>
          {draft && (
            <figure className={cn("space-y-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300", figureWidth)}>
              <HeroArtwork artwork={draft} slot={slot} alt={`Draft ${slot} banner`} sizes={sizes} className={draft.expired ? "opacity-60" : undefined} />
              <figcaption className="space-y-1 text-xs text-gray-600">
                <p>
                  <span className="font-medium text-gray-800">Draft — not live yet</span> · {draft.width} × {draft.height} px
                </p>
                <p>
                  Prepared{draft.stagedBy ? ` by ${draft.stagedBy}` : ""} · {fmtWhen(draft.stagedAt)} ·{" "}
                  {draft.expired ? <span className="font-medium text-red-700">expired {fmtDay(draft.expiresAt)} — prepare it again</span> : `expires ${fmtDay(draft.expiresAt)}`}
                </p>
                {draft.notices.length > 0 && (
                  <ul className="space-y-0.5">
                    {draft.notices.map((n) => (
                      <li key={n} className="flex items-start gap-1">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        <span>{NOTICE_TEXT[n] || n}</span>
                      </li>
                    ))}
                    {shortfallLines(draft).map((l) => (
                      <li key={l} className="pl-4 text-amber-800">
                        {l}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pt-1">
                  <Button type="button" variant="ghost" size="sm" className="-ml-2 text-red-700 hover:bg-red-50 hover:text-red-800" disabled={busy || ACTIVE.has(discardOp.phase)} onClick={() => draft && setConfirmDiscard({ opId: draft.opId, stagedBy: draft.stagedBy, stagedAt: draft.stagedAt })}>
                    {ACTIVE.has(discardOp.phase) ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                    Discard draft
                  </Button>
                </div>
                {discardOp.phase === "failed" && (
                  <p role="alert" className="flex items-start gap-1 text-red-700">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    <span>
                      {discardOp.message}{" "}
                      <button type="button" className="font-medium underline underline-offset-2" onClick={onDismissDiscard}>
                        Dismiss
                      </button>
                    </span>
                  </p>
                )}
              </figcaption>
            </figure>
          )}
        </div>

        {/* a new image — dropped or pasted anywhere here, or chosen */}
        <div
          tabIndex={-1}
          onDragOver={(e) => {
            if (busy) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files && e.dataTransfer.files[0];
            if (f && !busy) pick(f);
          }}
          onPaste={(e) => {
            const f = Array.from(e.clipboardData.files)[0];
            if (f && !busy) {
              e.preventDefault();
              pick(f);
            }
          }}
          className={cn("mt-5 border-t border-gray-100 pt-4 outline-none", slot === "mobile" && "xl:mt-4 xl:min-w-0 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0")}
        >
          <h4 className="text-sm font-semibold text-gray-900">{draft ? "Replace the draft" : live ? "Change the image" : "Use your own image"}</h4>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const f = e.target.files && e.target.files[0];
              e.target.value = ""; // choosing the same file again still counts
              if (f && !busy) pick(f); // the file being prepared stays until its job ends
            }}
          />

          {!picked && (
            <div className={cn("mt-2 rounded-lg border-2 border-dashed px-4 py-6 text-center motion-safe:transition-colors motion-safe:duration-150", dragOver ? "border-primaryGreen bg-primaryGreen/5" : "border-gray-300 bg-gray-50/60")}>
              <ImagePlus className="mx-auto h-8 w-8 text-gray-400" aria-hidden="true" />
              <p className="mt-2 text-sm text-gray-700">Drop an image here, paste it, or</p>
              <Button type="button" variant="outline" className="mt-2" disabled={reading || busy} onClick={() => inputRef.current?.click()} aria-describedby={`${ids}-spec`}>
                {reading ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : null}
                Choose {slot} image
              </Button>
              <p id={`${ids}-spec`} className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-gray-600">
                Recommended <strong className="font-semibold text-gray-800">{spec.recommended[0]} × {spec.recommended[1]} px</strong> (at least {spec.min[0]} × {spec.min[1]}). JPEG, PNG, WebP or AVIF; no QR codes. Files up to 4 MB are uploaded as they are (the server makes the web versions from them); larger ones are compressed in your browser first.
              </p>
            </div>
          )}

          {pickError && (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="min-w-0">{pickError}</p>
            </div>
          )}

          {picked && region && result && (
            <div ref={pickedRef} tabIndex={-1} role="group" aria-labelledby={`${ids}-picked`} className="mt-3 space-y-3 outline-none">
              <p id={`${ids}-picked`} className="break-words text-xs text-gray-600">
                <span className="font-medium text-gray-800">{picked.file.name}</span> · {picked.width} × {picked.height} px · {formatBytes(picked.file.size)}
              </p>
              <HeroCropEditor
                slot={slot}
                url={picked.url}
                width={picked.width}
                height={picked.height}
                focal={picked.focal}
                disabled={busy}
                labelId={`${ids}-crop`}
                onFocalChange={(focal) => setPicked((p) => (p ? { ...p, focal } : p))}
              />
              <ul className="space-y-1.5 text-sm">
                {small ? (
                  <li className="flex items-start gap-2 text-red-800" role="alert">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Too small: cropped to the banner shape this image is {region.width} × {region.height} px, and the {slot} banner needs at least {spec.min[0]} × {spec.min[1]} px.
                    </span>
                  </li>
                ) : (
                  <li className="flex items-start gap-2 text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700" aria-hidden="true" />
                    <span>
                      {region.cropped ? "Drag the frame, tap where it should go, or use the slider." : "Fits the banner shape — nothing is cropped."} The result will be {result.width} × {result.height} px
                      {result.width < Math.round(spec.recommended[0] * 0.9) ? ` (recommended ${spec.recommended[0]} × ${spec.recommended[1]} for the sharpest result on high-density screens)` : ""}.
                    </span>
                  </li>
                )}
                {picked.file.size > MAX_UPLOAD_BYTES && !small && (
                  <li className="flex items-start gap-2 text-gray-700">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    <span>This file is over 4 MB, so your browser compresses it first (a small quality cost). For the best result, export a JPEG under 4 MB.</span>
                  </li>
                )}
              </ul>
              {needsConfirm && !small && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      This image&apos;s shape is very different from the {slot} banner&apos;s: about {Math.round(cutShare(picked.width, picked.height, region) * 100)}% of it will be cut off. Use artwork made for this banner if you can.
                    </span>
                  </p>
                  <label className="mt-2 flex cursor-pointer items-center gap-2 font-medium">
                    <Checkbox checked={picked.acceptRatio} disabled={busy} onCheckedChange={(v) => setPicked((p) => (p ? { ...p, acceptRatio: v === true } : p))} />
                    Use this image anyway
                  </label>
                </div>
              )}
              {!busy && op.phase !== "failed" && op.phase !== "unconfirmed" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={prepare} disabled={!canPrepare} className="bg-primaryGreen text-white hover:bg-primaryGreen/90">
                    {draft ? "Prepare new draft" : "Prepare draft"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
                    Choose another image
                  </Button>
                  <Button type="button" variant="ghost" onClick={clearPick}>
                    Cancel
                  </Button>
                  <p className="w-full text-xs text-gray-600">{blocked || "Makes optimised copies for review — nothing changes on the website until you publish."}</p>
                </div>
              )}
            </div>
          )}

          <div ref={panelRef} tabIndex={-1} className="outline-none">
            <OpPanel slot={slot} op={op} hasFile={!!picked} onCancelQueued={onCancelQueued} onRetrySame={onRetrySame} onRetryNew={prepare} onCheckAgain={onCheckAgain} onDismiss={onDismiss} onChooseAnother={chooseAnother} />
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirmDiscard} onOpenChange={(o) => !o && setConfirmDiscard(null)}>
        <AlertDialogContent
          onCloseAutoFocus={(e) => {
            e.preventDefault(); // the button that opened it may be gone
            headingRef.current?.focus();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Discard the {slot} draft?</AlertDialogTitle>
            <AlertDialogDescription>
              The image prepared{confirmDiscard?.stagedBy ? ` by ${confirmDiscard.stagedBy}` : ""} {confirmDiscard ? fmtWhen(confirmDiscard.stagedAt) : ""} is removed. The live banner is not affected.
            </AlertDialogDescription>
            {confirmDiscard && draft && draft.opId !== confirmDiscard.opId && (
              <p role="alert" className="text-sm text-amber-800">
                A newer {slot} draft was prepared while this was open. Only the one you saw is discarded — if it has already been replaced, nothing is removed.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 text-white hover:bg-red-800"
              onClick={() => {
                if (confirmDiscard) onDiscard(confirmDiscard.opId);
              }}
            >
              Discard draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.round((now - since) / 1000));
  return s >= 3 ? <span className="tabular-nums"> · {s} s</span> : null;
}

function OpPanel({
  slot,
  op,
  hasFile,
  onCancelQueued,
  onRetrySame,
  onRetryNew,
  onCheckAgain,
  onDismiss,
  onChooseAnother,
}: {
  slot: HeroSlotName;
  op: OpState;
  hasFile: boolean;
  onCancelQueued: () => void;
  onRetrySame: () => void;
  onRetryNew: () => void;
  onCheckAgain: () => void;
  onDismiss: () => void;
  onChooseAnother: () => void;
}) {
  if (op.phase === "idle" || op.phase === "done") return null;
  if (op.phase === "failed") {
    // a retry can't change a refusal of the file itself: offer another file instead
    const retry = op.sameOp ? onRetrySame : hasFile && op.canRetry ? () => { onDismiss(); onRetryNew(); } : null;
    return (
      <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{op.message}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2 pl-6">
          {retry && (
            <Button type="button" size="sm" variant="outline" onClick={retry}>
              <RotateCcw aria-hidden="true" /> Try again
            </Button>
          )}
          <Button type="button" size="sm" variant={retry ? "ghost" : "outline"} onClick={onChooseAnother}>
            Choose another image
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            <X aria-hidden="true" /> Dismiss
          </Button>
        </div>
      </div>
    );
  }
  if (op.phase === "unconfirmed") {
    return (
      <div role="alert" className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p>We couldn&apos;t confirm whether the {slot} draft was prepared. It may still finish on the server — check again in a moment.</p>
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
  const text =
    op.phase === "queued"
      ? `Waiting for the ${slot === "desktop" ? "mobile" : "desktop"} image to finish…`
      : op.phase === "compressing"
        ? "Compressing in your browser…"
        : op.phase === "uploading"
          ? "Uploading…"
          : op.phase === "processing"
            ? "Optimising the image for the website…"
            : op.detail === "offline"
              ? "You seem to be offline — checking again when the connection is back…"
              : op.detail === "processing"
                ? "Still optimising on the server…"
                : "Checking the result with the server…";
  return (
    <div className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="flex items-center gap-2 text-sm text-gray-800">
        <Loader2 className="h-4 w-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
        {/* the live region carries the phase only — not the ticking numbers */}
        <span role="status" aria-live="polite">
          {text}
        </span>
        {op.phase === "processing" ? (
          <span aria-hidden="true" className="-ml-1 text-gray-600">
            <Elapsed since={op.since} />
          </span>
        ) : null}
      </p>
      {op.phase === "uploading" ? (
        <Progress value={Math.round(op.progress * 100)} aria-label={`Upload progress, ${Math.round(op.progress * 100)}%`} className="h-1.5 bg-gray-200 [&>div]:bg-primaryGreen" />
      ) : (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true">
          <div className="me-route-progress h-full w-full rounded-full bg-primaryGreen/70" />
        </div>
      )}
      {op.phase === "uploading" && <p className="text-xs tabular-nums text-gray-600">{Math.round(op.progress * 100)}% sent</p>}
      {op.phase === "processing" && <p className="text-xs text-gray-600">Usually 5–20 seconds. You can keep working on the other image.</p>}
      {op.phase === "queued" && (
        <Button type="button" size="sm" variant="ghost" onClick={onCancelQueued}>
          Cancel
        </Button>
      )}
    </div>
  );
}

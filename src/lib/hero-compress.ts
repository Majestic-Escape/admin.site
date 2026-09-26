// Homepage banner — compression in the browser, only for a file over the
// server's 4 MB upload limit (see compressionPlan in hero-banner.ts).
//
// It renders exactly what the server would keep: the crop at the chosen
// focal point, scaled to the slot's cap, flattened on white (as the server
// does) — so the only cost is one extra JPEG generation, which the draft's
// "Compressed in your browser" notice discloses. Canvases are released as
// soon as they are used; nothing large outlives the call.
import { compressionPlan, cropRegion, MAX_UPLOAD_BYTES, type Focal, type HeroSlot } from "@/lib/hero-banner";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("The chosen image could no longer be read — choose it again."));
    img.src = url;
  });
}

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't compress this image — export it as a JPEG under 4 MB instead.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { c, ctx };
}
function release(c: HTMLCanvasElement) {
  c.width = 0; // lets Safari free the backing store at once
  c.height = 0;
}

function toJpeg(c: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Your browser couldn't compress this image — export it as a JPEG under 4 MB instead."))), "image/jpeg", quality);
  });
}

// Region → width×height, halving first while the scale is above 2× (one
// smoothing pass from far larger aliases fine detail and lettering).
function render(img: HTMLImageElement, region: { left: number; top: number; width: number; height: number }, width: number, height: number) {
  let source: CanvasImageSource = img;
  let sx = region.left;
  let sy = region.top;
  let sw = region.width;
  let sh = region.height;
  let previous: HTMLCanvasElement | null = null;
  while (sw / width > 2) {
    const w = Math.max(width, Math.round(sw / 2));
    const h = Math.max(height, Math.round(sh / 2));
    const step = canvas(w, h);
    step.ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h);
    if (previous) release(previous);
    previous = step.c;
    source = step.c;
    sx = 0;
    sy = 0;
    sw = w;
    sh = h;
  }
  const out = canvas(width, height);
  out.ctx.fillStyle = "#ffffff"; // transparency → white, as the server flattens
  out.ctx.fillRect(0, 0, width, height);
  out.ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  if (previous) release(previous);
  return out.c;
}

export class CompressionFailed extends Error {}

/**
 * @returns a JPEG File within the upload limit, already cropped to the slot's
 *          shape (upload it with a centred focal point: nothing is left to crop)
 * @throws CompressionFailed when even the smallest allowed attempt is too large
 */
export async function compressForUpload(input: { url: string; name: string; focal: Focal }, slot: HeroSlot): Promise<File> {
  const img = await loadImage(input.url);
  const region = cropRegion(img.naturalWidth, img.naturalHeight, slot, input.focal);
  const base = input.name.replace(/\.[^.]*$/, "") || "banner";
  let current: { width: number; height: number; c: HTMLCanvasElement } | null = null;
  try {
    for (const attempt of compressionPlan(region, slot)) {
      if (!current || current.width !== attempt.width || current.height !== attempt.height) {
        if (current) release(current.c);
        current = { width: attempt.width, height: attempt.height, c: render(img, region, attempt.width, attempt.height) };
      }
      const blob = await toJpeg(current.c, attempt.quality);
      if (blob.size <= MAX_UPLOAD_BYTES) return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
    }
  } finally {
    if (current) release(current.c);
  }
  throw new CompressionFailed("Even compressed, this image is over 4 MB. Export it as a JPEG (quality 85 or lower, at most 3840 px wide) and upload that.");
}

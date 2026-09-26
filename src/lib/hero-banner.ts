// Homepage banner — the pure rules the settings page applies before anything
// is uploaded (server.me docs/site-hero.md). Self-contained on purpose: no
// imports, so `npm run check:hero` runs this file directly under Node and
// checks it against the server's vectors (scripts/fixtures).
//
// The server is the authority — it identifies, crops and refuses on its own.
// These copies exist so the admin sees the exact crop before uploading, hears
// about a wrong file in a second instead of after an upload, and never makes
// the browser decode something huge.

export type HeroSlot = "desktop" | "mobile";
export const HERO_SLOT_NAMES: readonly HeroSlot[] = ["desktop", "mobile"];

export interface HeroSlotSpec {
  ratio: number;
  box: [number, number];
  min: [number, number];
  cap: number;
  recommended: [number, number];
}

// Mirrors server.me services/siteHeroImage.js SLOTS (checked by check:hero).
export const HERO_SLOTS: Record<HeroSlot, HeroSlotSpec> = {
  desktop: { ratio: 1920 / 740, box: [1920, 740], min: [1920, 740], cap: 3840, recommended: [2880, 1110] },
  mobile: { ratio: 530 / 720, box: [530, 720], min: [530, 720], cap: 1600, recommended: [1060, 1440] },
};
export const RATIO_TOLERANCE = 0.01; // within 1% the image is used whole
export const RATIO_CONFIRM = 0.35; // beyond 35% only after "Use anyway"
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // the server's limit (under Vercel's 4.5 MB)
export const MAX_FILE_BYTES = 50 * 1024 * 1024; // refused before the browser reads it
export const MAX_INPUT_PIXELS = 25_000_000; // refused before the browser decodes it
export const ALT_MAX = 150;

export interface Focal {
  x: number;
  y: number;
}
export interface CropRegion {
  left: number;
  top: number;
  width: number;
  height: number;
  cropped: boolean;
  deviation: number;
}

// 0 = the slot's exact shape; 0.35 = 1.35× too wide or too tall.
export function ratioDeviation(width: number, height: number, slot: HeroSlot): number {
  const r = width / height;
  const R = HERO_SLOTS[slot].ratio;
  return Math.max(r / R, R / r) - 1;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

// The part of an upright width×height image that fills the slot's box,
// centred on the focal point — the same integers the server computes.
export function cropRegion(width: number, height: number, slot: HeroSlot, focal: Focal = { x: 0.5, y: 0.5 }): CropRegion {
  const R = HERO_SLOTS[slot].ratio;
  const deviation = ratioDeviation(width, height, slot);
  const fx = Number.isFinite(focal && focal.x) ? clamp(focal.x, 0, 1) : 0.5;
  const fy = Number.isFinite(focal && focal.y) ? clamp(focal.y, 0, 1) : 0.5;
  if (deviation <= RATIO_TOLERANCE) return { left: 0, top: 0, width, height, cropped: false, deviation };
  if (width / height > R) {
    const w = clamp(Math.round(height * R), 1, width);
    const left = clamp(Math.round(fx * width - w / 2), 0, width - w);
    return { left, top: 0, width: w, height, cropped: true, deviation };
  }
  const h = clamp(Math.round(width / R), 1, height);
  const top = clamp(Math.round(fy * height - h / 2), 0, height - h);
  return { left: 0, top, width, height: h, cropped: true, deviation };
}

// Which way the crop window moves: along x for an image wider than the box,
// along y for a taller one, not at all when it already fits.
export function cropAxis(width: number, height: number, slot: HeroSlot): "x" | "y" | null {
  if (ratioDeviation(width, height, slot) <= RATIO_TOLERANCE) return null;
  return width / height > HERO_SLOTS[slot].ratio ? "x" : "y";
}

// The master the server keeps for a region: capped width, ratio kept.
export function outputSize(region: Pick<CropRegion, "width" | "height">, slot: HeroSlot) {
  const width = Math.min(region.width, HERO_SLOTS[slot].cap);
  return { width, height: Math.max(1, Math.round((width * region.height) / region.width)) };
}

// Smaller than the box would be upscaled on the smallest screens that show it.
// Mirrors the server: the width is exact, the height keeps the 1% slack of
// the uncropped ratio tolerance.
export function tooSmall(region: Pick<CropRegion, "width" | "height">, slot: HeroSlot): boolean {
  const [mw, mh] = HERO_SLOTS[slot].min;
  return region.width < mw || region.height < Math.floor(mh * (1 - RATIO_TOLERANCE));
}

// --- file identification from its first bytes --------------------------------
// Only the header is read (a few hundred bytes; a JPEG's segments are walked
// until its frame header), so a 25+ MP file is refused before any decode.

export type ImageKind = "jpeg" | "png" | "webp" | "gif" | "avif" | "heic" | "svg" | "pdf" | "tiff" | "bmp" | "unknown";
export interface ImageHeader {
  kind: ImageKind;
  width: number | null;
  height: number | null;
}

type ReadAt = (offset: number, length: number) => Promise<Uint8Array>;

const ascii = (b: Uint8Array, start: number, end: number) => String.fromCharCode(...b.subarray(start, Math.min(end, b.length)));
const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);

const HEIC_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs"]);
const AVIF_BRANDS = new Set(["avif", "avis"]);
// SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC)
const isSof = (m: number) => m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;

async function jpegSize(readAt: ReadAt, size: number): Promise<{ width: number; height: number } | null> {
  let offset = 2;
  for (let i = 0; i < 512 && offset + 4 <= size; i += 1) {
    const head = await readAt(offset, 12);
    if (head.length < 4) return null;
    if (head[0] !== 0xff) return null;
    const marker = head[1];
    if (marker === 0xff) {
      offset += 1; // fill byte
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; // no length
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // end / scan data before a frame header
    const length = u16be(head, 2);
    if (length < 2) return null;
    if (isSof(marker)) {
      if (head.length < 9) return null;
      return { height: u16be(head, 5), width: u16be(head, 7) };
    }
    offset += 2 + length;
  }
  return null;
}

// ISO-BMFF (AVIF): the largest `ispe` (image spatial extent) in meta/iprp/ipco.
function bmffSize(b: Uint8Array): { width: number; height: number } | null {
  let best: { width: number; height: number } | null = null;
  const walk = (start: number, end: number, depth: number) => {
    let p = start;
    while (p + 8 <= end && depth < 6) {
      let size = u32be(b, p);
      const type = ascii(b, p + 4, p + 8);
      const header = 8;
      if (size === 1) return; // 64-bit sizes: not in a header
      if (size === 0) size = end - p;
      if (size < header || p + size > end) size = end - p;
      if (type === "meta") walk(p + header + 4, p + size, depth + 1);
      else if (type === "iprp" || type === "ipco") walk(p + header, p + size, depth + 1);
      else if (type === "ispe" && p + 20 <= end) {
        const width = u32be(b, p + 12);
        const height = u32be(b, p + 16);
        if (!best || width * height > best.width * best.height) best = { width, height };
      }
      p += size;
    }
  };
  walk(0, b.length, 0);
  return best;
}

export async function readImageHeader(readAt: ReadAt, size: number): Promise<ImageHeader> {
  const b = await readAt(0, 64 * 1024);
  const none = (kind: ImageKind): ImageHeader => ({ kind, width: null, height: null });
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    const s = await jpegSize(readAt, size);
    return { kind: "jpeg", width: s ? s.width : null, height: s ? s.height : null };
  }
  if (b.length >= 24 && b[0] === 0x89 && ascii(b, 1, 4) === "PNG" && ascii(b, 12, 16) === "IHDR") {
    return { kind: "png", width: u32be(b, 16), height: u32be(b, 20) };
  }
  if (b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") {
    const chunk = ascii(b, 12, 16);
    if (chunk === "VP8X") return { kind: "webp", width: u24le(b, 24) + 1, height: u24le(b, 27) + 1 };
    if (chunk === "VP8 " && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return { kind: "webp", width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    if (chunk === "VP8L" && b[20] === 0x2f) {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { kind: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    return none("webp");
  }
  if (b.length >= 10 && (ascii(b, 0, 6) === "GIF87a" || ascii(b, 0, 6) === "GIF89a")) return { kind: "gif", width: u16le(b, 6), height: u16le(b, 8) };
  if (b.length >= 16 && ascii(b, 4, 8) === "ftyp") {
    const boxSize = u32be(b, 0);
    const end = Math.min(Math.max(boxSize, 16), 64, b.length);
    const brands = [ascii(b, 8, 12)];
    for (let i = 16; i + 4 <= end; i += 4) brands.push(ascii(b, i, i + 4));
    if (brands.some((x) => HEIC_BRANDS.has(x))) return none("heic");
    if (brands.some((x) => AVIF_BRANDS.has(x))) {
      const s = bmffSize(b);
      return { kind: "avif", width: s ? s.width : null, height: s ? s.height : null };
    }
    return none("unknown");
  }
  if (ascii(b, 0, 5) === "%PDF-") return none("pdf");
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a)) return none("tiff");
  if (ascii(b, 0, 2) === "BM") return none("bmp");
  const text = ascii(b, 0, 512).replace(/^\xEF\xBB\xBF/, "").trimStart().toLowerCase(); // UTF-8 BOM
  if (text.startsWith("<svg") || (text.startsWith("<?xml") && text.includes("<svg"))) return none("svg");
  return none("unknown");
}

// Why a chosen file can't be used — before upload, in the admin's terms.
export function headerProblem(header: ImageHeader, bytes: number): string | null {
  switch (header.kind) {
    case "heic":
      return "iPhone HEIC photos can't be used — export the banner as JPEG and upload that.";
    case "svg":
      return "SVG files can't be used — export the banner as a JPEG image.";
    case "pdf":
      return "PDFs can't be used — export the banner as a JPEG image.";
    case "tiff":
    case "bmp":
    case "unknown":
      return "Use a JPEG, PNG, WebP or AVIF image.";
    default:
      break;
  }
  if (!header.width || !header.height) return "This file couldn't be read as an image — it may be damaged. Export it again as JPEG.";
  const pixels = header.width * header.height;
  if (pixels > MAX_INPUT_PIXELS) {
    return `This image is ${header.width} × ${header.height} px (${(pixels / 1e6).toFixed(1)} megapixels) — at most 25 megapixels. Export it at 3840 px wide or smaller.`;
  }
  if (bytes <= 0) return "This file is empty.";
  return null;
}

// --- compression (only for files over the 4 MB upload limit) -------------------
// The browser produces exactly what the server would keep — the crop at the
// focal point, scaled to the slot's cap — so every byte goes to pixels that
// are shown. JPEG quality steps down, then (mobile only) the width, never
// below twice the minimum; at most 7 attempts, then a clear refusal.
export interface CompressionAttempt {
  width: number;
  height: number;
  quality: number;
}
export function compressionPlan(region: Pick<CropRegion, "width" | "height">, slot: HeroSlot): CompressionAttempt[] {
  const top = outputSize(region, slot);
  const floor = Math.min(top.width, HERO_SLOTS[slot].min[0] * 2);
  const plan: CompressionAttempt[] = [0.95, 0.92, 0.88, 0.85].map((quality) => ({ ...top, quality }));
  for (const f of [0.83, 0.69]) {
    const width = Math.max(floor, Math.round(top.width * f));
    if (width < top.width && !plan.some((p) => p.width === width)) plan.push({ width, height: Math.max(1, Math.round((width * region.height) / region.width)), quality: 0.85 });
  }
  if (floor < top.width && !plan.some((p) => p.width === floor)) plan.push({ width: floor, height: Math.max(1, Math.round((floor * region.height) / region.width)), quality: 0.85 });
  return plan.slice(0, 7);
}

// --- op tokens ----------------------------------------------------------------------
// `v1.<base64url {n: opId, a: admin, t: issuedAt}>.<mac>` — the id is readable
// so an interrupted request can be looked up; the token itself is opaque.
export function opIdOf(token: string): string | null {
  const part = typeof token === "string" ? token.split(".")[1] : "";
  if (!part) return null;
  try {
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((part.length + 3) % 4));
    const body = JSON.parse(json) as { n?: unknown };
    return typeof body.n === "string" ? body.n : null;
  } catch {
    return null;
  }
}

// Draft notices (server) → what they mean for the admin.
export const NOTICE_TEXT: Record<string, string> = {
  CROPPED: "Cropped to the banner shape",
  RATIO_ACCEPTED: "Very different shape — used anyway",
  BELOW_RECOMMENDED: "Below the recommended size — may look slightly soft on large high-density screens",
  CLIENT_REENCODED: "Compressed in your browser because the file was over 4 MB — fine coloured detail can look a little softer. For the sharpest result, export a JPEG under 4 MB.",
  ANIMATION_FIRST_FRAME: "Animated image — only the first frame is used",
};

// Refusals that a retry can't change: the admin needs another file.
export const NEEDS_ANOTHER_FILE = new Set([
  "IMAGE_NOT_ALLOWED",
  "INVALID_IMAGE",
  "UNSUPPORTED_FORMAT",
  "UNSUPPORTED_FILE_TYPE",
  "HEIC_NOT_SUPPORTED",
  "IMAGE_TOO_LARGE",
  "FILE_TOO_LARGE",
  "HERO_TOO_SMALL",
  "TOO_LARGE_AFTER_COMPRESSION",
  "COMPRESSION_FAILED",
  "HTTP_413",
]);

// Share of the image the crop cuts off (0–1).
export function cutShare(width: number, height: number, region: Pick<CropRegion, "width" | "height">): number {
  return width > 0 && height > 0 ? Math.max(0, 1 - (region.width * region.height) / (width * height)) : 0;
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

// Cleans a description the way the server does (control and format
// characters, runs of whitespace), so the counter matches what will be saved.
const CONTROL_RE = /[\p{Cc}\p{Cf}]/gu; // control + format characters (bidi, zero-width, tags…)
export function cleanAlt(v: string): string {
  return String(v || "").replace(CONTROL_RE, " ").replace(/\s+/g, " ").trim();
}

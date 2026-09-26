// Homepage banner guard (run: npm run check:hero; Node ≥ 22.18 runs the
// TypeScript module directly).
//
// 1. Contract with the server: src/lib/hero-banner.ts crops exactly like
//    server.me services/siteHeroImage.js — every vector in
//    scripts/fixtures/hero-crop-vectors.json (copied from server.me
//    tests/batch-s/fixtures) must be reproduced.
// 2. The header reader identifies real encoder outputs (JPEG baseline /
//    progressive / behind EXIF+ICC, PNG, WebP lossy / lossless / extended,
//    GIF, AVIF) with their declared size, and refuses what it must (HEIC,
//    SVG, PDF, TIFF, over 25 MP, damaged files) before any decode.
// 3. Compression attempts are bounded, never below twice the minimum, and
//    keep the banner's shape; op ids are read from tokens; descriptions are
//    cleaned like the server cleans them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hero = await import(pathToFileURL(path.join(root, "src/lib/hero-banner.ts")).href);
const problems = [];
const expect = (ok, what) => {
  if (!ok) problems.push(what);
};

// --- 1. crop vectors -------------------------------------------------------------
const crop = JSON.parse(fs.readFileSync(path.join(root, "scripts/fixtures/hero-crop-vectors.json"), "utf8"));
for (const s of ["desktop", "mobile"]) {
  const a = crop.slots[s];
  const b = hero.HERO_SLOTS[s];
  expect(Math.abs(a.ratio - b.ratio) < 1e-12 && a.cap === b.cap && a.min[0] === b.min[0] && a.min[1] === b.min[1], `${s} slot differs from the server`);
}
expect(crop.ratioTolerance === hero.RATIO_TOLERANCE && crop.ratioConfirm === hero.RATIO_CONFIRM, "ratio thresholds differ from the server");
for (const v of crop.vectors) {
  const r = hero.cropRegion(v.width, v.height, v.slot, v.focal);
  const e = v.expected;
  const same = r.left === e.left && r.top === e.top && r.width === e.width && r.height === e.height && r.cropped === e.cropped && Math.abs(r.deviation - e.deviation) < 1e-5;
  expect(same, `cropRegion(${v.width}, ${v.height}, ${v.slot}, ${JSON.stringify(v.focal)}) = ${JSON.stringify(r)} ≠ ${JSON.stringify(e)}`);
}
// the frame's axis matches the crop
for (const v of crop.vectors) {
  const axis = hero.cropAxis(v.width, v.height, v.slot);
  const e = v.expected;
  const want = !e.cropped ? null : e.width < v.width ? "x" : "y";
  expect(axis === want, `cropAxis(${v.width}, ${v.height}, ${v.slot}) = ${axis}, expected ${want}`);
}

// --- 2. headers -------------------------------------------------------------------
const reader = (buf) => async (offset, length) => new Uint8Array(buf.subarray(offset, offset + length));
const dir = path.join(root, "scripts/fixtures/hero-headers");
const fixtures = JSON.parse(fs.readFileSync(path.join(dir, "expected.json"), "utf8"));
for (const f of fixtures.files) {
  const buf = fs.readFileSync(path.join(dir, f.name));
  const h = await hero.readImageHeader(reader(buf), buf.length);
  expect(h.kind === f.kind && h.width === f.width && h.height === f.height, `${f.name}: read ${JSON.stringify(h)}, expected ${f.kind} ${f.width}×${f.height}`);
  const problem = hero.headerProblem(h, buf.length);
  if (f.problem === "pixels") expect(/megapixels/.test(problem || ""), `${f.name}: over 25 MP must be refused (${problem})`);
  else if (f.problem === "format") expect(!!problem, `${f.name}: must be refused`);
  else expect(problem === null, `${f.name}: refused unexpectedly (${problem})`);
}
const bytes = (...parts) => Buffer.concat(parts.map((p) => (typeof p === "string" ? Buffer.from(p, "latin1") : Buffer.from(p))));
const u16 = (n) => [(n >> 8) & 255, n & 255];
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const synthetic = [
  // JPEG: fill bytes before a marker, a 60 KB APP1, then SOF2 — past the first 64 KB read
  ["jpeg behind a 60 KB segment", bytes([0xff, 0xd8], [0xff, 0xe1], u16(60000), Buffer.alloc(59998), [0xff, 0xff, 0xc2], u16(17), [8], u16(1480), u16(3840), Buffer.alloc(12)), { kind: "jpeg", width: 3840, height: 1480 }],
  ["jpeg without a frame header", bytes([0xff, 0xd8], [0xff, 0xe0], u16(16), Buffer.alloc(14), [0xff, 0xda], u16(8), Buffer.alloc(6)), { kind: "jpeg", width: null, height: null, refused: true }],
  ["truncated jpeg", bytes([0xff, 0xd8, 0xff, 0xe1], u16(4000), Buffer.alloc(100)), { kind: "jpeg", width: null, height: null, refused: true }],
  ["heic", bytes(u32(24), "ftypheic", u32(0), "mif1heic"), { kind: "heic", refused: /HEIC/ }],
  ["heif with a heic compatible brand", bytes(u32(24), "ftypmif1", u32(0), "mif1heic"), { kind: "heic", refused: /HEIC/ }],
  ["iso-bmff that is neither", bytes(u32(20), "ftypisom", u32(0), "isom"), { kind: "unknown", refused: true }],
  ["svg", bytes('<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="740"></svg>'), { kind: "svg", refused: /SVG/ }],
  ["svg with a BOM", bytes([0xef, 0xbb, 0xbf], "<svg width='10' height='10'/>"), { kind: "svg", refused: /SVG/ }],
  ["pdf", bytes("%PDF-1.7\n"), { kind: "pdf", refused: /PDF/ }],
  ["bmp", bytes("BM", Buffer.alloc(60)), { kind: "bmp", refused: true }],
  ["empty", Buffer.alloc(0), { kind: "unknown", refused: true }],
  ["random bytes", Buffer.from(Array.from({ length: 200 }, (_, i) => (i * 37) % 251)), { kind: "unknown", refused: true }],
];
for (const [name, buf, want] of synthetic) {
  const h = await hero.readImageHeader(reader(buf), buf.length);
  if (want.kind) expect(h.kind === want.kind, `${name}: kind ${h.kind}, expected ${want.kind}`);
  if ("width" in want) expect(h.width === want.width && h.height === want.height, `${name}: ${h.width}×${h.height}, expected ${want.width}×${want.height}`);
  const problem = hero.headerProblem(h, buf.length);
  if (want.refused instanceof RegExp) expect(want.refused.test(problem || ""), `${name}: expected a refusal matching ${want.refused}, got ${problem}`);
  else if (want.refused) expect(!!problem, `${name}: must be refused`);
  else expect(problem === null, `${name}: refused unexpectedly (${problem})`);
}
// exactly 25 MP passes, one pixel row more does not
expect(hero.headerProblem({ kind: "png", width: 5000, height: 5000 }, 10) === null, "exactly 25 MP is allowed");
expect(!!hero.headerProblem({ kind: "png", width: 5000, height: 5001 }, 10), "25 MP + one row is refused");

// --- 3. compression, tokens, descriptions -----------------------------------------------
for (const slot of ["desktop", "mobile"]) {
  const [mw] = hero.HERO_SLOTS[slot].min;
  for (const [w, h] of [[6000, 2313], [3840, 1480], [2805, 1080], [1920, 740], [1600, 2174], [1060, 1440], [530, 720], [4000, 3000]]) {
    const region = hero.cropRegion(w, h, slot);
    const plan = hero.compressionPlan(region, slot);
    const top = hero.outputSize(region, slot);
    expect(plan.length >= 4 && plan.length <= 7, `${slot} ${w}×${h}: ${plan.length} attempts`);
    expect(plan[0].width === top.width && plan[0].quality === 0.95, `${slot} ${w}×${h}: starts at the kept size, q0.95`);
    for (let i = 1; i < plan.length; i += 1) expect(plan[i].width < plan[i - 1].width || plan[i].quality < plan[i - 1].quality, `${slot} ${w}×${h}: attempt ${i} is not smaller`);
    for (const p of plan) {
      expect(p.width >= Math.min(top.width, mw * 2), `${slot} ${w}×${h}: ${p.width} px is below twice the minimum`);
      expect(Math.abs(p.width / p.height - region.width / region.height) < 0.01, `${slot} ${w}×${h}: attempt changes the shape`);
    }
  }
}
const payload = Buffer.from(JSON.stringify({ n: "6f2c1f8e-1b1d-4a57-9b2a-0123456789ab", a: "64b000000000000000000001", t: 1790000000000 })).toString("base64url");
expect(hero.opIdOf(`v1.${payload}.bWFj`) === "6f2c1f8e-1b1d-4a57-9b2a-0123456789ab", "opIdOf reads the operation id");
expect(hero.opIdOf("garbage") === null && hero.opIdOf("v1.!!!.x") === null, "opIdOf refuses garbage");
expect(hero.cleanAlt("  Rann​ Utsav‮ —\n\tthe  white desert \u0007") === "Rann Utsav — the white desert", `cleanAlt: ${JSON.stringify(hero.cleanAlt("  Rann​ Utsav‮ —\n\tthe  white desert \u0007"))}`);

if (problems.length) {
  console.error(`check:hero — ${problems.length} problem(s):\n  ${problems.slice(0, 40).join("\n  ")}`);
  process.exit(1);
}
console.log(`check:hero OK — ${crop.vectors.length} crop vectors, ${fixtures.files.length} encoder headers, ${synthetic.length} synthetic headers`);

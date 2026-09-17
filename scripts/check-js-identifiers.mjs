// Fails when any src/**/*.{js,jsx} file references an identifier that is not
// defined or imported (TS2304 / TS2552 / TS2662 under `checkJs`).
//
// Why this exists: `tsc --noEmit` on this project type-checks .ts/.tsx only
// (allowJs without checkJs), and next lint does not flag undefined names in
// JSX either. A removed state variable that was still referenced in a .jsx
// file passed both gates and shipped as a runtime ReferenceError (a 500 on
// /stay/[id]). This script is the missing gate.
//
// Usage: node scripts/check-js-identifiers.mjs [files...]
//   with no arguments every src/**/*.{js,jsx} file is checked.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, extname } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const args = process.argv.slice(2);

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "node_modules" && name !== ".next") walk(p, out);
    } else if ([".js", ".jsx"].includes(extname(p))) {
      out.push(p);
    }
  }
  return out;
}

const files = (args.length ? args.map((f) => resolve(root, f)) : walk(join(root, "src"), []))
  .filter((f) => [".js", ".jsx"].includes(extname(f)));
if (files.length === 0) {
  console.log("check-js-identifiers: no JS files to check");
  process.exit(0);
}

const dir = mkdtempSync(join(tmpdir(), "checkjs-"));
const tsconfig = join(dir, "tsconfig.json");
writeFileSync(
  tsconfig,
  JSON.stringify({
    extends: join(root, "tsconfig.json").replace(/\\/g, "/"),
    compilerOptions: {
      checkJs: true,
      allowJs: true,
      noEmit: true,
      skipLibCheck: true,
      baseUrl: root.replace(/\\/g, "/"),
      paths: { "@/*": ["./src/*"] },
    },
    include: files.map((f) => f.replace(/\\/g, "/")),
  }),
);

// Invoke the TypeScript compiler through node directly (no shell, no .cmd).
const tscJs = join(root, "node_modules", "typescript", "lib", "tsc.js");
const result = spawnSync(process.execPath, [tscJs, "-p", tsconfig], { encoding: "utf8" });
const lines = (result.stdout + result.stderr)
  .split(/\r?\n/)
  .filter((l) => /error TS(2304|2552|2662|18004):/.test(l) && !l.includes("node_modules"));

if (lines.length) {
  console.error(`check-js-identifiers: ${lines.length} undefined identifier(s):`);
  for (const l of lines) console.error("  " + l);
  process.exit(1);
}
console.log(`check-js-identifiers: OK (${files.length} files)`);

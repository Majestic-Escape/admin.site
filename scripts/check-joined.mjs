// "Joined" date guard (run: npm run check:joined; Node ≥ 22.18 runs the
// TypeScript module directly).
//
// AD-REG-01: the registration date is the IST calendar day of createdAt
// whatever the machine's time zone is. The script re-runs itself with
// TZ=America/New_York and TZ=UTC and requires byte-identical output, so a
// formatter that silently used the browser's zone fails here.
//
// Cases: missing / malformed / impossible values → "—" and "" (CSV); the IST
// midnight boundary (18:29:59Z is still the 26th, 18:30:00Z is the 27th);
// a leap day; and for every case the label and the CSV agree on the day.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(here), "..");
const { formatJoined, formatJoinedCsv } = await import(pathToFileURL(path.join(root, "src/lib/format.ts")).href);

const problems = [];
const expect = (ok, what) => {
  if (!ok) problems.push(what);
};
const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Sept: 9, Oct: 10, Nov: 11, Dec: 12 };

// label "27 Sept 2026" → "2026-09-27"
function labelDay(label) {
  const m = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(label);
  if (!m || !MONTHS[m[2]]) return null;
  return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
// The IST day computed without Intl: IST is UTC+05:30 all year.
function istDay(ms) {
  const d = new Date(ms + 330 * 60_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// --- missing / invalid / impossible ----------------------------------------------
const INVALID = [
  undefined,
  null,
  "",
  "   ",
  "not a date",
  "Invalid Date",
  "2026-02-30T00:00:00Z", // Date.parse would say 2 March
  "2026-02-29T10:00:00Z", // 2026 is not a leap year
  "2026-13-01T00:00:00Z",
  "2026-04-31T12:00:00.000Z",
  "2026-09-27T24:00:00Z",
  "2026-09-27T10:60:00Z",
  "2026-09-27", // a day with no time and zone is not an instant
  "2026-09-27T10:00:00", // no offset: not guessed in the local zone
  "0050-01-01T00:00:00Z",
  NaN,
  Infinity,
  0,
  new Date("nope"),
  {},
  [],
  true,
];
for (const v of INVALID) {
  const j = formatJoined(v);
  const shown = typeof v === "string" ? JSON.stringify(v) : String(v);
  expect(j.label === "—" && j.title === undefined, `formatJoined(${shown}) = ${JSON.stringify(j)}, expected { label: "—" }`);
  expect(formatJoinedCsv(v) === "", `formatJoinedCsv(${shown}) = ${JSON.stringify(formatJoinedCsv(v))}, expected ""`);
}

// --- real instants -----------------------------------------------------------------
const VALID = [
  ["2026-09-26T18:29:59Z", "26 Sept 2026", "26 Sept 2026, 11:59 pm IST", "2026-09-26 23:59 IST"],
  ["2026-09-26T18:30:00Z", "27 Sept 2026", "27 Sept 2026, 12:00 am IST", "2026-09-27 00:00 IST"],
  ["2026-09-26T20:59:00.123Z", "27 Sept 2026", "27 Sept 2026, 2:29 am IST", "2026-09-27 02:29 IST"],
  ["2026-09-27T02:29:00+05:30", "27 Sept 2026", "27 Sept 2026, 2:29 am IST", "2026-09-27 02:29 IST"],
  ["2026-09-26T16:59:00-04:00", "27 Sept 2026", "27 Sept 2026, 2:29 am IST", "2026-09-27 02:29 IST"],
  ["2028-02-29T10:00:00Z", "29 Feb 2028", "29 Feb 2028, 3:30 pm IST", "2028-02-29 15:30 IST"],
  ["2027-12-31T18:30:00Z", "1 Jan 2028", "1 Jan 2028, 12:00 am IST", "2028-01-01 00:00 IST"],
  ["2026-05-01T06:30:00Z", "1 May 2026", "1 May 2026, 12:00 pm IST", "2026-05-01 12:00 IST"],
  [Date.UTC(2026, 8, 26, 18, 30), "27 Sept 2026", "27 Sept 2026, 12:00 am IST", "2026-09-27 00:00 IST"],
  [new Date("2026-09-26T18:29:59Z"), "26 Sept 2026", "26 Sept 2026, 11:59 pm IST", "2026-09-26 23:59 IST"],
];
for (const [v, label, title, csv] of VALID) {
  const j = formatJoined(v);
  const shown = v instanceof Date ? `Date(${v.toISOString()})` : JSON.stringify(v);
  expect(j.label === label, `formatJoined(${shown}).label = ${JSON.stringify(j.label)}, expected ${JSON.stringify(label)}`);
  expect(j.title === title, `formatJoined(${shown}).title = ${JSON.stringify(j.title)}, expected ${JSON.stringify(title)}`);
  const c = formatJoinedCsv(v);
  expect(c === csv, `formatJoinedCsv(${shown}) = ${JSON.stringify(c)}, expected ${JSON.stringify(csv)}`);
  // label, CSV and an Intl-free IST computation name the same calendar day
  const ms = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  const day = istDay(ms);
  expect(labelDay(j.label) === day, `label day ${labelDay(j.label)} ≠ IST day ${day} for ${shown}`);
  expect(c.slice(0, 10) === day, `CSV day ${c.slice(0, 10)} ≠ IST day ${day} for ${shown}`);
}

// Every IST minute around both midnights of a day agrees label ↔ CSV.
for (let ms = Date.UTC(2026, 8, 26, 17, 0); ms <= Date.UTC(2026, 8, 26, 20, 0); ms += 60_000) {
  const iso = new Date(ms).toISOString();
  expect(labelDay(formatJoined(iso).label) === formatJoinedCsv(iso).slice(0, 10), `label and CSV disagree at ${iso}`);
  expect(formatJoinedCsv(iso).slice(0, 10) === istDay(ms), `CSV is not the IST day at ${iso}`);
}

// A fingerprint of every output, compared across time zones.
const fingerprint = JSON.stringify([...INVALID.map((v) => [formatJoined(v), formatJoinedCsv(v)]), ...VALID.map(([v]) => [formatJoined(v), formatJoinedCsv(v)])]);

if (process.env.CHECK_JOINED_CHILD) {
  process.stdout.write(fingerprint);
  process.exit(problems.length ? 1 : 0);
}

for (const tz of ["America/New_York", "UTC", "Asia/Kolkata", "Pacific/Kiritimati"]) {
  const child = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", here], {
    env: { ...process.env, TZ: tz, CHECK_JOINED_CHILD: "1" },
    encoding: "utf8",
  });
  expect(child.status === 0, `TZ=${tz}: exited ${child.status}\n${child.stderr}`);
  expect(child.stdout === fingerprint, `TZ=${tz}: output differs from the parent run (TZ=${process.env.TZ ?? "system"})`);
}

if (problems.length) {
  console.error(`check-joined: ${problems.length} problem(s)\n - ${problems.join("\n - ")}`);
  process.exit(1);
}
console.log(`check-joined: OK (${INVALID.length} invalid, ${VALID.length} valid, IST midnight sweep; same output under TZ=America/New_York, UTC, Asia/Kolkata, Pacific/Kiritimati)`);

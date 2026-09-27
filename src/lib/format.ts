// Strict parsing + display helpers for money, counts and dates.
//
// The UI used to feed raw API fields straight into arithmetic and
// toLocaleString()/date-fns, which is where every "₹NaN", "Invalid Date" and
// "1970" on screen came from. The rule here is: parse once through a gate that
// returns `null` for anything that is not a real value, and let the *caller*
// decide what `null` means (a "—" placeholder, a disabled button, a skipped
// record). Nothing in this module ever invents a value — `Number(null) === 0`
// and `new Date(undefined)` are exactly the bugs it exists to remove.
//
// Identical copy lives in admin.site/src/lib/format.ts; keep them in sync.

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

// The single numeric gate. Accepts finite numbers (0 included) and plain
// decimal strings ("2500", "2500.50", "0"). Everything else — null, undefined,
// "", whitespace, NaN, ±Infinity, booleans, "₹2500", "2,500" — is `null`.
// No symbol/comma stripping on purpose: guessing what "2,500" meant would be
// inventing a value.
export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!PLAIN_NUMBER.test(trimmed)) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Counts (nights, guests, records) must be whole numbers; `min` lets callers
// require e.g. ≥ 1 for nights/adults or ≥ 0 for children.
export function parseInteger(value: unknown, min = 0): number | null {
  const n = parseFiniteNumber(value);
  if (n === null || !Number.isInteger(n) || n < min) return null;
  return n;
}

// Sum only the records that parse; report how many were skipped so the UI
// can say "n records could not be summed" instead of showing NaN.
export function sumFinite(
  values: unknown[],
): { total: number; skipped: number } {
  let total = 0;
  let skipped = 0;
  for (const v of values) {
    const n = parseFiniteNumber(v);
    if (n === null) skipped += 1;
    else total += n;
  }
  return { total, skipped };
}

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const inFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// "₹1,234" / "₹1,234.5". `null` → fallback; never "₹0" for missing data.
export function formatINR(
  value: unknown,
  { fallback = "—" }: { fallback?: string } = {},
): string {
  const n = parseFiniteNumber(value);
  if (n === null) return fallback;
  return inrFormatter.format(n);
}

// "1,234" (no currency symbol) for places that render the ₹ themselves.
export function formatNumberIN(
  value: unknown,
  { fallback = "—" }: { fallback?: string } = {},
): string {
  const n = parseFiniteNumber(value);
  if (n === null) return fallback;
  return inFormatter.format(n);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const MDY = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const EPOCH_MS_STRING = /^\d{13}$/;
const EPOCH_MIN = Date.UTC(2000, 0, 1);
const EPOCH_MAX = Date.UTC(2100, 0, 1);

// Builds a *local* calendar date from components and rejects anything JS
// would silently normalise (2026-02-31 → Mar 3, month 13 → next year, …).
function localCalendarDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

// Date | null with calendar-safe semantics:
//  - "YYYY-MM-DD" and "MM/DD/YYYY" → local calendar date (never
//    `new Date("YYYY-MM-DD")`, whose UTC midnight shifts the day in IST /
//    negative-offset zones), round-trip validated.
//  - ISO timestamps with a time component/offset → instants, validated.
//  - Epoch ms only for numbers, or 13-digit numeric strings, within
//    2000-01-01 … 2100-01-01. "0", "20260916" etc. → null.
//  - Date instances pass through if valid. Anything else → null.
export function parseDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < EPOCH_MIN || value > EPOCH_MAX) {
      return null;
    }
    return new Date(value);
  }
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  let m = YMD.exec(s);
  if (m) return localCalendarDate(+m[1], +m[2], +m[3]);

  m = MDY.exec(s);
  if (m) return localCalendarDate(+m[3], +m[1], +m[2]);

  if (EPOCH_MS_STRING.test(s)) {
    const n = Number(s);
    return n < EPOCH_MIN || n > EPOCH_MAX ? null : new Date(n);
  }

  // ISO 8601 with a time part ("2026-01-05T00:00:00Z", "…+05:30", "… 10:00").
  // Require a digit-led date prefix so free text like "not-a-date" or
  // "Invalid Date" can't reach Date.parse's lenient fallbacks.
  if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? null : new Date(t);
  }
  return null;
}

const DEFAULT_DATE_OPTS: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
};

// Never hands an invalid date to Intl (which throws RangeError).
export function formatDate(
  value: unknown,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTS,
  fallback = "—",
  locale = "en-IN",
): string {
  const d = parseDate(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

// Whole calendar nights between two parsed dates (local calendar, so a
// DST-shifted 23-hour day still counts as one night). `null` unless both
// dates parse and the result is a positive integer.
export function nightsBetween(checkIn: unknown, checkOut: unknown): number | null {
  const a = parseDate(checkIn);
  const b = parseDate(checkOut);
  if (!a || !b) return null;
  const startA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const startB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  const nights = Math.round((startB - startA) / 86_400_000);
  return Number.isInteger(nights) && nights > 0 ? nights : null;
}

// ---------------------------------------------------------------------------
// Times
// ---------------------------------------------------------------------------

// "14" → "2:00 PM", "14:30" → "2:30 PM", "0" → "12:00 AM". Accepts "0"–"23"
// and "HH:mm" with mm 00–59; "24:00", "25:30", "12:99", "abc", "" → fallback.
export function formatTime12h(value: unknown, fallback = "—"): string {
  if (typeof value === "number") value = String(value);
  if (typeof value !== "string") return fallback;
  const m = /^(\d{1,2})(?::(\d{2}))?$/.exec(value.trim());
  if (!m) return fallback;
  const hour = Number(m[1]);
  const minute = m[2] === undefined ? 0 : Number(m[2]);
  if (hour > 23 || minute > 59) return fallback;
  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

// Dates sent to the API as query parameters must be M/D/YYYY (the backend's
// parseMDYToUTC); toLocaleDateString() is D/M/YYYY in en-IN / en-GB browsers,
// which made these lists come back empty for most admins.
export function apiDate(d: Date): string {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getMonth() + 1}/${x.getDate()}/${x.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Account creation ("Joined") — always shown in India time
// ---------------------------------------------------------------------------

// "Joined" is when the account was created (sign-up started). The admins
// work in IST, so the calendar day is IST whatever the browser's zone is: an
// account created at 00:10 IST must not read as the previous day on a
// laptop set to UTC. Only a real instant is accepted — a Date, epoch ms in
// range, or an ISO timestamp that carries its offset ("…Z" / "…+05:30").
// Impossible calendar values are rejected here instead of being normalised
// by Date.parse ("2026-02-30T00:00:00Z" would otherwise become 2 Mar), and a
// date without an offset is not guessed at. Never estimated from an _id.
const ISO_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/i;

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseInstant(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime());
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < EPOCH_MIN || value > EPOCH_MAX) return null;
    return new Date(value);
  }
  if (typeof value !== "string") return null;
  const m = ISO_INSTANT.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi] = [+m[1], +m[2], +m[3], +m[4], +m[5]];
  const s = m[6] === undefined ? 0 : +m[6];
  const ms = m[7] === undefined ? 0 : Math.floor(Number(`0${m[7]}`) * 1000);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo) || h > 23 || mi > 59 || s > 59) return null;
  let offsetMin = 0;
  if (m[8].toUpperCase() !== "Z") {
    const sign = m[8][0] === "-" ? -1 : 1;
    const digits = m[8].slice(1).replace(":", "");
    const oh = +digits.slice(0, 2);
    const om = +digits.slice(2, 4);
    if (oh > 23 || om > 59) return null;
    offsetMin = sign * (oh * 60 + om);
  }
  // Same 2000–2100 window as parseDate (Date.UTC also maps years 0–99 to 19xx).
  const t = Date.UTC(y, mo - 1, d, h, mi, s, ms) - offsetMin * 60_000;
  return Number.isFinite(t) && t >= EPOCH_MIN && t <= EPOCH_MAX ? new Date(t) : null;
}

const IST = "Asia/Kolkata";
const joinedDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const joinedTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const joinedCsvFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// { label: "27 Sept 2026", title: "27 Sept 2026, 2:29 am IST" }; anything
// that is not a real instant → { label: "—" } with no title.
export function formatJoined(value: unknown): { label: string; title?: string } {
  const d = parseInstant(value);
  if (!d) return { label: "—" };
  const label = joinedDateFormatter.format(d);
  // ICU puts a narrow no-break space before "am"/"pm" in some versions.
  const time = joinedTimeFormatter.format(d).replace(/[\u202f\u00a0]/g, " ");
  return { label, title: `${label}, ${time} IST` };
}

// "2026-09-27 02:29 IST" for spreadsheets (sortable as text); "" when missing.
export function formatJoinedCsv(value: unknown): string {
  const d = parseInstant(value);
  if (!d) return "";
  const parts: Record<string, string> = {};
  for (const p of joinedCsvFormatter.formatToParts(d)) parts[p.type] = p.value;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute} IST`;
}

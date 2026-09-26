// Typed admin API calls (Batch A2). One place for the token header, the
// backend's `{ success, code, message }` error shape and the 401 → sign-in
// convention, so pages don't each re-implement fetch/JSON/error handling.
import { adminAuthHeaders } from "@/lib/admin-token";

const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export class ApiError extends Error {
  status: number;
  code: string;
  data?: unknown;
  constructor(status: number, code: string, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// The dashboard layout keys the session on `token`; a 401 means it is gone
// or revoked. Clear it and send the admin back to sign in.
function handleUnauthorized() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
  } catch {
    /* ignore */
  }
  window.location.assign("/");
}

async function parseError(res: Response): Promise<ApiError> {
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const message =
    (typeof body?.message === "string" && body.message) ||
    (typeof body?.error === "string" && body.error) ||
    `Request failed (${res.status})`;
  const code = (typeof body?.code === "string" && body.code) || `HTTP_${res.status}`;
  return new ApiError(res.status, code, message, body);
}

export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...adminAuthHeaders(), ...(init.headers ?? {}) },
  });
  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, "AUTH_REQUIRED", "Your session has expired. Please sign in again.");
  }
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as T;
}

export async function adminFetchBlob(path: string, init: RequestInit = {}): Promise<{ blob: Blob; contentType: string; filename: string | null }> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...adminAuthHeaders(), ...(init.headers ?? {}) } });
  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiError(401, "AUTH_REQUIRED", "Your session has expired. Please sign in again.");
  }
  if (!res.ok) throw await parseError(res);
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  return { blob: await res.blob(), contentType: res.headers.get("content-type") ?? "application/octet-stream", filename: match ? match[1] : null };
}

// --- users -----------------------------------------------------------------
export interface UserName {
  _id: string;
  firstName: string;
  lastName: string;
}
export async function renameUser(userId: string, next: { firstName: string; lastName: string }, expected: { firstName: string; lastName: string }) {
  return adminFetch<{ success: true; changed: boolean; data: UserName }>(`/guests/name/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify({ firstName: next.firstName, lastName: next.lastName, expected }),
  });
}

// --- listings --------------------------------------------------------------
export interface DeleteListingResult {
  _id: string;
  title: string;
  photosRemoved: number;
  photosSkipped: number;
  photosFailed: number;
}
export async function deletePendingListing(listingId: string) {
  return adminFetch<{ success: true; message: string; data: DeleteListingResult }>(`/properties/admin/${encodeURIComponent(listingId)}`, { method: "DELETE" });
}

// --- KYC documents ---------------------------------------------------------
export interface KycDocument {
  _id: string;
  createdAt: string;
  status: "pending" | "success" | "failed";
  mime: string;
  sizeBytes: number;
  documentType: string;
  nameOnDocument: string | null;
  numberMasked: string | null;
  isCurrent: boolean;
  isVerified: boolean;
  needsReview: boolean;
}
export interface KycDocuments {
  user: { _id: string; firstName: string; lastName: string; email: string };
  form: { status: string; documentType: string; isVerified: boolean; reviewStatus: string; reviewReason: string; verifiedLogId: string | null } | null;
  documents: KycDocument[];
  hasMore: boolean;
}
export async function fetchKycDocuments(hostId: string) {
  const res = await adminFetch<{ success: true; data: KycDocuments }>(`/guests/kyc-documents/${encodeURIComponent(hostId)}`);
  return res.data;
}
export function fetchKycDocumentBlob(hostId: string, logId: string, mode: "view" | "download", signal?: AbortSignal) {
  return adminFetchBlob(`/guests/kyc-documents/${encodeURIComponent(hostId)}/${encodeURIComponent(logId)}/file?mode=${mode}`, { signal });
}
export async function markKycDocumentVerified(hostId: string, logId: string) {
  return adminFetch<{ success: true; data: { verifiedLogId: string; reviewStatus: string; completed: boolean } }>(`/guests/admin/kyc/${encodeURIComponent(hostId)}/document-verified`, {
    method: "PATCH",
    body: JSON.stringify({ logId }),
  });
}

// KYC steps table (existing endpoint, now typed + tokenised through one path)
export interface KycFormSummary {
  _id: string;
  status: string;
  hostEmail?: string;
  documentInfo?: { documentType?: string; isVerified?: boolean; reviewStatus?: string };
  gstInfo?: { isVerified?: boolean };
  acceptedTerms?: { general?: boolean };
  personalInfo?: { address?: { pincode?: string } };
}
export async function fetchKycSteps(hostId: string) {
  const res = await adminFetch<{ data: KycFormSummary[] }>(`/guests/kyc?id=${encodeURIComponent(hostId)}`);
  return Array.isArray(res.data) ? res.data : [];
}

// --- homepage banner (server.me docs/site-hero.md) ---------------------------
export type HeroSlotName = "desktop" | "mobile";
export interface HeroRendition {
  width: number;
  avif: string;
  webp: string;
}
export interface HeroArtwork {
  url: string;
  width: number;
  height: number;
  lqip: string;
  source: { width: number; height: number; bytes: number; clientReencoded: boolean } | null;
  renditions: HeroRendition[];
}
export interface HeroLive extends HeroArtwork {
  publishedAt: string | null;
}
export interface HeroDraft extends HeroArtwork {
  opId: string;
  stagedBy: string | null;
  stagedAt: string;
  expiresAt: string;
  expired: boolean;
  notices: string[];
  // server-verified shortfalls (server.me services/siteHeroImage.js): widths
  // over the size budget, and renditions below the quality target (always at
  // least as good as the website's current banners)
  overBudget?: { width: number; bytes: number; budget: number }[];
  belowTarget?: { width: number; format: string; metrics: { ssim: number; p1: number; chroma: number }; target: { ssim: number; p1: number; chroma: number } }[];
}
export interface HeroState {
  version: number;
  alt: string | null;
  custom: boolean;
  desktop: HeroLive | null;
  mobile: HeroLive | null;
  draft: { desktop: HeroDraft | null; mobile: HeroDraft | null };
  busy: { until: string; own: boolean } | null;
  updatedAt: string | null;
  updatedBy: string | null;
  // where this server keeps banner objects; only production's reach the site
  // namespace: whose banner document this is; writable false = this server may not change it (server.me docs/site-hero.md, Environments)
  environment?: { production: boolean; prefix: string; namespace?: string | null; writable?: boolean };
}
export type HeroNotifyStatus = "ok" | "timeout" | "error" | "skipped" | "mocked" | "unknown";
export interface HeroMutation {
  success: true;
  state: HeroState;
  opToken: string;
  replayed?: boolean;
  version?: number;
  changed?: boolean;
  notified?: { site: HeroNotifyStatus; cdn: HeroNotifyStatus };
}
export interface HeroOpStatus {
  success: true;
  opId: string;
  status: "processing" | "completed" | "failed" | "unknown";
  result?: { httpStatus?: number; code?: string; message?: string; version?: number; draftOpId?: string };
}

// A request whose answer never arrived (offline, dropped connection, a
// stalled upload): the change may or may not have happened — the caller
// looks the operation up instead of guessing.
export class NetworkError extends Error {
  constructor(message = "The connection was interrupted") {
    super(message);
    this.name = "NetworkError";
  }
}

// Every banner call has a deadline: a request that hangs becomes "no answer"
// and is looked up (use-hero-banner.ts) instead of spinning forever.
const HERO_TIMEOUT_MS = 45_000;
async function heroFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await adminFetch<T>(path, { cache: "no-store", signal: AbortSignal.timeout(HERO_TIMEOUT_MS), ...init });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new NetworkError();
  }
}

export async function fetchHeroAdmin() {
  const res = await heroFetch<HeroState & { success: true; opToken: string }>("/site/admin/hero");
  const state: HeroState = { version: res.version, alt: res.alt, custom: res.custom, desktop: res.desktop, mobile: res.mobile, draft: res.draft, busy: res.busy, updatedAt: res.updatedAt, updatedBy: res.updatedBy, environment: res.environment };
  return { state, opToken: res.opToken };
}
export function fetchHeroOperation(opId: string) {
  return heroFetch<HeroOpStatus>(`/site/admin/hero/ops/${encodeURIComponent(opId)}`);
}
export function publishHero(body: { opToken: string; expectedVersion: number; slots: Partial<Record<HeroSlotName, string>>; alt: string; acknowledgeShortfall?: boolean }) {
  return heroFetch<HeroMutation>("/site/admin/hero/publish", { method: "POST", body: JSON.stringify(body) });
}
export function editHeroAlt(body: { opToken: string; expectedVersion: number; alt: string }) {
  return heroFetch<HeroMutation>("/site/admin/hero/alt", { method: "PATCH", body: JSON.stringify(body) });
}
export function restoreHeroDefault(body: { opToken: string; expectedVersion: number }) {
  return heroFetch<HeroMutation>("/site/admin/hero/restore-default", { method: "POST", body: JSON.stringify(body) });
}
export function discardHeroDraft(slot: HeroSlotName, body: { opToken: string; expectedDraftOpId: string }) {
  return heroFetch<HeroMutation>(`/site/admin/hero/${slot}/draft`, { method: "DELETE", body: JSON.stringify(body) });
}

// The one multipart call. XMLHttpRequest because fetch reports no upload
// progress. Resolves with the parsed body of a 2xx (201 = prepared, 200 = a
// replay of the same operation, 202 = still being prepared by an earlier
// attempt); rejects with ApiError for a server answer, NetworkError when no
// answer came (including an abort).
export function uploadHeroDraft(
  slot: HeroSlotName,
  form: FormData,
  { onProgress, onSent, signal }: { onProgress?: (fraction: number) => void; onSent?: () => void; signal?: AbortSignal } = {},
): Promise<HeroMutation | { success: true; status: "processing"; opId: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/site/admin/hero/${slot}/draft`);
    for (const [k, v] of Object.entries(adminAuthHeaders())) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.min(1, e.loaded / Math.max(1, e.total)));
    };
    xhr.upload.onload = () => onSent && onSent();
    const onAbort = () => xhr.abort();
    signal?.addEventListener("abort", onAbort, { once: true });
    const done = () => signal?.removeEventListener("abort", onAbort);
    xhr.onerror = () => {
      done();
      reject(new NetworkError());
    };
    xhr.onabort = () => {
      done();
      reject(new NetworkError("The upload was stopped"));
    };
    xhr.onload = () => {
      done();
      let body: Record<string, unknown> | null = null;
      try {
        body = JSON.parse(xhr.responseText) as Record<string, unknown>;
      } catch {
        body = null;
      }
      if (xhr.status === 401) {
        handleUnauthorized();
        reject(new ApiError(401, "AUTH_REQUIRED", "Your session has expired. Please sign in again."));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body as unknown as HeroMutation);
        return;
      }
      const message = (typeof body?.message === "string" && body.message) || `Request failed (${xhr.status})`;
      const code = (typeof body?.code === "string" && body.code) || `HTTP_${xhr.status}`;
      reject(new ApiError(xhr.status, code, message, body));
    };
    xhr.send(form);
  });
}

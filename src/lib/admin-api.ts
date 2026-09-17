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

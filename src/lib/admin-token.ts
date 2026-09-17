// The admin session token as stored by the login form (JSON-encoded) —
// tolerant of a raw string too, like settings/page.jsx#getAdminToken.
export function readAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem("token");
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "string" && parsed.length > 0) return parsed;
  } catch {
    /* not JSON, treat as raw */
  }
  return raw;
}

// Authorization header for the admin's own API calls; empty when logged
// out so the backend answers 401 instead of the client throwing.
export function adminAuthHeaders(): Record<string, string> {
  const token = readAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

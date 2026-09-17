// Opt-in caching presets for React Query.
//
// The root QueryClient keeps library defaults on purpose (staleTime 0,
// gcTime 5 min, focus refetch on, retry 3) so screens that have not been
// converted behave exactly as before. A converted query spreads one of these
// presets, which decides how long cached data is shown without a refetch,
// how long it is retained after unmount, and how many retries a failure
// gets (1 — a 5xx should surface as an error state within ~1 s, not after
// three back-off retries).
//
// Cache cardinality is bounded by gcTime: a 30-listing, 20-filter session
// holds ~50 small entries, each dropped after its own window.

const MINUTE = 60 * 1000;

// One retry for transient failures (5xx, network); a 4xx is a definite
// answer (missing, forbidden, malformed) and retrying it only doubles the
// backend load for the same result.
const retryOnceUnlessClientError = (failureCount: number, error: unknown) => {
  const status = (error as { status?: number } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failureCount < 1;
};

// Public catalogue data (home feed, listing, reviews, search): fresh for
// 5 min, kept for 30, no refetch on tab focus.
export const PUBLIC = {
  staleTime: 5 * MINUTE,
  gcTime: 30 * MINUTE,
  refetchOnWindowFocus: false,
  retry: retryOnceUnlessClientError,
} as const;

// Slow-changing aggregates (destination counts).
export const PUBLIC_LONG = {
  staleTime: 30 * MINUTE,
  gcTime: 60 * MINUTE,
  refetchOnWindowFocus: false,
  retry: retryOnceUnlessClientError,
} as const;

// Per-user data (bookings, account, host listings): fresh for 60 s, kept
// for 15 min, revalidated when the tab regains focus.
export const USER = {
  staleTime: MINUTE,
  gcTime: 15 * MINUTE,
  refetchOnWindowFocus: true,
  retry: retryOnceUnlessClientError,
} as const;

// Data that must never be shown as "fresh" (availability, reservations,
// booking by id): cached data paints instantly, then always revalidates.
export const LIVE = {
  staleTime: 0,
  gcTime: 5 * MINUTE,
  refetchOnWindowFocus: true,
  retry: retryOnceUnlessClientError,
} as const;

// Resources that legitimately may not exist yet (KYC record for a new
// host): no retries, and the fetcher maps 404 → null.
export const MAY_NOT_EXIST = {
  staleTime: MINUTE,
  gcTime: 15 * MINUTE,
  refetchOnWindowFocus: true,
  retry: false,
} as const;

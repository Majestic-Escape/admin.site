// Key factories for React Query (admin). Every useQuery and every
// invalidateQueries prefix is built here so a key is never spelled by hand
// in two places. `xxxAll` is the prefix used to invalidate every variant.

type Id = string | number | null | undefined;

export const queryKeys = {
  adminListings: (filters: unknown) => ["adminListings", filters] as const,
  adminListingsAll: ["adminListings"] as const,
  adminBookings: (filters: unknown) => ["adminBookings", filters] as const,
  adminBookingsAll: ["adminBookings"] as const,
  adminAttention: ["adminAttention"] as const,
  adminGuests: (filters: unknown) => ["adminGuests", filters] as const,
  adminGuestsAll: ["adminGuests"] as const,
  property: (id: Id) => ["property", id] as const,
  bookingById: (bookingId: Id) => ["bookingId", bookingId] as const,
};

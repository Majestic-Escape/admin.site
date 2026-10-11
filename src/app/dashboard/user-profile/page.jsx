import { redirect } from "next/navigation";

// This route never had content: the component returned nothing, so the page
// was blank at every width. The user profile lives at
// /dashboard/booking-history/user-profile (that is what bookings and reviews
// link to) and nothing links here, so old bookmarks are sent there — or to
// the Users list when there is no userId.
export default async function Userprofile({ searchParams }) {
  const { userId } = (await searchParams) ?? {};
  redirect(
    userId
      ? `/dashboard/booking-history/user-profile?userId=${encodeURIComponent(userId)}`
      : "/dashboard/guests",
  );
}

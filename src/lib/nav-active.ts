// Which sidebar / bottom-navigation section a pathname belongs to. Detail
// pages that live outside their section's URL prefix are listed here so the
// section stays highlighted while the admin is on them (KYC details is a
// Users page; view/edit property are Properties pages). Booking details is
// reached from both Bookings and History, so it deliberately has no parent.
const SECTION_CHILDREN: Record<string, string[]> = {
  "/dashboard/guests": ["/dashboard/kyc-details"],
  "/dashboard/properties": ["/dashboard/view-property", "/dashboard/edit-property"],
};

export function isSectionActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  if (pathname.startsWith(href)) return true;
  return (SECTION_CHILDREN[href] ?? []).some((child) => pathname.startsWith(child));
}

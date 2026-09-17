import { Skeleton } from "@/components/ui/skeleton";

// Rendered by the route-group `loading.tsx` files while Next streams the next
// page's server payload. Two jobs: give the click an instant, visible response
// (the top progress bar) and hold the content area so the layout doesn't
// collapse. It is intentionally generic — pages have very different shapes,
// so a low-contrast placeholder beats a confidently wrong one.
export default function RouteLoading({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`me-fade-in ${className}`}
    >
      <span className="sr-only">Loading page…</span>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[10000] h-0.5 overflow-hidden"
      >
        <div className="me-route-progress h-full w-full bg-primaryGreen" />
      </div>
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8"
      >
        <Skeleton className="mb-6 h-7 w-2/3 max-w-md" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

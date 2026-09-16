import RouteLoading from "@/components/route-loading";

// The dashboard layout (sidebar + header) persists across navigation; only
// the page area shows the placeholder while the next route streams in.
export default function Loading() {
  return <RouteLoading className="min-h-[60vh] pt-6" />;
}

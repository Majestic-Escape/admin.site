"use client";

import { startTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Shared UI for the route-segment error boundaries (`error.jsx`). Rendered in
// place of the failed segment while layouts and providers stay mounted, so
// the user keeps the navbar and can recover in-app instead of seeing Next's
// bare "Application error: a client-side exception has occurred".
//
// `reset()` alone re-renders the boundary against the same (possibly failed)
// server payload; pairing it with router.refresh() re-fetches the segment, so
// "Try again" actually retries a failed server render / data load.
export default function RouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "This part of the page couldn't load. You can try again or head back home.",
  homeHref = "/",
  homeLabel = "Go home",
}) {
  const router = useRouter();

  useEffect(() => {
    // In production Next strips the message; the digest is what identifies
    // the server-side error in Vercel logs.
    console.error("[route-error]", error?.digest ?? "", error);
  }, [error]);

  const retry = () => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16 font-poppins">
      <div
        role="alert"
        className="w-full max-w-md rounded-xl border border-lightGray bg-white p-8 text-center shadow-sm"
      >
        <h2 className="font-bricolage text-2xl font-semibold text-graphite">
          {title}
        </h2>
        <p className="mt-3 text-sm text-stone">{description}</p>
        {error?.digest ? (
          <p className="mt-2 text-xs text-solidGray">Reference: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center justify-center rounded-full bg-primaryGreen px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brightGreen active:scale-95 motion-reduce:active:scale-100"
          >
            Try again
          </button>
          <Link
            href={homeHref}
            className="inline-flex items-center justify-center rounded-full border border-lightGray px-6 py-2.5 text-sm font-medium text-graphite transition hover:bg-gray-50 active:scale-95 motion-reduce:active:scale-100"
          >
            {homeLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

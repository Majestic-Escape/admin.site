"use client";

import RouteError from "@/components/route-error";

export default function Error({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      homeHref="/dashboard"
      homeLabel="Back to dashboard"
    />
  );
}

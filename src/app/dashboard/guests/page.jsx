"use client";

import React, { Suspense } from "react";
import UsersPage from "./users-page";

// useSearchParams (table state in the URL) needs a Suspense boundary above it.
export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24 text-center text-sm text-muted-foreground">Loading…</div>}>
      <UsersPage />
    </Suspense>
  );
}

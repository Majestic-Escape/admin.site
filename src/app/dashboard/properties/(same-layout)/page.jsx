"use client";
import { Suspense } from "react";
import { ListingsTable } from "./listings-table";

// useSearchParams (table state in the URL) needs a Suspense boundary above it.
export default function HostListingsPage() {
  return (
    <div className="container mx-auto py-10 px-8 min-h-screen bg-gray-200">
      <h1 className="text-2xl font-semibold font-bricolage mb-5"> Listings</h1>
      <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>}>
        <ListingsTable />
      </Suspense>
    </div>
  );
}

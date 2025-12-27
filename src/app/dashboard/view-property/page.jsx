"use client";

import React, { Suspense } from "react";
import DetailView from "./detail-view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-20 w-20 animate-spin rounded-full border-b-2 border-current"></div>
        </div>
      }
    >
      <DetailView />
    </Suspense>
  );
}

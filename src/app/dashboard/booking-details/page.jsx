"use client";

import React, { Suspense } from "react";
import BookingPage from "./booking-page";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24">Loading...</div>}>
      <BookingPage />
    </Suspense>
  );
}

"use client";

import React, { Suspense } from "react";
import BookingsPage from "../page";
import ProfilePage from "./booking-pages";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-24">Loading...</div>}>
      <ProfilePage />
    </Suspense>
  );
}

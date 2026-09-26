"use client";
/* eslint-disable @next/next/no-img-element */
// The website's built-in banner — whatever artwork ships with the site
// (user.website public/images/hero/gen) — shown from the site itself, so this
// page never names or assumes a particular campaign. If the site's files
// can't be loaded (another environment, renamed files), a neutral
// placeholder takes their place.
import { useState } from "react";
import type { HeroSlotName } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://majesticescape.in").replace(/\/+$/, "");
const GEN = `${SITE_URL}/images/hero/gen`;
const FILES: Record<HeroSlotName, { src: string; srcSet: string; sizes: string }> = {
  desktop: { src: `${GEN}/banner-1280.webp`, srcSet: `${GEN}/banner-1280.webp 1280w, ${GEN}/banner-1920.webp 1920w`, sizes: "(min-width: 1024px) 860px, 100vw" },
  mobile: { src: `${GEN}/mobile-banner-640.webp`, srcSet: `${GEN}/mobile-banner-640.webp 640w`, sizes: "220px" },
};
const BOX: Record<HeroSlotName, string> = { desktop: "aspect-[1920/740]", mobile: "aspect-[530/720]" };

export function BuiltInBanner({ slot }: { slot: HeroSlotName }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div className={cn("flex w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-center", BOX[slot])}>
        <p className="text-sm font-medium text-gray-800">Built-in banner</p>
        <p className="mt-0.5 text-xs text-gray-600">The artwork that ships with the website</p>
      </div>
    );
  }
  const f = FILES[slot];
  return (
    <img
      src={f.src}
      srcSet={f.srcSet}
      sizes={f.sizes}
      alt={`The website's built-in ${slot} banner`}
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={cn("block h-auto w-full rounded-md bg-gray-100 object-cover", BOX[slot])}
    />
  );
}

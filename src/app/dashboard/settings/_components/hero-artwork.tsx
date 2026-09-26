"use client";
/* eslint-disable @next/next/no-img-element */
// A prepared banner image exactly as the website will serve it: the CDN's
// AVIF/WebP renditions at their true widths, the slot's box, the blurred
// placeholder underneath while it loads.
import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { HeroArtwork as Artwork, HeroSlotName } from "@/lib/admin-api";
import { cn } from "@/lib/utils";

export const BOX: Record<HeroSlotName, string> = { desktop: "aspect-[1920/740]", mobile: "aspect-[530/720]" };

export function HeroArtwork({ artwork, slot, alt, sizes, className }: { artwork: Artwork; slot: HeroSlotName; alt: string; sizes: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const avif = artwork.renditions.map((r) => `${r.avif} ${r.width}w`).join(", ");
  const webp = artwork.renditions.map((r) => `${r.webp} ${r.width}w`).join(", ");
  if (broken) {
    return (
      <div className={cn("flex w-full flex-col items-center justify-center gap-1 rounded-md bg-gray-100 p-3 text-center text-xs text-gray-600", BOX[slot], className)}>
        <ImageOff className="h-5 w-5" aria-hidden="true" />
        <span>Preview couldn&apos;t load.</span>
        <a href={artwork.url} target="_blank" rel="noreferrer" className="font-medium text-primaryGreen underline underline-offset-2">
          Open the image
        </a>
      </div>
    );
  }
  return (
    <picture>
      {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
      {webp && <source type="image/webp" srcSet={webp} sizes={sizes} />}
      <img
        src={artwork.url}
        alt={alt}
        width={artwork.width}
        height={artwork.height}
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
        style={artwork.lqip ? { backgroundImage: `url("${artwork.lqip}")` } : undefined}
        className={cn("block h-auto w-full rounded-md bg-gray-100 bg-cover bg-center object-cover", BOX[slot], className)}
      />
    </picture>
  );
}

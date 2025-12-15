"use client";

import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import PhotoGalleryModal from "./photo-gallery-modal";

interface ImageGalleryProps {
  images: string[];
  isLoading: boolean;
  height?: number; // Optional prop to control the height
}

export default function ImageCollection({
  images,
  isLoading,
  height = 360,
}: ImageGalleryProps) {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  // process.env.ENV === 'dev' && if (process.env.NEXT_PUBLIC_ENV === "dev") {
  //   console.log("Photos", images);
  // }

  // Limit to 5 images for display in the grid
  const displayImages = images.slice(0, 5);

  if (isLoading) {
    return (
      <div
        className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2"
        style={{ height: `${height}px` }}
      >
        <Skeleton className="aspect-square sm:col-span-2 sm:row-span-2 h-full" />
        <Skeleton className="aspect-square hidden sm:block h-full" />
        <Skeleton className="aspect-square hidden sm:block h-full" />
        <Skeleton className="aspect-square hidden md:block h-full" />
        <Skeleton className="aspect-square hidden md:block h-full" />
      </div>
    );
  }

  return (
    <>
      <div className="relative" style={{ height: `${height}px` }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 rounded-xl overflow-hidden h-full">
          <div className="sm:col-span-2 sm:row-span-2 relative h-full">
            {displayImages.length > 0 ? (
              <Image
                src={displayImages[0] || "/placeholder.svg"}
                alt="Main property image"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 50vw"
                className="object-cover cursor-pointer"
                onClick={() => setIsGalleryOpen(true)}
              />
            ) : (
              <Image
                src="/placeholder.svg"
                alt="Main property image"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 50vw"
                className="object-cover"
              />
            )}
          </div>
          {displayImages.slice(1).map((image, index) => (
            <div
              key={index}
              className={`${index > 1 ? "hidden md:block" : "hidden sm:block"} relative h-full`}
            >
              <Image
                src={image || "/placeholder.svg"}
                alt={`Property image ${index + 2}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover cursor-pointer"
                onClick={() => setIsGalleryOpen(true)}
              />
            </div>
          ))}
        </div>
        {images.length > 0 && (
          <button
            onClick={() => setIsGalleryOpen(true)}
            className="absolute bottom-6 right-6 bg-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-gray-100"
          >
            Show all photos
          </button>
        )}
      </div>
      <PhotoGalleryModal
        images={images}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />
    </>
  );
}

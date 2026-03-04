"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Users, User, UsersRound, Users2, Key } from "lucide-react";
import { TextReveal } from "@/components/text-reveal";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, DoorOpenIcon as Door } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import {
  PocketIcon as Pool,
  Bath,
  Umbrella,
  Flame,
  UtensilsCrossed,
  Table,
  FlameIcon as Fireplace,
  Piano,
  Dumbbell,
  Waves,
  BeanIcon as Beach,
  MountainSnowIcon as Ski,
  ShowerHeadIcon as Shower,
  AlertOctagon,
  AmbulanceIcon as FirstAid,
  FireExtinguisher,
  AlertCircle,
  Wifi,
  Tv,
  UtensilsIcon,
  WashingMachineIcon as Washing,
  Car,
  CarTaxiFront,
  Snowflake,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Photo {
  id: string;
  url: string;
}

interface MakeItStandOutProps {
  updateFormData: (data: { photos: string[] }) => void;
  formData: { photos: string[] };
}

export function Images({ updateFormData, formData }: MakeItStandOutProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  useEffect(() => {
    if (!formData?.photos?.length) return;

    setPhotos((prev) => {
      // prevent unnecessary reset
      const prevUrls = prev.map((p) => p.url).join(",");
      const nextUrls = formData?.photos.join(",");

      if (prevUrls === nextUrls) return prev;

      return formData?.photos.map((url) => ({
        id: crypto.randomUUID(),
        url,
      }));
    });
  }, [formData?.photos]);

  const [draggedPhoto, setDraggedPhoto] = useState<Photo | null>(null);
  const draggedNodeRef = useRef<HTMLDivElement | null>(null);
  const [uploading, setUploading] = useState(false); // Optional: Show loading state

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const filesArray = Array.from(files);

    // Validate new files
    const MAX_FILES = 20;
    const totalFilesAfterUpload = photos.length + filesArray.length;

    if (totalFilesAfterUpload > MAX_FILES) {
      toast.error(
        ` You already have ${photos.length}. You can add only ${MAX_FILES - photos.length} more.`,
      );
      resetFileInput();
      return;
    }
    //You can upload a maximum of ${MAX_FILES} images.
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    const ALLOWED_TYPES = [
      "image/jpg",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/octet-stream",
    ];

    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    filesArray.forEach((file) => {
      if (!ALLOWED_TYPES?.includes(file?.type)) {
        invalidFiles.push(`${file.name} (invalid type)`);
      } else if (file.size > MAX_SIZE) {
        invalidFiles.push(`${file.name} (too large)`);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(
        ` ${invalidFiles.slice(0, 3).join(", ")}${invalidFiles.length > 3 ? "..." : ""}`,
      );
    }

    if (validFiles.length === 0) {
      resetFileInput();
      return;
    }

    // Process the valid files
    handlePhotoUpload(validFiles);
  };

  const handlePhotoUpload = async (files: File[]) => {
    console.log(`Uploading ${files.length} files`);

    setUploading(true);
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("images", file);
    });

    try {
      console.log("Formdat", formData);
      console.log("Making backend call");
      const res = await axios.post(`${API_BASE_URL}/uploads/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("Fetch data from backend");
      const newPhotos = res.data.urls.map((url: string) => ({
        id: crypto.randomUUID(),
        url,
      }));
      const updatedPhotos = [...photos, ...newPhotos];

      if (process.env.NEXT_PUBLIC_ENV === "dev") {
        console.log("Updated photos:", updatedPhotos);
      }

      console.log("Update the form");
      setPhotos(updatedPhotos);
      updateFormData({ photos: updatedPhotos.map((photo) => photo.url) });

      toast.success(
        `Successfully uploaded ${files.length} image${files.length > 1 ? "s" : ""}`,
      );
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Image upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
      resetFileInput();
    }
  };

  const removePhoto = async (id: string, url: string) => {
    await axios.delete(`${API_BASE_URL}/uploads/delete`, {
      data: { url },
    });

    const updatedPhotos = photos.filter((photo) => photo.id !== id);
    setPhotos(updatedPhotos);
    updateFormData({ photos: updatedPhotos.map((photo) => photo.url) });
  };
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    photo: Photo,
  ) => {
    setDraggedPhoto(photo);
    draggedNodeRef.current = e.target as HTMLDivElement;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", photo.id);

    requestAnimationFrame(() => {
      if (draggedNodeRef.current) {
        draggedNodeRef.current.style.opacity = "0.5";
      }
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetPhoto: Photo) => {
      e.preventDefault();
      if (draggedPhoto && draggedPhoto.id !== targetPhoto.id) {
        setPhotos((prevPhotos) => {
          const newPhotos = [...prevPhotos];
          const draggedIndex = newPhotos.findIndex(
            (photo) => photo.id === draggedPhoto.id,
          );
          const targetIndex = newPhotos.findIndex(
            (photo) => photo.id === targetPhoto.id,
          );
          newPhotos.splice(draggedIndex, 1);
          newPhotos.splice(targetIndex, 0, draggedPhoto);
          return newPhotos;
        });
      }
    },
    [draggedPhoto],
  );

  const handleDragEnd = useCallback(() => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.style.opacity = "1";
    }
    setDraggedPhoto(null);
    updateFormData({ photos: photos.map((photo) => photo.url) });
  }, [photos, updateFormData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show message when Ctrl key is pressed
      if (e.ctrlKey && fileInputRef.current) {
        // toast.info("Hold Ctrl and click to select multiple images");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey) {
        toast.dismiss();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className=" bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Property Images
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div>
              <div className="pt-4 md:pt-0 space-y-4">
                {/* <Input
                        id="photos"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploading} // Disable during upload
                      > */}

                <Label
                  htmlFor="photos"
                  className="flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primaryGreen"
                >
                  <div className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-primaryGreen">
                    <input
                      id="photos"
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      multiple
                      onChange={handleFileSelection}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      style={{ zIndex: 10 }}
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = "";
                      }}
                    />

                    <span className="pointer-events-none text-center">
                      <p className="mt-2">
                        {uploading ? (
                          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current"></div>
                        ) : (
                          <div>
                            <div className="text-2xl">📷</div>
                            <div>"Click to upload photos"</div>
                          </div>
                        )}
                      </p>
                    </span>
                  </div>
                </Label>
                {photos.length < 5 && (
                  <p className="text-red-500">
                    Please upload at least 5 photos
                  </p>
                )}
                {photos.length > 1 && (
                  <div>
                    Drag and move the images to change the order. The first
                    image will be set as property profile image.
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, photo)}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnter(e, photo)}
                      onDragEnd={handleDragEnd}
                      className="relative transition-transform duration-300 ease-in-out"
                      style={{
                        transform:
                          draggedPhoto && draggedPhoto.id === photo.id
                            ? "scale(1.05)"
                            : "scale(1)",
                      }}
                    >
                      <img
                        src={photo.url}
                        alt={`Property photo`}
                        className="w-full h-40 object-cover rounded-lg transition-opacity duration-300 ease-in-out"
                        style={{
                          opacity:
                            draggedPhoto && draggedPhoto.id === photo.id
                              ? 0.5
                              : 1,
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white bg-opacity-50 hover:bg-opacity-100 transition-opacity duration-300 ease-in-out"
                        onClick={() => removePhoto(photo.id, photo.url)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Remove photo</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

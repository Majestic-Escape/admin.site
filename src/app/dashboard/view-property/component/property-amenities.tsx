"use client";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";

interface PropertyAmenitiesProps {
  amenities: Array<string>;
  showAmenitiesDialog: boolean;
  setShowAmenitiesDialog: (show: boolean) => void;
  rules: Array<string>;
  custom: Array<string>;
  safety: Object;
}

export default function PropertyAmenities({
  amenities,
  showAmenitiesDialog,
  setShowAmenitiesDialog,
  rules,
  custom,
  safety,
}: PropertyAmenitiesProps) {
  console.log("values", amenities);

  // Static list of all possible amenities.
  // The id values match those returned by your network response.
  const allAmenities = [
    {
      id: "lake",
      title: "Lake access",
      icon: Waves,
      category: "standout",
      selected: false,
    },
    {
      id: "hot-tub",
      title: "Hot tub",
      icon: Bath,
      category: "standout",
      selected: false,
    },
    {
      id: "patio",
      title: "Patio",
      icon: Umbrella,
      category: "standout",
      selected: false,
    },
    {
      id: "bbq",
      title: "BBQ grill",
      icon: Flame,
      category: "standout",
      selected: false,
    },
    {
      id: "outdoor-dining",
      title: "Outdoor dining area",
      icon: UtensilsCrossed,
      category: "standout",
      selected: false,
    },
    {
      id: "firepit",
      title: "Firepit",
      icon: Flame,
      category: "standout",
      selected: false,
    },
    {
      id: "pool-table",
      title: "Pool table",
      icon: Table,
      category: "standout",
      selected: false,
    },
    {
      id: "indoor-fireplace",
      title: "Indoor fireplace",
      icon: Fireplace,
      category: "standout",
      selected: false,
    },
    {
      id: "piano",
      title: "Piano",
      icon: Piano,
      category: "standout",
      selected: false,
    },
    {
      id: "exercise",
      title: "Exercise equipment",
      icon: Dumbbell,
      category: "standout",
      selected: false,
    },
    {
      id: "beach",
      title: "Beach access",
      icon: Beach,
      category: "standout",
      selected: false,
    },
    {
      id: "ski",
      title: "Ski-in/out",
      icon: Ski,
      category: "standout",
      selected: false,
    },
    {
      id: "outdoor-shower",
      title: "Outdoor shower",
      icon: Shower,
      category: "standout",
      selected: false,
    },
    {
      id: "smoke-alarm",
      title: "Smoke alarm",
      icon: AlertOctagon,
      category: "safety",
      selected: false,
    },
    {
      id: "pool",
      title: "Pool",
      icon: Pool,
      category: "standout",
      selected: false,
    },
    {
      id: "first-aid",
      title: "First aid kit",
      icon: FirstAid,
      category: "safety",
      selected: false,
    },
    {
      id: "fire-extinguisher",
      title: "Fire extinguisher",
      icon: FireExtinguisher,
      category: "safety",
      selected: false,
    },
    {
      id: "carbon-monoxide",
      title: "Carbon monoxide alarm",
      icon: AlertCircle,
      category: "safety",
      selected: false,
    },
    {
      id: "wifi",
      title: "Wifi",
      icon: Wifi,
      category: "favorites",
      selected: false,
    },
    {
      id: "tv",
      title: "TV",
      icon: Tv,
      category: "favorites",
      selected: false,
    },
    {
      id: "kitchen",
      title: "Kitchen",
      icon: UtensilsIcon,
      category: "favorites",
      selected: false,
    },
    {
      id: "washing",
      title: "Washing machine",
      icon: Washing,
      category: "favorites",
      selected: false,
    },
    {
      id: "free-parking",
      title: "Free parking on premises",
      icon: Car,
      category: "favorites",
      selected: false,
    },
    {
      id: "paid-parking",
      title: "Paid parking on premises",
      icon: CarTaxiFront,
      category: "favorites",
      selected: false,
    },
    {
      id: "air-conditioning",
      title: "Air conditioning",
      icon: Snowflake,
      category: "favorites",
      selected: false,
    },
    {
      id: "workspace",
      title: "Dedicated workspace",
      icon: Briefcase,
      category: "favorites",
      selected: false,
    },
  ];

  // Filter the amenities using the dynamic prop (matching by id)
  const matchedAmenities = allAmenities.filter((amenity) =>
    amenities?.includes(amenity.id)
  );

  // Group matched amenities by category for the dialog view
  const groupedAmenities = matchedAmenities.reduce(
    (acc, amenity) => {
      if (!acc[amenity.category]) {
        acc[amenity.category] = [];
      }
      acc[amenity.category].push(amenity);
      return acc;
    },
    {} as Record<string, typeof matchedAmenities>
  );
  function removeHypen(str: string) {
    const first = str
      .replace(/[-_]+/g, " ") // Replace hyphens and underscores with spaces
      .replace(/(^| )([a-z])/g, (match) => match.toUpperCase()); // Capitalize first letter after space or start

    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  }
  return (
    <>
      <div className="border-b pb-6 mb-6">
        <h2 className="text-xl font-medium mb-6">What this place offers</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchedAmenities.slice(0, 8).map((amenity, index) => (
            <div key={index} className="flex items-center gap-4">
              <amenity.icon className="h-6 w-6 text-gray-600" />
              <span>{amenity.title}</span>
            </div>
          ))}
        </div>

        {matchedAmenities?.length > 8 && (
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => setShowAmenitiesDialog(true)}
          >
            Show all {matchedAmenities?.length} amenities
          </Button>
        )}

        <Dialog
          open={showAmenitiesDialog}
          onOpenChange={setShowAmenitiesDialog}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                What this place offers
              </DialogTitle>
            </DialogHeader>

            <div className="py-4">
              {Object?.entries(groupedAmenities).map(([category, items]) => (
                <div key={category} className="mb-8">
                  <h3 className="text-lg font-medium mb-4">{category}</h3>
                  <div className="space-y-4">
                    {items?.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <amenity.icon className="h-6 w-6 text-gray-600" />
                        <span>{amenity.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                onClick={() => setShowAmenitiesDialog(false)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {safety ? (
        <div className="border-b pb-6 mb-6">
          <h2 className="text-xl font-medium mb-6">Safety Details</h2>
          {Object.entries(safety).map(([key, value]) =>
            value?.checked == true ? (
              value?.description ? (
                <div className="">• {removeHypen(value.description)}</div>
              ) : (
                <div>• {removeHypen(key)}</div>
              )
            ) : null
          )}
        </div>
      ) : null}

      {rules?.length != 0 && custom?.length != 0 ? (
        <div className="border-b pb-6 mb-6">
          <h2 className="text-xl font-medium mb-6">Stay Rules</h2>
          {rules.map((item) =>
            item.includes("_") ? (
              <div className="pb-4">• {removeHypen(item)}</div>
            ) : null
          )}
          {custom.map((item) => (
            <div className="pb-4">• {removeHypen(item)}</div>
          ))}
        </div>
      ) : rules?.length != 0 ? (
        <div className="border-b pb-6 mb-6">
          <h2 className="text-xl font-medium mb-6">Stay Rules</h2>
          {rules.map((item) => (
            <div className="pb-4">• {removeHypen(item)}</div>
          ))}
        </div>
      ) : custom?.length != 0 ? (
        <div className="border-b pb-6 mb-6">
          <h2 className="text-xl font-medium mb-6">Stay Rules</h2>
          {custom.map((item) => (
            <div className="pb-4">• {removeHypen(item)}</div>
          ))}
        </div>
      ) : null}
    </>
  );
}

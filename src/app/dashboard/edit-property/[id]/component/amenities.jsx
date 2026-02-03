"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";

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
export function Amenities({ formData, updateFormData }) {
  const [amenities, setAmenities] = useState([
    // Standout Amenities
    {
      id: "pool",
      title: "Pool",
      icon: Pool,
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
      title: "Exercise equip.",
      icon: Dumbbell,
      category: "standout",
      selected: false,
    },
    {
      id: "lake",
      title: "Lake access",
      icon: Waves,
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

    // Safety Items
    {
      id: "smoke-alarm",
      title: "Smoke alarm",
      icon: AlertOctagon,
      category: "safety",
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

    // Guest Favorites
    {
      id: "wifi",
      title: "Wifi",
      icon: Wifi,
      category: "favorites",
      selected: false,
    },
    { id: "tv", title: "TV", icon: Tv, category: "favorites", selected: false },
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
  ]);

  const toggleAmenity = useCallback(
    (id) => {
      setAmenities((prevAmenities) => {
        const updatedAmenities = prevAmenities.map((amenity) =>
          amenity.id === id
            ? { ...amenity, selected: !amenity.selected }
            : amenity,
        );

        // Update form data immediately after updating amenities
        const selectedAmenities = updatedAmenities
          .filter((amenity) => amenity.selected)
          .map((amenity) => amenity.id);

        updateFormData({ amenities: selectedAmenities });

        return updatedAmenities;
      });
    },
    [updateFormData],
  );

  // Initialize amenities based on formData
  useEffect(() => {
    setAmenities((prevAmenities) =>
      prevAmenities.map((amenity) => ({
        ...amenity,
        selected: formData?.amenities?.includes(amenity?.id),
      })),
    );
  }, [formData?.amenities]);

  // Memoize filtered amenities
  const standoutAmenities = useMemo(
    () => amenities.filter((amenity) => amenity.category === "standout"),
    [amenities],
  );
  const safetyAmenities = useMemo(
    () => amenities.filter((amenity) => amenity.category === "safety"),
    [amenities],
  );
  const favoriteAmenities = useMemo(
    () => amenities.filter((amenity) => amenity.category === "favorites"),
    [amenities],
  );

  const renderAmenityCards = useCallback(
    (amenityList) =>
      amenityList.map((amenity) => {
        const Icon = amenity.icon;
        return (
          <Card
            key={amenity.id}
            className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
              amenity.selected ? "border-primary" : ""
            }`}
            onClick={() => toggleAmenity(amenity.id)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-secondary">
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-medium">{amenity.title}</span>
            </div>
          </Card>
        );
      }),
    [toggleAmenity],
  );

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className=" bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Amenities
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div className="space-y-8 mx-auto container max-w-5xl">
              <section>
                <h2 className="text-base font-medium mb-4">
                  Do you have any standout amenities?
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderAmenityCards(standoutAmenities)}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">
                  Do you have any of these safety items?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderAmenityCards(safetyAmenities)}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">
                  What about these guest favourites?
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderAmenityCards(favoriteAmenities)}
                </div>
              </section>
            </div>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

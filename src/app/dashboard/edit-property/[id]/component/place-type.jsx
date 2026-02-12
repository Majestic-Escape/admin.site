"use client";

import { use, useEffect, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TextReveal } from "@/components/text-reveal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, DoorOpenIcon as Door } from "lucide-react";
import { Label } from "@/components/ui/label";

const placeTypes = [
  {
    id: "entire",
    title: "An entire place",
    description: "Guests have the whole place to themselves.",
    icon: <Home className="h-6 w-6" />,
  },
  {
    id: "room",
    title: "A room",
    description:
      "Guests have their own room in a home, plus access to shared spaces.",
    icon: <Door className="h-6 w-6" />,
  },
];
export function PlaceType({ formData, updateFormData }) {
  const selectedType = formData?.placeType || "";

  const handlePlaceTypeChange = (value) => {
    updateFormData({ placeType: value });

    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log("placeType updated to:", value);
    }
  };
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className=" bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Place Type
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <RadioGroup
              value={selectedType}
              onValueChange={handlePlaceTypeChange}
              className="space-y-4"
            >
              {placeTypes.map((type) => (
                <div
                  key={type.id}
                  className={`cursor-pointer rounded-lg border p-4 md:h-24 transition-colors hover:border-gray-400 ${
                    selectedType === type.id
                      ? "border-2 border-primaryGreen bg-gray-50"
                      : "border-gray-200"
                  }`}
                  onClick={() => handlePlaceTypeChange(type.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={type.id}
                          id={type.id}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={type.id}
                          className="text-lg font-bricolage leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {type.title}
                        </Label>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        {type.description}
                      </p>
                    </div>
                    <div className="text-gray-500">{type.icon}</div>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

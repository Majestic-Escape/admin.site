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
import { Label } from "@/components/ui/label";
const propertyTypes = [
  { id: "house", label: "House", icon: "🏠" },
  { id: "apartment", label: "Apartment", icon: "🏢" },
  { id: "guesthouse", label: "Guesthouse", icon: "🏡" },
  { id: "hotel", label: "Hotel", icon: "🏨" },
  { id: "cabin", label: "Cabin", icon: "🌳" },
  { id: "villa", label: "Villa", icon: "🏛️" },
  { id: "cottage", label: "Cottage", icon: "🏚️" },
  { id: "bungalow", label: "Bungalow", icon: "🏘️" },
  { id: "townhouse", label: "Townhouse", icon: "🏪" },
  { id: "condo", label: "Condo", icon: "🏙️" },
  { id: "treehouse", label: "Treehouse", icon: "🌴" },
  { id: "farmhouse", label: "Farmhouse", icon: "🚜" },
  { id: "houseboat", label: "Houseboat", icon: "⛵" },
  { id: "yurt", label: "Yurt", icon: "⛺" },
  { id: "dome", label: "Dome house", icon: "🏠" },
  { id: "castle", label: "Castle", icon: "🏰" },
  { id: "lighthouse", label: "Lighthouse", icon: "🗼" },
  { id: "windmill", label: "Windmill", icon: "🏔️" },
  { id: "cave", label: "Cave", icon: "🕳️" },
  { id: "container", label: "Container", icon: "📦" },
  { id: "camper", label: "Camper/RV", icon: "🚐" },
  { id: "barn", label: "Barn", icon: "🏚️" },
  { id: "boat", label: "Boat", icon: "🚤" },
  { id: "tiny_house", label: "Tiny house", icon: "🏠" },
  { id: "wedding", label: "Wedding Stay", icon: "💒" },
  { id: "tent", label: "Tent", icon: "⛺" },
  { id: "woman", label: "Woman Stay", icon: "👩🏻" },
];

export function PropertyType({ formData, updateFormData }) {
  const propertyType = formData?.propertyType || "";
  const [isOpen, setIsOpen] = useState(true);
  const handleChange = (value) => {
    updateFormData({ propertyType: value });
    if (process.env.NEXT_PUBLIC_ENV === "dev") {
      console.log("Selected Property Type:", value);
    }
  };
  return (
    <Accordion
      type="single"
      collapsible
      value={isOpen ? "item" : ""}
      onValueChange={(value) => setIsOpen(value === "item")}
      className="w-full"
    >
      <AccordionItem
        value={`item`}
        className=" bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Property Type
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <ScrollArea className="w-full rounded-md border p-4">
              <RadioGroup
                value={propertyType}
                onValueChange={handleChange}
                className="grid md:grid-cols-5 m-2 grid-cols-2 gap-4"
              >
                {propertyTypes.map((type) => (
                  <div key={type.id} className="relative">
                    <RadioGroupItem
                      value={type.id}
                      id={type.id}
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor={type.id}
                      className={`${
                        type.id === propertyType
                          ? "ring-primaryGreen ring-2"
                          : ""
                      } flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer hover:border-brightGreen peer-checked:border-brightGreen peer-checked:bg-brightGreen/10`}
                    >
                      <span className="text-4xl mb-2">{type.icon}</span>
                      <span className="font-medium font-bricolage text-absoluteDark text-center">
                        {type.label}
                      </span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </ScrollArea>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

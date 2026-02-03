"use client";

import { use, useEffect, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TextReveal } from "@/components/text-reveal";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, DoorOpenIcon as Door } from "lucide-react";
import { Label } from "@/components/ui/label";

export function BasicDetails({ formData, updateFormData }) {
  // 🔥 Get values directly from formData with defaults
  const guests = formData?.guests ?? 1;
  const bedrooms = formData?.bedrooms ?? 1;
  const beds = formData?.beds ?? 1;
  const bathrooms = formData?.bathrooms ?? 1;

  // 🔥 Generic handlers that update parent directly
  const handleIncrement = (key) => {
    const currentValue = formData?.[key] ?? 1;
    const newValue = currentValue === null ? 1 : currentValue + 1;
    updateFormData({ [key]: newValue });
  };

  const handleDecrement = (key) => {
    const currentValue = formData?.[key] ?? 1;
    const newValue = currentValue === null ? 1 : Math.max(1, currentValue - 1);
    updateFormData({ [key]: newValue });
  };

  const handleNumericChange = (e, key) => {
    const val = e.target.value;
    if (val === "") {
      updateFormData({ [key]: null });
    } else {
      const num = Number(val);
      if (!isNaN(num)) {
        updateFormData({ [key]: num });
      }
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className="bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Basic Details
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div className="pt-4 md:pt-0 grid grid-cols-1 gap-4">
              {/* Guests Input */}
              <div className="flex justify-between items-center">
                <Label htmlFor="guests" className="text-lg text-absoluteDark">
                  Max guests
                </Label>
                <div className="flex items-center mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDecrement("guests")}
                    disabled={guests === null || guests <= 1}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>

                  <Input
                    id="guests"
                    type="number"
                    value={guests === null ? "" : guests}
                    onChange={(e) => handleNumericChange(e, "guests")}
                    className="w-16 mx-2 no-spinner border-absoluteDark text-center"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleIncrement("guests")}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <hr className="my-1 md:my-2" />

              {/* Bedrooms Input */}
              <div className="flex justify-between items-center">
                <Label htmlFor="bedrooms" className="text-lg text-absoluteDark">
                  Bedrooms
                </Label>
                <div className="flex items-center mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDecrement("bedrooms")}
                    disabled={bedrooms === null || bedrooms <= 1}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>

                  <Input
                    id="bedrooms"
                    type="number"
                    value={bedrooms === null ? "" : bedrooms}
                    onChange={(e) => handleNumericChange(e, "bedrooms")}
                    className="w-16 mx-2 no-spinner border-absoluteDark text-center"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleIncrement("bedrooms")}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <hr className="my-1 md:my-2" />

              {/* Beds Input */}
              <div className="flex justify-between items-center">
                <Label htmlFor="beds" className="text-lg text-absoluteDark">
                  Beds
                </Label>
                <div className="flex items-center mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDecrement("beds")}
                    disabled={beds === null || beds <= 1}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>

                  <Input
                    id="beds"
                    type="number"
                    value={beds === null ? "" : beds}
                    onChange={(e) => handleNumericChange(e, "beds")}
                    className="w-16 mx-2 no-spinner border-absoluteDark text-center"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleIncrement("beds")}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <hr className="my-1 md:my-2" />

              {/* Bathrooms Input */}
              <div className="flex justify-between items-center">
                <Label
                  htmlFor="bathrooms"
                  className="text-lg text-absoluteDark"
                >
                  Bathroom
                </Label>
                <div className="flex items-center mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDecrement("bathrooms")}
                    disabled={bathrooms === null || bathrooms <= 1}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>

                  <Input
                    id="bathrooms"
                    type="number"
                    value={bathrooms === null ? "" : bathrooms}
                    onChange={(e) => handleNumericChange(e, "bathrooms")}
                    className="w-16 mx-2 no-spinner border-absoluteDark text-center"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleIncrement("bathrooms")}
                    className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

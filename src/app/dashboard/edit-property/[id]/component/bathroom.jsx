"use client";

import { use, useEffect, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { TextReveal } from "@/components/text-reveal";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, DoorOpenIcon as Door } from "lucide-react";
import { Label } from "@/components/ui/label";

export function Bathroom({ formData, updateFormData }) {
  // 🔥 Define bathroom types configuration (static data)
  const BATHROOM_TYPES = [
    {
      id: "private",
      title: "Private and attached",
      description: "It's connected to the guest's room and is just for them.",
    },
    {
      id: "dedicated",
      title: "Dedicated",
      description:
        "It's private, but accessed via a shared space, such as a hallway.",
    },
    {
      id: "shared",
      title: "Shared",
      description: "It's shared with other people.",
    },
  ];

  // 🔥 Get bathroom types directly from formData with defaults
  const bathroomTypes = formData?.bathroomTypes || {
    private: 0,
    dedicated: 0,
    shared: 0,
  };

  const MAX_BATHROOMS = Number(formData?.bathrooms || 0);

  // 🔥 Calculate total selected directly from formData
  const totalSelected = Object.values(bathroomTypes).reduce(
    (sum, count) => sum + count,
    0,
  );

  // 🔥 Update parent directly when count changes
  const updateCount = (id, increment) => {
    const currentCount = bathroomTypes[id] || 0;

    // Block increment if limit reached
    if (increment && totalSelected >= MAX_BATHROOMS) {
      return;
    }

    const newCount = Math.max(0, currentCount + (increment ? 1 : -1));

    // Update parent directly
    updateFormData({
      bathroomTypes: {
        ...bathroomTypes,
        [id]: newCount,
      },
    });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className="bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Bathroom Count
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div className="space-y-4">
              {BATHROOM_TYPES.map((bathroom) => {
                const count = bathroomTypes[bathroom.id] || 0;

                return (
                  <Card key={bathroom.id} className="p-6">
                    <div className="flex justify-between items-center">
                      <div className="space-y-1">
                        <h3 className="font-medium">{bathroom.title}</h3>
                        <p className="text-muted-foreground text-sm">
                          {bathroom.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateCount(bathroom.id, false)}
                          className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                          disabled={count === 0}
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <span className="text-lg w-4 text-center">{count}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => updateCount(bathroom.id, true)}
                          disabled={totalSelected >= MAX_BATHROOMS}
                          className="transition-all h-9 w-9 bg-gray-50 border border-absoluteDark rounded-full duration-200 ease-in-out"
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

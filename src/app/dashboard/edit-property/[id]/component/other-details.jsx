"use client";

import { use, useEffect, useState } from "react";

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

export function Other({ formData, updateFormData }) {
  const [options, setOptions] = useState([
    {
      id: "self-check-in",
      title: "Self Check in",
      icon: Key,
      selected: true,
    },
    {
      id: "me",
      title: "Me",
      icon: User,
      selected: false,
    },
    {
      id: "family",
      title: "My family",
      icon: Users,
      selected: false,
    },
    {
      id: "guests",
      title: "Other guests",
      icon: UsersRound,
      selected: false,
    },
    {
      id: "flatmates",
      title: "Flatmates/\nhousemates",
      icon: Users2,
      selected: false,
    },
  ]);

  useEffect(() => {
    // Initialize options based on formData
    if (formData?.occupancy) {
      setOptions(
        options.map((option) => ({
          ...option,
          selected: formData?.occupancy?.includes(option?.id),
        })),
      );
    }
  }, [formData?.occupancy]);

  const toggleOption = (id) => {
    const newOptions = options.map((option) =>
      option.id === id ? { ...option, selected: !option.selected } : option,
    );
    setOptions(newOptions);

    // Update formData
    const selectedOccupancy = newOptions
      .filter((option) => option.selected)
      .map((option) => option.id);
    updateFormData({ occupancy: selectedOccupancy });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className=" bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Other Details
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {options.map((option) => {
                const Icon = option.icon;
                return (
                  <Card
                    key={option.id}
                    className={`p-6 cursor-pointer transition-colors hover:bg-accent ${
                      option.selected ? "border-primary" : ""
                    }`}
                    onClick={() => toggleOption(option.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-secondary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium whitespace-pre-line">
                        {option.title}
                      </span>
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

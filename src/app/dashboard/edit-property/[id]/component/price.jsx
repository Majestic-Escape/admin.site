"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Zap, Bolt } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Users, User, UsersRound, Users2, Key } from "lucide-react";
import { TextReveal } from "@/components/text-reveal";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, DoorOpenIcon as Door } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function Price({ formData, updateFormData }) {
  const basePrice = formData?.basePrice || "";

  const handleChange = (e) => {
    updateFormData({
      basePrice: e.target.value,
    });
  };
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className=" bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Per Night Price
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div>
              <h3 className="text-center text-stone text-lg  mb-2">
                Set your price (per night).
              </h3>
              <div className="flex justify-center items-center  space-x-2">
                <span className="text-4xl mr-2 font-medium">₹</span>
                <input
                  id="basePrice"
                  type="number"
                  value={basePrice}
                  onChange={(e) => {
                    setBasePrice(e.target.value);
                    handleChange(e);
                  }}
                  placeholder="Base price / night"
                  className="max-w-[300px] border border-gray-300 px-8 focus:ring-primaryGreen focus:ouline-none mt-4 rounded-md ouline-none text-xl py-4 text-absoluteDark no-spinner"
                />
              </div>
              <div className="text-center text-sm pt-4 text-muted-foreground">
                Minimum amount allowed is ₹501.
              </div>
            </div>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

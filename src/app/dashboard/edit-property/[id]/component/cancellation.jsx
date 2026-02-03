"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Zap, Bolt } from "lucide-react";
import { Users, User, UsersRound, Users2, Key } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TextReveal } from "@/components/text-reveal";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Home, DoorOpenIcon as Door } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
export function Cancellation({ formData, updateFormData }) {
  // 🔥 Get cancellationType directly from formData with defaults
  const cancellationType = {
    moderate: formData?.cancellationType?.moderate ?? true,
    flexible: formData?.cancellationType?.flexible ?? false,
    strict: formData?.cancellationType?.strict ?? false,
  };

  const [openDialog, setOpenDialog] = useState({
    moderate: false,
    flexible: false,
    strict: false,
  });

  // 🔥 Handle changes by updating parent directly
  const handleCancellationTypeChange = (type) => {
    updateFormData({
      cancellationType: {
        moderate: type === "moderate",
        flexible: type === "flexible",
        strict: type === "strict",
      },
    });
  };

  // 🔥 Get active type for RadioGroup value
  const activeType = cancellationType.moderate
    ? "moderate"
    : cancellationType.flexible
      ? "flexible"
      : "strict";

  const bookingInfo = {
    manual: {
      title: "Manual Booking",
      description: "Get complete control over who books your space",
    },
    instantBook: {
      title: "Instant Book",
      description: "Let guests book immediately",
    },
    flashBook: {
      title: "Flash Booking",
      description: "Premium instant booking experience",
    },
  };

  const InfoDialog = ({ type }) => (
    <Dialog
      open={openDialog[type]}
      onOpenChange={(isOpen) => {
        setOpenDialog((prev) => ({ ...prev, [type]: isOpen }));
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bookingInfo[type].title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {bookingInfo[type].description}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className="bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Cancellation Policy
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            {/* 🔥 Fix RadioGroup value to match actual types */}
            <RadioGroup
              value={activeType}
              onValueChange={handleCancellationTypeChange}
            >
              <div className="space-y-4">
                <Card
                  className={`cursor-pointer transition-colors ${
                    cancellationType.moderate
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "hover:border-primary"
                  }`}
                  onClick={() => handleCancellationTypeChange("moderate")}
                >
                  <CardContent className="flex items-start gap-4 p-6">
                    {/* 🔥 Fix RadioGroupItem value to match activeType */}
                    <RadioGroupItem
                      value="moderate"
                      id="moderate"
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="hidden md:block md:h-5 md:w-5" />
                        <h3 className="font-medium">
                          Set Moderate Cancellation Policy
                        </h3>
                        <InfoDialog type="manual" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Guests must cancel booking 7 days before check-in date.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card
                    className={`cursor-pointer transition-colors ${
                      cancellationType.flexible
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "hover:border-primary"
                    }`}
                    onClick={() => handleCancellationTypeChange("flexible")}
                  >
                    <CardContent className="flex items-start gap-4 p-6">
                      <Checkbox
                        checked={cancellationType.flexible}
                        onCheckedChange={() =>
                          handleCancellationTypeChange("flexible")
                        }
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Zap className="hidden md:block md:h-5 md:w-5" />
                          <h3 className="font-medium">
                            Set Flexible Cancellation Policy
                          </h3>
                          <InfoDialog type="instantBook" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Guests can cancel booking 24 hours before check-in
                          date.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer transition-colors ${
                      cancellationType.strict
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "hover:border-primary"
                    }`}
                    onClick={() => handleCancellationTypeChange("strict")}
                  >
                    <CardContent className="flex items-start gap-4 p-6">
                      <Checkbox
                        checked={cancellationType.strict}
                        onCheckedChange={() =>
                          handleCancellationTypeChange("strict")
                        }
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Bolt className="hidden md:block md:h-5 md:w-5" />
                          <h3 className="font-medium">
                            Set Strict Cancellation Policy
                          </h3>
                          <InfoDialog type="flashBook" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Guests cannot cancel booking once confirmed.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </RadioGroup>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

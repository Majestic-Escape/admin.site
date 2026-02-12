"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
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

export function Time({ formData, updateFormData }) {
  //  Get times directly from formData with defaults
  const checkinTime = formData?.checkinTime || "11";
  const checkoutTime = formData?.checkoutTime || "14";

  const numbersList = Array.from({ length: 11 }, (_, i) => i + 1);

  //  Handle changes by updating parent directly
  const handleCheckinTimeChange = (value) => {
    updateFormData({ checkinTime: value });
  };

  const handleCheckoutTimeChange = (value) => {
    updateFormData({ checkoutTime: value });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className="bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Property Checkin & Checkout Timing
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <Card className="p-6 space-y-6 mb-8">
              <div className="space-y-4">
                <div className="flex justify-between space-y-2">
                  <div>
                    <Label
                      htmlFor="checkin"
                      className="text-base font-semibold"
                    >
                      Check-In Time
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      What time should the guest arrive
                    </p>
                  </div>
                  <div>
                    <div className="mt-2 flex gap-2">
                      <select
                        className="w-full mt-2 border border-gray-300 rounded-md p-2"
                        value={checkinTime}
                        onChange={(e) =>
                          handleCheckinTimeChange(e.target.value)
                        }
                      >
                        <option value="">Select time</option>
                        <option value="0">12 am</option>
                        {numbersList.map((item) => (
                          <option key={`checkin-am-${item}`} value={item}>
                            {item} am
                          </option>
                        ))}
                        <option value="12">12 pm</option>
                        {numbersList.map((item) => (
                          <option
                            key={`checkin-pm-${item}`}
                            value={Number(item) + 12}
                          >
                            {item} pm
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            <Card className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between space-y-2">
                  <div>
                    <Label
                      htmlFor="checkout"
                      className="text-base font-semibold"
                    >
                      Check-Out Time
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      What time should the guest leave
                    </p>
                  </div>
                  <div>
                    <div className="mt-2 flex gap-2">
                      <select
                        className="w-full mt-2 border border-gray-300 rounded-md p-2"
                        value={checkoutTime}
                        onChange={(e) =>
                          handleCheckoutTimeChange(e.target.value)
                        }
                      >
                        <option value="">Select time</option>
                        <option value="0">12 am</option>
                        {numbersList.map((item) => (
                          <option key={`checkout-am-${item}`} value={item}>
                            {item} am
                          </option>
                        ))}
                        <option value="12">12 pm</option>
                        {numbersList.map((item) => (
                          <option
                            key={`checkout-pm-${item}`}
                            value={Number(item) + 12}
                          >
                            {item} pm
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

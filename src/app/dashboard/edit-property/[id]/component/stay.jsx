"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Zap, Bolt } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Info } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const defaultHouseRules = [
  { id: "no_smoking", label: "No smoking" },
  { id: "no_parties", label: "No parties or events" },
  { id: "no_pets", label: "No pets" },
  { id: "quiet_hours", label: "Quiet hours from 10 PM to 7 AM" },
];
export function Stay({ formData, updateFormData }) {
  // 🔥 Get values directly from formData with defaults
  const selectedRules = formData?.selectedRules || [];
  const customRules = formData?.customRules || [];
  const [newRule, setNewRule] = useState("");

  const handleRuleChange = (ruleId) => {
    const newSelectedRules = selectedRules?.includes(ruleId)
      ? selectedRules.filter((id) => id !== ruleId)
      : [...selectedRules, ruleId];

    updateFormData({ selectedRules: newSelectedRules });
  };

  const addCustomRule = () => {
    if (newRule.trim()) {
      const newCustomRules = [...customRules, newRule.trim()];
      updateFormData({ customRules: newCustomRules });
      setNewRule("");
    }
  };

  const removeCustomRule = (index) => {
    const newCustomRules = customRules.filter((_, i) => i !== index);
    updateFormData({ customRules: newCustomRules });
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className="bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Stay Rule
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div className="pt-4 md:pt-0">
              <h3 className="text-base text-absoluteDark mb-2 font-medium font-bricolage">
                Stay Rules
              </h3>
              <div className="space-y-2">
                {defaultHouseRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex text-stone text-sm items-center space-x-2"
                  >
                    <Checkbox
                      id={rule.id}
                      checked={selectedRules?.includes(rule?.id)}
                      onCheckedChange={() => handleRuleChange(rule.id)}
                    />
                    <Label className="text-sm font-normal" htmlFor={rule.id}>
                      {rule.label}
                    </Label>
                  </div>
                ))}
                <div className="pt-6">
                  <Label
                    htmlFor="newRule"
                    className="text-base text-absoluteDark font-bricolage mt-4 mb-2"
                  >
                    Add custom rule
                  </Label>
                  <div className="flex flex-col space-y-3 mt-1">
                    <Textarea
                      id="newRule"
                      value={newRule}
                      className="text-sm"
                      onChange={(e) => setNewRule(e.target.value)}
                      maxLength={50}
                      placeholder="Enter a custom rule"
                    />
                    <div className="text-sm text-muted-foreground text-right">
                      (max. 50 characters) {newRule.length}/{50}
                    </div>

                    <Button
                      className="w-32 bg-primaryGreen hover:bg-brightGreen h-10"
                      onClick={addCustomRule}
                      type="button"
                      disabled={!newRule.trim()}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                {customRules.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <h4 className="text-base font-bricolage text-absoluteDark font-medium">
                      Custom Rules:
                    </h4>
                    <ul className="list-disc list-inside">
                      {customRules.map((rule, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-stone font-normal mb-4">
                            {rule}
                          </span>
                          <button
                            onClick={() => removeCustomRule(index)}
                            className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </TextReveal>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

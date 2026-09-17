"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Zap, Bolt } from "lucide-react";
import { toast } from "sonner";
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
export function Safety({ formData, updateFormData }) {
  // 🔥 Get safetyFeatures directly from formData with defaults
  const safetyFeatures = formData?.safetyFeatures || {
    exteriorCamera: { checked: false, description: "" },
    noiseMonitor: { checked: false, description: "" },
    weapons: { checked: false, description: "" },
  };

  // 🔥 Only keep dialog-related local state
  const [activeDialog, setActiveDialog] = useState(null);
  const [tempDescription, setTempDescription] = useState("");

  const handleCheckboxChange = (feature, checked) => {
    if (checked) {
      setActiveDialog(feature);
      setTempDescription(safetyFeatures[feature].description);
    } else {
      // 🔥 Update parent directly when unchecking
      const updatedFeatures = {
        ...safetyFeatures,
        [feature]: { checked: false, description: "" },
      };
      updateFormData({ safetyFeatures: updatedFeatures });
    }
  };

  const handleDialogClose = () => {
    if (activeDialog) {
      const updatedFeatures = {
        ...safetyFeatures,
        [activeDialog]: { checked: false, description: tempDescription },
      };
      updateFormData({ safetyFeatures: updatedFeatures });
    }
    setActiveDialog(null);
  };

  const handleContinue = () => {
    if (tempDescription.trim().length < 10) {
      toast.error("Please add at least 10 characters.");
      return;
    }

    if (activeDialog) {
      const updatedFeatures = {
        ...safetyFeatures,
        [activeDialog]: { checked: true, description: tempDescription },
      };
      updateFormData({ safetyFeatures: updatedFeatures });
      setActiveDialog(null);
    }
  };

  const dialogContent = {
    exteriorCamera: {
      title: "Tell guests about your exterior security cameras",
      description:
        "Describe the area that each camera monitors, such as the back garden or pool.",
    },
    noiseMonitor: {
      title: "Tell guests about your noise monitoring system",
      description:
        "Describe where the noise monitors are located and how they're used.",
    },
    weapons: {
      title: "Tell guests about weapons on the property",
      description: "Describe what weapons are present and how they're secured.",
    },
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className="bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Safety Details
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <h2 className="text-sm text-stone">
                  Does your place have any of these?
                </h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>These details help guests make informed decisions</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="camera"
                    checked={safetyFeatures.exteriorCamera.checked}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("exteriorCamera", checked)
                    }
                  />
                  <label
                    htmlFor="camera"
                    className="text-sm text-stone leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Exterior security camera present
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="noise"
                    checked={safetyFeatures.noiseMonitor.checked}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("noiseMonitor", checked)
                    }
                  />
                  <label
                    htmlFor="noise"
                    className="text-sm text-stone leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Noise decibel monitor present
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="weapons"
                    checked={safetyFeatures.weapons.checked}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange("weapons", checked)
                    }
                  />
                  <label
                    htmlFor="weapons"
                    className="text-sm text-stone leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Weapon(s) on the property
                  </label>
                </div>
              </div>
            </div>
          </TextReveal>

          <Dialog
            open={activeDialog !== null}
            onOpenChange={() => handleDialogClose()}
          >
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>
                    {activeDialog && dialogContent[activeDialog].title}
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  {activeDialog && dialogContent[activeDialog].description}
                </p>
                <div className="relative">
                  <Textarea
                    value={tempDescription}
                    onChange={(e) =>
                      setTempDescription(e.target.value.slice(0, 300))
                    }
                    className="min-h-[100px] resize-none"
                    placeholder="Type your description here..."
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                    {tempDescription.length} / 300 characters
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleContinue}>Continue</Button>
              </div>
            </DialogContent>
          </Dialog>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

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
import {
  PocketIcon as Pool,
  Bath,
  Umbrella,
  Flame,
  UtensilsCrossed,
  Table,
  FlameIcon as Fireplace,
  Piano,
  Dumbbell,
  Waves,
  BeanIcon as Beach,
  MountainSnowIcon as Ski,
  ShowerHeadIcon as Shower,
  AlertOctagon,
  AmbulanceIcon as FirstAid,
  FireExtinguisher,
  AlertCircle,
  Wifi,
  Tv,
  UtensilsIcon,
  WashingMachineIcon as Washing,
  Car,
  CarTaxiFront,
  Snowflake,
  Briefcase,
} from "lucide-react";
export function Title({ formData, updateFormData }) {
  const [title, setTitle] = useState(
    formData != undefined ? formData?.title : "",
  );
  const [description, setDescription] = useState(
    formData != undefined ? formData?.description : "",
  );
  useEffect(() => {
    if (formData?.title != undefined && formData?.title !== title) {
      setTitle(formData?.title);
    }
    if (
      formData?.description != undefined &&
      formData?.description != description
    ) {
      setDescription(formData?.description);
    }
  }, [formData?.title, formData?.description]);
  const maxTitleLength = 72;
  const maxDescriptionLength = 500;
  useEffect(() => {
    updateFormData({ title, description });
  }, [title, description]);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={`item`}
        className=" bg-white border border-[#E5E7EB] rounded-lg mb-4 overflow-hidden"
      >
        <AccordionTrigger className="text-lg bg-muted/40 font-medium text-[#111827] hover:no-underline px-6 py-4">
          Property Title & Description
        </AccordionTrigger>
        <AccordionContent className="text-base text-[#6B7280] px-6 py-4">
          <TextReveal>
            <Card className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-semibold">
                    Create your title
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Catch guests' attention with a listing title that highlights
                    what makes your place special.
                  </p>
                </div>
                <div className="space-y-2">
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={maxTitleLength}
                    className="text-sm h-12 md:text-base"
                    placeholder="Enter your listing title"
                  />
                  <div className="text-sm text-muted-foreground text-right">
                    (min. 3 characters) {title?.length}/{maxTitleLength}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-base font-semibold"
                  >
                    Create your description
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Share what makes your place unique and why guests will love
                    staying there.
                  </p>
                </div>
                <div className="space-y-2">
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={maxDescriptionLength}
                    rows={4}
                    className="resize-none p-4 text-sm md:text-base"
                    placeholder="Tell guests what makes your place special"
                  />
                  <div className="text-sm text-muted-foreground text-right">
                    (min. 16 characters) {description?.length}/
                    {maxDescriptionLength}
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

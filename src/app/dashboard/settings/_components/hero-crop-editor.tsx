"use client";
/* eslint-disable @next/next/no-img-element */
// Choosing which part of an image the banner shows (WCAG 2.5.7: dragging is
// one way, never the only one). The frame moves along the one axis the image
// overflows: drag the frame itself, tap/click where it should be, use the
// slider (arrow keys, Page Up/Down, Home/End) or "Centre". On touch screens
// the image scrolls the page like any other: only the frame captures a drag,
// and a tap (not the start of a scroll) is what moves it. The frame is
// computed with the server's own crop function, so what is framed is what
// gets prepared.
import { useRef, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { MoveHorizontal, MoveVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cropAxis, cropRegion, HERO_SLOTS, type Focal, type HeroSlot } from "@/lib/hero-banner";
import { cn } from "@/lib/utils";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function HeroCropEditor({
  slot,
  url,
  width,
  height,
  focal,
  onFocalChange,
  disabled = false,
  labelId,
}: {
  slot: HeroSlot;
  url: string;
  width: number;
  height: number;
  focal: Focal;
  onFocalChange: (f: Focal) => void;
  disabled?: boolean;
  labelId: string;
}) {
  const axis = cropAxis(width, height, slot);
  const region = cropRegion(width, height, slot, focal);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; offset: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Positions along the axis, as fractions of the whole image.
  const start = axis === "x" ? region.left / width : axis === "y" ? region.top / height : 0;
  const size = axis === "x" ? region.width / width : axis === "y" ? region.height / height : 1;
  const travel = 1 - size; // how far the frame can move
  const position = travel > 0 ? clamp01(start / travel) : 0.5; // 0 = left/top edge, 1 = right/bottom

  const moveTo = (p: number) => {
    const q = clamp01(p);
    const centre = q * travel + size / 2;
    onFocalChange(axis === "x" ? { x: centre, y: focal.y } : { x: focal.x, y: centre });
  };
  const fractionAt = (e: { clientX: number; clientY: number }) => {
    const r = areaRef.current?.getBoundingClientRect();
    if (!r || r.width === 0 || r.height === 0) return 0.5;
    return axis === "x" ? (e.clientX - r.left) / r.width : (e.clientY - r.top) / r.height;
  };
  // A tap/click outside the frame centres it there. `click` never follows a
  // scroll gesture, so scrolling past the image leaves the crop alone.
  const onAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!axis || disabled || travel <= 0) return;
    const f = fractionAt(e);
    if (f >= start && f <= start + size) return; // on the frame: that's a drag's business
    moveTo((f - size / 2) / travel);
  };
  // Dragging the frame keeps the grab point under the pointer.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!axis || disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag.current = { id: e.pointerId, offset: fractionAt(e) - start };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.id !== e.pointerId || travel <= 0) return;
    moveTo((fractionAt(e) - drag.current.offset) / travel);
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current && drag.current.id === e.pointerId) {
      drag.current = null;
      setDragging(false);
    }
  };

  // The slider works in whole pixels of the crop's travel (at most 100
  // steps): every arrow key moves the crop, also when the image is only a
  // few dozen pixels larger than the box (1% steps would round back).
  const travelPx = axis === "x" ? width - region.width : axis === "y" ? height - region.height : 0;
  const offsetPx = axis === "x" ? region.left : axis === "y" ? region.top : 0;
  const steps = Math.max(1, Math.min(100, travelPx));
  const sliderValue = travelPx > 0 ? Math.round((offsetPx / travelPx) * steps) : 0;
  const moveToStep = (v: number) => {
    const px = Math.round((Math.min(steps, Math.max(0, v)) / steps) * travelPx);
    const whole = axis === "x" ? width : height;
    const part = axis === "x" ? region.width : region.height;
    const centre = (px + part / 2) / whole;
    onFocalChange(axis === "x" ? { x: centre, y: focal.y } : { x: focal.x, y: centre });
  };
  const centred = cropRegion(width, height, slot, { x: 0.5, y: 0.5 });
  const atCentre = axis === "x" ? region.left === centred.left : axis === "y" ? region.top === centred.top : true;

  const pct = Math.round(position * 100);
  const [from, to] = axis === "y" ? ["top", "bottom"] : ["left", "right"];
  const valueText = pct <= 1 ? `At the ${from} edge` : pct >= 99 ? `At the ${to} edge` : pct === 50 ? "Centred" : `${pct}% from the ${from}`;
  const box = HERO_SLOTS[slot].box;
  const Icon = axis === "y" ? MoveVertical : MoveHorizontal;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:items-start">
        {/* the whole image, the frame on it */}
        <div className="mx-auto w-full" style={{ maxWidth: `min(100%, calc(min(55vh, 460px) * ${width / height}))` }}>
          <div
            ref={areaRef}
            onClick={onAreaClick}
            className={cn("relative w-full select-none overflow-hidden rounded-md bg-gray-100", axis && !disabled && "cursor-pointer")}
            style={{ aspectRatio: `${width} / ${height}` }}
          >
            <img src={url} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full object-fill" />
            {axis && (
              <div
                aria-hidden="true"
                data-crop-frame=""
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className={cn(
                  "absolute flex touch-none items-center justify-center rounded-[3px] outline outline-2 outline-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]",
                  !disabled && (dragging ? "cursor-grabbing" : "cursor-grab"),
                  dragging && "outline-4",
                )}
                style={{ left: `${(region.left / width) * 100}%`, top: `${(region.top / height) * 100}%`, width: `${(region.width / width) * 100}%`, height: `${(region.height / height) * 100}%` }}
              >
                <span className="pointer-events-none flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                  <Icon className="h-3.5 w-3.5" /> Drag
                </span>
              </div>
            )}
          </div>
        </div>
        {/* what the banner will show */}
        <figure className="space-y-1">
          <div className={cn("relative w-full overflow-hidden rounded-md bg-gray-100", slot === "mobile" && "mx-auto max-w-[220px]")} style={{ aspectRatio: `${box[0]} / ${box[1]}` }}>
            <img
              src={url}
              alt=""
              draggable={false}
              className="absolute max-w-none"
              style={{
                width: `${(width / region.width) * 100}%`,
                height: `${(height / region.height) * 100}%`,
                left: `${-(region.left / region.width) * 100}%`,
                top: `${-(region.top / region.height) * 100}%`,
              }}
            />
          </div>
          <figcaption className="text-center text-xs text-gray-600">What the banner will show</figcaption>
        </figure>
      </div>

      {axis ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span id={labelId} className="text-sm font-medium text-gray-900">
              Crop position
            </span>
            <Button type="button" variant="ghost" size="sm" disabled={disabled || atCentre} onClick={() => moveTo(0.5)}>
              Centre
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-12 text-xs text-gray-600 capitalize" aria-hidden="true">
              {from}
            </span>
            <SliderPrimitive.Root
              value={[sliderValue]}
              min={0}
              max={steps}
              step={1}
              disabled={disabled}
              onValueChange={([v]) => moveToStep(v)}
              className="relative flex h-6 w-full touch-none select-none items-center"
            >
              <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-gray-200">
                <SliderPrimitive.Range className="absolute h-full bg-primaryGreen/40" />
              </SliderPrimitive.Track>
              <SliderPrimitive.Thumb
                aria-labelledby={labelId}
                aria-valuetext={valueText}
                className="block h-6 w-6 rounded-full border-2 border-primaryGreen bg-white shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryGreen focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              />
            </SliderPrimitive.Root>
            <span className="w-12 text-right text-xs text-gray-600 capitalize" aria-hidden="true">
              {to}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

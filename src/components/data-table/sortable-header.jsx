"use client";
// A column header that sorts server-side: none → ascending → descending → none.
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SortableHeader({ label, sortKey, sort, onSort, className, align = "left" }) {
  const active = sort?.sortKey === sortKey;
  const dir = active ? sort.sortDir : null;
  const Icon = dir === "asc" ? ArrowUp : dir === "desc" ? ArrowDown : ArrowUpDown;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-8 px-2 font-medium hover:bg-muted data-[active=true]:text-primaryGreen", align === "right" && "ml-auto -mr-2", className)}
      data-active={active || undefined}
      data-sort={dir || "none"}
      data-testid={`sort-${sortKey}`}
      aria-label={`Sort by ${label}${dir ? ` (${dir === "asc" ? "ascending" : "descending"})` : ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <Icon className={cn("ml-1.5 h-3.5 w-3.5", !active && "opacity-50")} aria-hidden="true" />
    </Button>
  );
}

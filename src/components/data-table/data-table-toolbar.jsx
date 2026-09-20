"use client";
// The row above every dashboard table: a debounced search box, the page's
// own filters (children) and a Reset that clears search, filters, sort and
// page in one go.
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function DataTableSearch({ value, onChange, placeholder = "Search…", className, delay = 300 }) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  const debounced = useDebouncedValue(draft, delay);
  useEffect(() => {
    if (debounced !== (value ?? "")) onChange(debounced);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cn("relative w-full md:max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
        data-testid="table-search"
      />
    </div>
  );
}

export function DataTableToolbar({ search, onSearchChange, searchPlaceholder, children, onReset, isDirty, resultCount, className }) {
  return (
    <div className={cn("mb-4 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center", className)} data-testid="data-table-toolbar">
      {onSearchChange ? <DataTableSearch value={search} onChange={onSearchChange} placeholder={searchPlaceholder} /> : null}
      {children}
      {onReset ? (
        <Button type="button" variant="ghost" size="sm" className={cn("h-9", !isDirty && "invisible")} onClick={onReset} data-testid="table-reset" aria-hidden={!isDirty}>
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          Reset
        </Button>
      ) : null}
      {typeof resultCount === "number" ? (
        <span className="text-sm text-muted-foreground md:ml-auto" data-testid="table-count">
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </span>
      ) : null}
    </div>
  );
}

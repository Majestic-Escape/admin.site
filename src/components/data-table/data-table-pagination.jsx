"use client";
// The footer every dashboard table shares: "Showing a–b of N", rows per
// page, first / previous / numbered pages / next / last. Server-side by
// design — it only knows page, pageSize and total.
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PAGE_SIZES } from "./use-list-params";

// 1 … 4 [5] 6 … 12 — at most 7 slots, ellipses where pages are skipped.
export function pageWindow(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i && sorted[i] - sorted[i - 1] > 1) out.push("…");
    out.push(sorted[i]);
  }
  return out;
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = PAGE_SIZES,
  isLoading = false,
  itemLabel = "entries",
  className,
}) {
  const safeTotal = Math.max(Number(total) || 0, 0);
  const totalPages = Math.max(Math.ceil(safeTotal / (pageSize || 1)), 1);
  const current = Math.min(Math.max(page || 1, 1), totalPages);
  const from = safeTotal === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, safeTotal);
  const go = (p) => {
    if (p < 1 || p > totalPages || p === current || isLoading) return;
    onPageChange(p);
  };
  return (
    <div className={cn("mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between", className)} data-testid="data-table-pagination" aria-busy={isLoading || undefined}>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span data-testid="pagination-summary">
          Showing {from}–{to} of {safeTotal} {itemLabel}
        </span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-8 w-[130px]" aria-label="Rows per page" data-testid="page-size">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizes.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <nav role="navigation" aria-label="Pagination" className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="First page" onClick={() => go(1)} disabled={current === 1 || isLoading} data-testid="page-first">
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" onClick={() => go(current - 1)} disabled={current === 1 || isLoading} data-testid="page-prev">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pageWindow(current, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-muted-foreground" aria-hidden="true">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === current ? "default" : "outline"}
              size="sm"
              className={cn("h-8 min-w-8 px-2", p === current && "bg-primaryGreen text-white hover:bg-brightGreen")}
              aria-current={p === current ? "page" : undefined}
              aria-label={`Page ${p}`}
              onClick={() => go(p)}
              disabled={isLoading}
              data-testid={`page-${p}`}
            >
              {p}
            </Button>
          ),
        )}
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" onClick={() => go(current + 1)} disabled={current >= totalPages || isLoading} data-testid="page-next">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Last page" onClick={() => go(totalPages)} disabled={current >= totalPages || isLoading} data-testid="page-last">
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </nav>
    </div>
  );
}

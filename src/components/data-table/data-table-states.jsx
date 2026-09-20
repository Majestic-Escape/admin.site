"use client";
// Empty and error rows shared by the dashboard tables.
import { TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function DataTableEmpty({ colSpan, message = "No results.", hint, onReset }) {
  return (
    <TableRow data-testid="table-empty">
      <TableCell colSpan={colSpan} className="h-24 text-center text-sm text-muted-foreground">
        <div>{message}</div>
        {hint ? <div className="mt-1 text-xs">{hint}</div> : null}
        {onReset ? (
          <Button type="button" variant="link" size="sm" className="mt-1 text-primaryGreen" onClick={onReset}>
            Clear filters
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

export function DataTableError({ colSpan, error, onRetry }) {
  return (
    <TableRow data-testid="table-error">
      <TableCell colSpan={colSpan} className="h-24 text-center text-sm text-red-600">
        <div>{error?.message || "Something went wrong while loading this table."}</div>
        {onRetry ? (
          <Button type="button" variant="link" size="sm" className="mt-1" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

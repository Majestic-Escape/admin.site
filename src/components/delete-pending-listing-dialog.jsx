"use client";
// Confirm + run the deletion of one or more *pending* listings (Batch A2).
// Deletions run strictly one after another (each is a multi-collection
// transaction plus object-storage cleanup on the backend), progress is
// shown, failures don't stop the rest, and the summary distinguishes
// deleted / skipped (not pending) / failed.
import * as React from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deletePendingListing } from "@/lib/admin-api";

export function isPendingListing(listing) {
  return listing?.status === "processing";
}

function photoNote(data) {
  if (!data || !data.photosFailed) return "";
  return ` ${data.photosFailed} photo${data.photosFailed === 1 ? "" : "s"} could not be removed and ${data.photosFailed === 1 ? "was" : "were"} logged for cleanup.`;
}

export default function DeletePendingListingDialog({ listings, skipped = 0, open, onOpenChange, onDeleted, onFinished }) {
  const [running, setRunning] = React.useState(false);
  const [progress, setProgress] = React.useState(null); // { index, total, title }
  const items = Array.isArray(listings) ? listings.filter(Boolean) : [];
  const single = items.length === 1;

  React.useEffect(() => {
    if (!open) {
      setRunning(false);
      setProgress(null);
    }
  }, [open]);

  const run = async (event) => {
    event?.preventDefault?.();
    if (running || !items.length) return;
    setRunning(true);
    const results = { deleted: [], failed: [], photosFailed: 0 };
    for (let i = 0; i < items.length; i++) {
      const listing = items[i];
      setProgress({ index: i + 1, total: items.length, title: listing.title || "Untitled listing" });
      try {
        const res = await deletePendingListing(listing._id);
        results.deleted.push({ listing, data: res.data });
        results.photosFailed += res.data?.photosFailed || 0;
        onDeleted?.(listing, res.data);
      } catch (err) {
        if (err?.status === 401) {
          setRunning(false);
          return; // adminFetch already sent the admin to sign in
        }
        results.failed.push({ listing, message: err?.message || "Deletion failed" });
      }
    }
    setRunning(false);
    onOpenChange(false);

    if (single) {
      if (results.deleted.length) {
        toast.success(`Listing deleted.${photoNote(results.deleted[0].data)}`);
      } else {
        toast.error(results.failed[0]?.message || "Deletion failed");
      }
    } else {
      const parts = [`Deleted ${results.deleted.length} pending listing${results.deleted.length === 1 ? "" : "s"}.`];
      if (skipped) parts.push(`${skipped} skipped (not pending).`);
      if (results.failed.length) parts.push(`${results.failed.length} failed: ${results.failed[0].message}`);
      if (results.photosFailed) parts.push(`${results.photosFailed} photo${results.photosFailed === 1 ? "" : "s"} logged for cleanup.`);
      (results.failed.length && !results.deleted.length ? toast.error : toast.success)(parts.join(" "));
    }
    onFinished?.(results);
  };

  return (
    <AlertDialog open={open} onOpenChange={(value) => !running && onOpenChange(value)}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{single ? "Delete pending listing?" : `Delete ${items.length} pending listings?`}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              {single ? (
                <p>
                  <span className="font-medium text-foreground">{items[0]?.title || "Untitled listing"}</span>
                  {items[0]?.hostEmail ? <span> · {items[0].hostEmail}</span> : null}
                </p>
              ) : (
                <ul className="max-h-40 list-disc overflow-y-auto pl-5">
                  {items.map((l) => (
                    <li key={l._id} className="text-foreground">
                      {l.title || "Untitled listing"}
                      {l.hostEmail ? <span className="text-muted-foreground"> · {l.hostEmail}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
              {skipped ? (
                <p>
                  {skipped} selected listing{skipped === 1 ? " is" : "s are"} not pending and will be skipped.
                </p>
              ) : null}
              <p>
                This removes the listing and its uploaded photos from Majestic Escape. This action cannot be undone from the
                admin panel. Active or delisted listings cannot be deleted here.
              </p>
              {progress ? (
                <p aria-live="polite" className="font-medium text-foreground">
                  Deleting {progress.index} of {progress.total} — {progress.title}…
                </p>
              ) : null}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={run}
            disabled={running || !items.length}
            aria-busy={running}
            className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600"
          >
            {running ? "Deleting…" : single ? "Delete listing" : `Delete ${items.length} listings`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

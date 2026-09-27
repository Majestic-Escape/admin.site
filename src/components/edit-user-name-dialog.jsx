"use client";
// Rename a user/host from the admin (Batch A2). Validation mirrors the
// backend rule (letters, spaces, dots, apostrophes, hyphens; ≤ 50; first
// name required). The values the dialog opened with are sent as `expected`
// so a stale page gets a 409 instead of silently overwriting someone
// else's change.
//
// Also the admin's own name (Settings → "Your name in Support Chat"): pass
// `save(next, expected)`, a `title`/`description`, and conflictMode="stay".
// "close" (default) is the Users grid / host profile behaviour: a 409 toasts,
// reports the server's name via onSaved(…, { stale: true }) and closes.
// "stay" keeps the dialog and the typed input, shows the name that is saved
// now, and makes that the new `expected` so a second Save goes through.
import * as React from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameUser } from "@/lib/admin-api";

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u;
const nameField = (label, { required }) => {
  let schema = z
    .string()
    .max(50, `${label} must be 50 characters or fewer`)
    .refine((v) => v === "" || NAME_RE.test(v), `${label} may only contain letters, spaces, dots, apostrophes and hyphens`);
  if (required) schema = schema.refine((v) => v !== "", `${label} is required`);
  return schema;
};
const schema = z.object({
  firstName: nameField("First name", { required: true }),
  lastName: nameField("Last name", { required: false }),
});

export function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

export default function EditUserNameDialog({ user, open, onOpenChange, onSaved, save, title, description, conflictMode = "close" }) {
  const opened = React.useMemo(
    () => ({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" }),
    [user?._id, user?.firstName, user?.lastName],
  );
  // What the server holds now, learnt from a 409 in "stay" mode; replaces
  // `opened` as the baseline (`expected`) until the dialog is reopened.
  const [conflict, setConflict] = React.useState(null);
  const initial = conflict ?? opened;
  const [firstName, setFirstName] = React.useState(opened.firstName);
  const [lastName, setLastName] = React.useState(opened.lastName);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  // "stay" resets only when the dialog opens: a caller that stores the
  // server's name after a conflict must not wipe what is being typed.
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    const justOpened = open && !wasOpen.current;
    wasOpen.current = open;
    if (!open) return;
    if (conflictMode === "stay" && !justOpened) return;
    setFirstName(opened.firstName);
    setLastName(opened.lastName);
    setErrors({});
    setSaving(false);
    setConflict(null);
  }, [open, opened, conflictMode]);

  const next = { firstName: normalizeName(firstName), lastName: normalizeName(lastName) };
  const validation = schema.safeParse(next);
  const fieldErrors = validation.success ? {} : Object.fromEntries(validation.error.issues.map((i) => [i.path[0], i.message]));
  const unchanged = next.firstName === initial.firstName && next.lastName === initial.lastName;
  const canSave = validation.success && !unchanged && !saving;

  const submit = async (event) => {
    event?.preventDefault?.();
    setErrors(fieldErrors);
    if (!canSave) return;
    setSaving(true);
    try {
      const result = save ? await save(next, initial) : await renameUser(user._id, next, initial);
      toast.success(result.changed ? "Name updated" : "Name unchanged");
      onSaved?.(result.data);
      onOpenChange(false);
    } catch (err) {
      const current = err?.data?.data;
      if (err?.status === 409 && conflictMode === "stay" && current && typeof current.firstName === "string") {
        // Keep what was typed; the notice shows the saved name and the next
        // Save is checked against it.
        const saved = { firstName: current.firstName ?? "", lastName: current.lastName ?? "" };
        setConflict(saved);
        setErrors({});
        onSaved?.(saved, { stale: true });
      } else if (err?.status === 409) {
        toast.error(err.message || "This user's name was changed by someone else. Refresh and try again.");
        onSaved?.(err.data?.data ?? null, { stale: true });
        onOpenChange(false);
      } else if (err?.status === 400 && err?.data?.field) {
        setErrors({ [err.data.field]: err.message });
      } else if (err?.status !== 401) {
        toast.error(err?.message || "Could not update the name");
      }
    } finally {
      setSaving(false);
    }
  };

  // Live feedback while typing for non-empty fields; "required" only after
  // an attempt to save.
  const live = {
    firstName: firstName.trim() ? fieldErrors.firstName : undefined,
    lastName: lastName.trim() ? fieldErrors.lastName : undefined,
  };
  const shownErrors = { firstName: errors.firstName ?? live.firstName, lastName: errors.lastName ?? live.lastName };

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-lg">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>{title ?? "Edit name"}</DialogTitle>
            <DialogDescription>
              {description ?? (user?.email ? `Change the name shown for ${user.email}.` : "Change the name shown for this account.")}
            </DialogDescription>
          </DialogHeader>
          {conflict ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="status" data-testid="name-conflict">
              <p>
                This name was changed somewhere else. It is now{" "}
                <span className="font-medium">{[conflict.firstName, conflict.lastName].filter(Boolean).join(" ") || "empty"}</span>.
              </p>
              <p className="mt-1">Your edit is kept below — Save again to replace it, or Cancel to keep the current name.</p>
            </div>
          ) : null}
          <div className="mt-4 grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-first-name">First name</Label>
              <Input
                id="edit-first-name"
                value={firstName}
                autoComplete="off"
                autoFocus
                maxLength={60}
                aria-invalid={!!shownErrors.firstName}
                aria-describedby={shownErrors.firstName ? "edit-first-name-error" : undefined}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setErrors((prev) => ({ ...prev, firstName: undefined }));
                }}
              />
              {shownErrors.firstName ? (
                <p id="edit-first-name-error" className="text-sm text-red-600" role="alert">
                  {shownErrors.firstName}
                </p>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="edit-last-name">Last name</Label>
              <Input
                id="edit-last-name"
                value={lastName}
                autoComplete="off"
                maxLength={60}
                aria-invalid={!!shownErrors.lastName}
                aria-describedby={shownErrors.lastName ? "edit-last-name-error" : undefined}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setErrors((prev) => ({ ...prev, lastName: undefined }));
                }}
              />
              {shownErrors.lastName ? (
                <p id="edit-last-name-error" className="text-sm text-red-600" role="alert">
                  {shownErrors.lastName}
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="bg-primaryGreen text-white hover:bg-brightGreen" disabled={!canSave} aria-busy={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

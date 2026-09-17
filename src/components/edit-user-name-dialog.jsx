"use client";
// Rename a user/host from the admin (Batch A2). Validation mirrors the
// backend rule (letters, spaces, dots, apostrophes, hyphens; ≤ 50; first
// name required). The values the dialog opened with are sent as `expected`
// so a stale page gets a 409 instead of silently overwriting someone
// else's change.
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

export default function EditUserNameDialog({ user, open, onOpenChange, onSaved }) {
  const initial = React.useMemo(
    () => ({ firstName: user?.firstName ?? "", lastName: user?.lastName ?? "" }),
    [user?._id, user?.firstName, user?.lastName],
  );
  const [firstName, setFirstName] = React.useState(initial.firstName);
  const [lastName, setLastName] = React.useState(initial.lastName);
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setFirstName(initial.firstName);
    setLastName(initial.lastName);
    setErrors({});
    setSaving(false);
  }, [open, initial]);

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
      const result = await renameUser(user._id, next, initial);
      toast.success(result.changed ? "Name updated" : "Name unchanged");
      onSaved?.(result.data);
      onOpenChange(false);
    } catch (err) {
      if (err?.status === 409) {
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
            <DialogTitle>Edit name</DialogTitle>
            <DialogDescription>
              {user?.email ? `Change the name shown for ${user.email}.` : "Change the name shown for this account."}
            </DialogDescription>
          </DialogHeader>
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

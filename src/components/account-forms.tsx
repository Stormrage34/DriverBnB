"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, Trash2 } from "lucide-react";
import {
  changePasswordAction,
  deleteAccountAction,
  type ActionState,
} from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(changePasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="currentPassword" required>Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="newPassword" required hint="min. 10 characters">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div>
          <Label htmlFor="confirmPassword" required>Confirm new password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
        </div>
      </div>
      <FieldError>{state?.error}</FieldError>
      {state?.success ? (
        <p className="flex items-center gap-2 text-sm text-success">
          <CheckCircle2 size={14} /> {state.success}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        <KeyRound size={15} /> {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(deleteAccountAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-xl border border-danger/20 bg-danger-soft p-4 text-xs leading-relaxed text-ink-soft">
        <p className="font-semibold text-danger">This cannot be undone.</p>
        <p className="mt-1">
          Your profile, saved items, enquiries and reviews are deleted. Reviews you published are removed
          from company pages. Moderation and security records may be retained where the law requires it.
        </p>
      </div>
      <div>
        <Label htmlFor="password" required>Confirm your password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <div>
        <Label htmlFor="confirm" required hint="type DELETE">Confirmation</Label>
        <Input id="confirm" name="confirm" placeholder="DELETE" required />
      </div>
      <FieldError>{state?.error}</FieldError>
      <Button type="submit" variant="danger" disabled={pending}>
        <Trash2 size={15} /> {pending ? "Deleting…" : "Delete my account permanently"}
      </Button>
    </form>
  );
}

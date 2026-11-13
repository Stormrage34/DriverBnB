"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MailCheck, KeyRound } from "lucide-react";
import {
  requestPasswordResetAction,
  resetPasswordAction,
  resendVerificationAction,
  verifyEmailAction,
  type ActionState,
} from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";

export function VerifyEmailForm({ token, next }: { token: string; next?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(verifyEmailAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.success && next) router.push(next);
  }, [state?.success, next, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FieldError>{state?.error}</FieldError>
      {state?.success ? (
        <p className="flex items-start gap-2 rounded-xl border border-success/20 bg-success-soft p-4 text-sm text-success">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {state.success}
        </p>
      ) : (
        <Button type="submit" disabled={pending} className="w-full">
          <MailCheck size={15} /> {pending ? "Confirming…" : "Confirm my email"}
        </Button>
      )}
    </form>
  );
}

export function ResendVerificationForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    resendVerificationAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="resend-email" required>Email</Label>
        <Input
          id="resend-email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={defaultEmail}
          required
        />
      </div>
      <FieldError>{state?.error}</FieldError>
      {state?.success ? (
        <p className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">{state.success}</p>
      ) : null}
      <Button type="submit" variant="secondary" disabled={pending} className="w-full">
        <MailCheck size={15} /> {pending ? "Sending…" : "Send a new confirmation link"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    requestPasswordResetAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="reset-email" required>Email</Label>
        <Input id="reset-email" name="email" type="email" autoComplete="email" required />
      </div>
      <FieldError>{state?.error}</FieldError>
      {state?.success ? (
        <p className="rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">{state.success}</p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        <KeyRound size={15} /> {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(resetPasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="new-password" required hint="min. 10 characters">New password</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>
      <div>
        <Label htmlFor="confirm-new-password" required>Confirm new password</Label>
        <Input
          id="confirm-new-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <FieldError>{state?.error}</FieldError>
      <p className="text-xs leading-relaxed text-muted">
        Changing your password signs out every active session, including this one.
      </p>
      <Button type="submit" disabled={pending} className="w-full">
        <KeyRound size={15} /> {pending ? "Updating…" : "Set new password"}
      </Button>
    </form>
  );
}

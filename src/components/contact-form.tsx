"use client";

import { useActionState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { contactAction, type ActionState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";

export function ContactForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(contactAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-success/25 bg-success-soft p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 size={16} /> Message received
        </p>
        <p className="mt-2 text-sm text-ink-soft">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name" required>Name</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email" required>Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
      </div>
      <div>
        <Label htmlFor="subject" required>Subject</Label>
        <Input id="subject" name="subject" required placeholder="Driver question, employer enquiry, correction request…" />
      </div>
      <div>
        <Label htmlFor="message" required>Message</Label>
        <Textarea id="message" name="message" required minLength={20} maxLength={3000} rows={6} />
      </div>
      <FieldError>{state?.error}</FieldError>
      <Button type="submit" disabled={pending}>
        <Send size={15} /> {pending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-xs text-muted">
        We use your message only to answer it. See the{" "}
        <a href="/privacy" className="underline underline-offset-4">privacy notice</a>.
      </p>
    </form>
  );
}

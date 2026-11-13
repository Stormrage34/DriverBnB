"use client";

import { useActionState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { sendEnquiryAction, type ActionState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, FieldError, Label, Textarea } from "@/components/ui/field";

export function EnquiryForm({
  vacancyId,
  defaultEmail,
  hasPhone,
}: {
  vacancyId: string;
  defaultEmail: string;
  hasPhone: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(sendEnquiryAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-success/25 bg-success-soft p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 size={16} /> Enquiry sent
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{state.success}</p>
        <p className="mt-3 text-xs text-muted">
          You can track it under <span className="font-medium text-ink">My applications</span>.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="vacancyId" value={vacancyId} />
      <div>
        <Label htmlFor="enquiry-message" required>
          Your message to the employer
        </Label>
        <Textarea
          id="enquiry-message"
          name="message"
          required
          minLength={40}
          maxLength={3000}
          rows={6}
          placeholder="Introduce yourself: licence categories, Code 95, ADR classes, relevant experience, availability — and ask about the conditions that matter to you (rotation, parking during weekly rest, deductions)."
        />
        <p className="mt-1.5 text-xs text-muted">
          Do not include your home address, ID numbers or bank details. The employer does not need them
          to answer a question.
        </p>
      </div>

      <div className="space-y-2">
        <Checkbox
          name="shareEmail"
          label="Share my email address with this employer"
          hint={defaultEmail ? `Uses ${defaultEmail}` : "Add an email in your profile first"}
          defaultChecked={false}
        />
        {hasPhone ? (
          <Checkbox
            name="sharePhone"
            label="Share my phone number with this employer"
            hint="Only if you are comfortable being called."
          />
        ) : null}
      </div>

      <FieldError>{state?.error}</FieldError>

      <Button type="submit" disabled={pending} className="w-full">
        <Send size={15} /> {pending ? "Sending…" : "Send enquiry directly"}
      </Button>
      <p className="text-center text-[0.7rem] leading-relaxed text-muted">
        DriverCompass delivers the message. The employer decides how to respond — we never select or rank
        candidates.
      </p>
    </form>
  );
}

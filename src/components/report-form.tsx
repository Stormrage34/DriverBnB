"use client";

import { useActionState } from "react";
import { CheckCircle2, Flag } from "lucide-react";
import { reportContentAction, type ActionState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Select, Textarea } from "@/components/ui/field";
import { REPORT_REASONS } from "@/lib/constants";

export function ReportForm({
  targetType,
  targetId,
  defaultReason,
}: {
  targetType: "review" | "vacancy" | "company" | "message";
  targetId: string;
  defaultReason?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(reportContentAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-success/25 bg-success-soft p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 size={16} /> Report received
        </p>
        <p className="mt-2 text-sm text-ink-soft">{state.success}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <div>
        <Label htmlFor="reason" required>
          What is wrong?
        </Label>
        <Select id="reason" name="reason" required defaultValue={defaultReason ?? ""}>
          <option value="" disabled>
            Choose a reason
          </option>
          {REPORT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="details">Details (optional)</Label>
        <Textarea
          id="details"
          name="details"
          rows={4}
          maxLength={2000}
          placeholder="What should the moderator know? Include dates or quotes if relevant. Do not post personal data."
        />
      </div>
      <FieldError>{state?.error}</FieldError>
      <Button type="submit" variant="secondary" disabled={pending}>
        <Flag size={15} /> {pending ? "Sending…" : "Submit report"}
      </Button>
      <p className="text-xs leading-relaxed text-muted">
        Reports are reviewed by a moderator. Abuse of the reporting tool can lead to account suspension.
      </p>
    </form>
  );
}

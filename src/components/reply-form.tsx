"use client";

import { useActionState } from "react";
import { CheckCircle2, MessageSquareQuote } from "lucide-react";
import { respondToReviewAction, type EmployerActionState } from "@/app/employer/actions";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/field";

export function ReplyForm({ reviewId }: { reviewId: string }) {
  const [state, formAction, pending] = useActionState<EmployerActionState, FormData>(respondToReviewAction, null);

  if (state?.success) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-success/25 bg-success-soft px-3 py-2 text-xs text-success">
        <CheckCircle2 size={13} /> {state.success}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-3 space-y-2 rounded-xl border border-line bg-paper p-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Label htmlFor={`reply-${reviewId}`}>Public response</Label>
      <Textarea
        id={`reply-${reviewId}`}
        name="body"
        rows={3}
        minLength={20}
        maxLength={2000}
        required
        placeholder="Address the substance: what happened, what changed, what you are correcting. Do not name or attack the reviewer."
      />
      <FieldError>{state?.error}</FieldError>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.7rem] text-muted">One response per review. Published immediately; moderated like reviews.</p>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          <MessageSquareQuote size={13} /> {pending ? "Publishing…" : "Publish reply"}
        </Button>
      </div>
    </form>
  );
}

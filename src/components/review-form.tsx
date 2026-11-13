"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Star } from "lucide-react";
import { submitReviewAction, type ActionState } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, FieldError, HelpText, Input, Label, Select, Textarea } from "@/components/ui/field";
import { REVIEW_CATEGORIES } from "@/lib/constants";

const SCALE = [
  { value: "", label: "Not rated" },
  { value: "1", label: "1 — Very poor" },
  { value: "2", label: "2 — Poor" },
  { value: "3", label: "3 — Acceptable" },
  { value: "4", label: "4 — Good" },
  { value: "5", label: "5 — Excellent" },
];

export function ReviewForm({
  companies,
  defaultCompanyId,
}: {
  companies: Array<{ id: string; name: string }>;
  defaultCompanyId?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(submitReviewAction, null);
  const [rating, setRating] = useState("4");

  if (state?.success) {
    return (
      <div className="rounded-2xl border border-success/25 bg-success-soft p-6">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 size={17} /> Review submitted
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{state.success}</p>
        <p className="mt-3 text-xs text-muted">
          <Link href="/dashboard/reviews" className="underline underline-offset-4">View my reviews</Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Which employment are you reviewing?</CardTitle>
        </CardHeader>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyId" required>Company</Label>
            <Select id="companyId" name="companyId" required defaultValue={defaultCompanyId ?? ""}>
              <option value="" disabled>Select the employer</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </Select>
            <HelpText>Can’t find the company? Reviews are only possible for companies listed on DriverCompass.</HelpText>
          </div>
          <div>
            <Label htmlFor="jobTitle">Job title</Label>
            <Input id="jobTitle" name="jobTitle" placeholder="International C+E driver" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="employmentStart" required>Started</Label>
              <Input id="employmentStart" name="employmentStart" type="month" required />
            </div>
            <div>
              <Label htmlFor="employmentEnd">Left</Label>
              <Input id="employmentEnd" name="employmentEnd" type="month" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ratings</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-paper p-4">
            <Star size={18} className="text-accent" />
            <div className="flex flex-1 items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Overall rating</p>
                <p className="text-xs text-muted">Required</p>
              </div>
              <Select
                name="overallRating"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                className="w-40"
                required
              >
                {SCALE.slice(1).map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {REVIEW_CATEGORIES.map((category) => (
              <div key={category.key}>
                <Label htmlFor={category.key} hint="optional">{category.label}</Label>
                <Select id={category.key} name={category.key} defaultValue="">
                  {SCALE.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value === "" ? "Not rated" : option.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[0.7rem] text-muted">{category.question}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your experience</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="title" required>Headline</Label>
            <Input id="title" name="title" required minLength={5} maxLength={120} placeholder="Pay was on time, rotations changed without notice" />
          </div>
          <div>
            <Label htmlFor="body" required hint="min. 80 characters">What should another driver know?</Label>
            <Textarea
              id="body"
              name="body"
              required
              minLength={80}
              maxLength={4000}
              rows={8}
              placeholder="Describe measurable facts: pay timing and deductions, whether the truck matched the advert, how dispatch communicated, whether home time was respected, what accommodation was like. Do not name individuals or include personal data."
            />
            <HelpText>
              Reviews are moderated for personal data, abuse and unsubstantiated criminal allegations. See the{" "}
              <Link href="/review-policy" className="underline underline-offset-4">review policy</Link>.
            </HelpText>
          </div>

          <Checkbox
            name="eligibilityAttested"
            label="I confirm I worked for this company during the period stated."
            hint="False attestations lead to account suspension."
          />
          <Checkbox
            name="publicationConsent"
            label="I agree to my review being published pseudonymously (first name and initial)."
          />
        </CardBody>
      </Card>

      <FieldError>{state?.error}</FieldError>
      <Button type="submit" disabled={pending}>
        <Star size={15} /> {pending ? "Submitting…" : "Submit for moderation"}
      </Button>
      <p className="text-xs text-muted">
        Your review is not published immediately. A moderator checks it, normally within 5 working days.
      </p>
    </form>
  );
}

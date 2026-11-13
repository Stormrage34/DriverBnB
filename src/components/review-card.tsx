import Link from "next/link";
import { Flag, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/rating";
import { REVIEW_CATEGORIES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { DriverReview, ReviewResponse } from "@/db/schema";

function publicName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export function ReviewCard({
  review,
  authorName,
  responses,
  showReport = true,
}: {
  review: DriverReview;
  authorName: string;
  responses: ReviewResponse[];
  showReport?: boolean;
}) {
  const categories = REVIEW_CATEGORIES.filter((c) => {
    const value = review[c.key as keyof DriverReview];
    return typeof value === "number" && value > 0;
  });

  return (
    <article className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Stars value={review.overallRating} />
            <span className="text-sm font-semibold">{review.overallRating.toFixed(1)}</span>
            <Badge tone="outline">Driver-reported</Badge>
          </div>
          <h3 className="mt-2 text-[0.98rem] font-semibold leading-snug">{review.title}</h3>
        </div>
        <p className="text-xs text-muted">{formatDate(review.publishedAt ?? review.createdAt)}</p>
      </div>

      <p className="mt-1 text-xs text-muted">
        {publicName(authorName)}
        {review.jobTitle ? ` · ${review.jobTitle}` : ""}
        {review.employmentStart
          ? ` · ${formatDate(review.employmentStart)} – ${review.employmentEnd ? formatDate(review.employmentEnd) : "present"}`
          : ""}
      </p>

      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{review.body}</p>
      <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
        Employment period and role are self-declared by the driver. Moderation checks eligibility and
        personal data before publication; it does not independently confirm employment records.
      </p>

      {categories.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2 rounded-xl bg-paper p-4 text-xs sm:grid-cols-4">
          {categories.map((category) => (
            <div key={category.key}>
              <dt className="text-muted">{category.label}</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-medium">
                {Number(review[category.key as keyof DriverReview]).toFixed(1)}
                <span className="text-muted">/ 5</span>
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {responses.length > 0 ? (
        <div className="mt-4 space-y-3">
          {responses.map((response) => (
            <div key={response.id} className="rounded-xl border border-line bg-brand-100/50 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand">
                <MessageSquareQuote size={13} /> Employer response · {formatDate(response.createdAt)}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{response.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-[0.7rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-success" />
          Reviewed for eligibility & personal data before publication
        </span>
        {showReport ? (
          <Link href={`/report?type=review&id=${review.id}`} className="inline-flex items-center gap-1 hover:text-ink">
            <Flag size={12} /> Report
          </Link>
        ) : null}
      </div>
    </article>
  );
}

import Link from "next/link";
import { FileWarning, ShieldCheck, Star } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { requireDriverPage } from "@/lib/guards";
import { getDriverDashboard } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONE = {
  pending: "warning",
  published: "success",
  under_review: "warning",
  rejected: "danger",
  removed: "neutral",
} as const;

const STATUS_LABEL = {
  pending: "Awaiting moderation",
  published: "Published",
  under_review: "Under review",
  rejected: "Rejected",
  removed: "Removed",
} as const;

export default async function MyReviewsPage() {
  const user = await requireDriverPage();
  const { reviews } = await getDriverDashboard(user.id);

  return (
    <div>
      <PageHeader
        title="My reviews"
        description="Your published and pending reviews. Employers can reply; they cannot delete what you wrote."
        action={
          <ButtonLink href="/dashboard/reviews/new" variant="primary" size="sm">
            <Star size={14} /> Write a review
          </ButtonLink>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-xs leading-relaxed text-ink-soft">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" />
        <p>
          Reviews require a genuine employment experience and are moderated for eligibility, personal data
          and legal risk. Read the{" "}
          <Link href="/review-policy" className="font-medium text-brand underline-offset-4 hover:underline">
            review policy
          </Link>{" "}
          before submitting.
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Your reviews</CardTitle>
          <span className="text-xs text-muted">{reviews.length}</span>
        </CardHeader>
        <CardBody className="space-y-3">
          {reviews.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm font-medium">You have not written a review yet</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                If you have worked for a company listed here, your experience helps the next driver.
              </p>
              <ButtonLink href="/companies" variant="secondary" size="sm" className="mt-4">
                Find the company
              </ButtonLink>
            </div>
          ) : (
            reviews.map((row) => (
              <article key={row.review.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/companies/${row.company.slug}/reviews`}
                      className="text-sm font-semibold underline-offset-4 hover:underline"
                    >
                      {row.review.title}
                    </Link>
                    <p className="text-xs text-muted">
                      {row.company.tradingName ?? row.company.legalName}
                      {row.review.employmentStart
                        ? ` · ${formatDate(row.review.employmentStart)} – ${row.review.employmentEnd ? formatDate(row.review.employmentEnd) : "present"}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[row.review.status as keyof typeof STATUS_TONE] ?? "neutral"}>
                    {STATUS_LABEL[row.review.status as keyof typeof STATUS_LABEL] ?? row.review.status}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm text-ink-soft">{row.review.body}</p>
                <p className="mt-2 text-[0.7rem] text-muted">
                  Overall {row.review.overallRating}/5 · submitted {formatDate(row.review.createdAt)}
                </p>
                {row.review.status === "rejected" && row.review.moderationNotes ? (
                  <p className="mt-2 flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-xs text-danger">
                    <FileWarning size={13} className="mt-0.5 shrink-0" />
                    {row.review.moderationNotes}
                  </p>
                ) : null}
              </article>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

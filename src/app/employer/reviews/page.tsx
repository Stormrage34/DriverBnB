import Link from "next/link";
import { Star } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stars, RatingBar } from "@/components/rating";
import { ReplyForm } from "@/components/reply-form";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser, getEmployerReviews, getCompanyRatingBreakdown } from "@/lib/queries";
import { db } from "@/lib/db";
import { reviewResponses } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmployerReviewsPage() {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  const [reviews, breakdown, responses] = await Promise.all([
    getEmployerReviews(company.id),
    getCompanyRatingBreakdown(company.id),
    db.select().from(reviewResponses).where(eq(reviewResponses.companyId, company.id)),
  ]);

  const published = reviews.filter((row) => row.review.status === "published");

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="You may reply publicly to any review. You cannot delete criticism or pay to change a rating."
        action={
          <Link href={`/companies/${company.slug}/reviews`} className="text-sm font-medium text-brand underline-offset-4 hover:underline">
            View public reviews →
          </Link>
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-[0.7rem] uppercase tracking-wider text-muted">Overall rating</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight">
                  {breakdown.average === null ? "—" : breakdown.average.toFixed(1)}
                </span>
                <span className="pb-1 text-xs text-muted">/ 5</span>
              </div>
              <Stars value={breakdown.average} />
              <p className="mt-1 text-xs text-muted">{breakdown.count} published reviews</p>
            </div>
            <div className="min-w-48 flex-1 space-y-2">
              <RatingBar label="Payment" value={breakdown.categories.paymentReliability} />
              <RatingBar label="Advert accuracy" value={breakdown.categories.advertAccuracy} />
              <RatingBar label="Dispatch" value={breakdown.categories.dispatchManagement} />
              <RatingBar label="Equipment" value={breakdown.categories.equipment} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="text-xs leading-relaxed text-ink-soft">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Star size={14} className="text-accent" /> Ground rules
            </p>
            <p className="mt-2">Replies are public and permanent in the same way as reviews.</p>
            <p className="mt-1">Do not reveal the reviewer’s identity, even if you believe you know it.</p>
            <p className="mt-1">If a review breaches policy, report it — do not retaliate.</p>
            <Link href="/review-policy" className="mt-2 inline-block font-medium text-brand underline-offset-4 hover:underline">
              Review policy →
            </Link>
          </CardBody>
        </Card>
      </div>

      {published.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center">
            <p className="text-sm font-semibold">No published reviews yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Reviews appear after a driver attests to a real employment experience and a moderator approves
              publication.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {published.map((row) => {
            const response = responses.find((item) => item.reviewId === row.review.id);
            return (
              <Card key={row.review.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stars value={row.review.overallRating} />
                      <span className="text-sm font-semibold">{row.review.overallRating}.0</span>
                      <Badge tone="outline">Published</Badge>
                    </div>
                    <CardTitle className="mt-1">{row.review.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted">
                      {row.review.jobTitle ?? "Driver"} ·{" "}
                      {row.review.employmentStart ? formatDate(row.review.employmentStart) : ""}
                      {row.review.employmentEnd ? ` – ${formatDate(row.review.employmentEnd)}` : " – present"}
                    </p>
                  </div>
                  <p className="text-xs text-muted">{formatDate(row.review.publishedAt ?? row.review.createdAt)}</p>
                </CardHeader>
                <CardBody>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{row.review.body}</p>

                  {response ? (
                    <div className="mt-3 rounded-xl border border-line bg-brand-100/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-brand">
                          Your response · {formatDate(response.createdAt)}
                        </p>
                        <Badge
                          tone={
                            response.status === "published"
                              ? "success"
                              : response.status === "pending"
                                ? "warning"
                                : "danger"
                          }
                        >
                          {response.status === "published"
                            ? "Published"
                            : response.status === "pending"
                              ? "Awaiting moderation"
                              : "Rejected"}
                        </Badge>
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{response.body}</p>
                      {response.status === "pending" ? (
                        <p className="mt-2 text-[0.7rem] text-muted">
                          Moderators review replies before publication. You will see the status here.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <ReplyForm reviewId={row.review.id} />
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

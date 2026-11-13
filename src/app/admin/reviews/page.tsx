import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { requireAdminPage } from "@/lib/guards";
import {
  adminEnumFilter,
  adminPage,
  getReviewPublicationEvidenceMap,
  listAdminReviews,
  ADMIN_PAGE_SIZE,
} from "@/lib/admin-queries";
import { moderateReviewAction } from "@/app/admin/actions";
import { allowedReviewOutcomes, type ReviewModerationBlockReason } from "@/lib/reviews";
import { driverReviews } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const OUTCOME_LABELS: Record<string, string> = {
  publish: "Publish review",
  reject: "Reject before publication",
  remove: "Remove published review",
  under_review: "Move under review",
};

const ERROR_MESSAGES: Record<ReviewModerationBlockReason, string> = {
  terminal_state:
    "Rejected and removed reviews are terminal. Restoring one requires a separate reinstatement process, not ordinary moderation.",
  publication_history_unknown:
    "This under-review review has no publication timestamp and no recorded transition establishing that it was never published. Its history cannot be established, so it was left unchanged.",
  publication_history_conflict:
    "Recorded moderation history says this review was published, but it has no publication timestamp. The record is internally inconsistent, so it was left unchanged.",
  remove_requires_publication:
    "A review that has never been public cannot be removed. Reject it instead.",
  reject_requires_unpublished:
    "This review was previously public. Remove it instead of rejecting it.",
  already_published: "This review is already published.",
  already_under_review: "This review is already under review.",
  use_remove: "A published review must be removed rather than rejected.",
  unknown_status: "The review is in a state that has no defined moderation transition.",
};

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "published") return "success";
  if (status === "pending" || status === "under_review") return "warning";
  if (status === "rejected" || status === "removed") return "danger";
  return "neutral";
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; error?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = adminEnumFilter(params.status, driverReviews.status.enumValues, "all");
  const page = adminPage(params.page);
  const result = await listAdminReviews({ status, page });
  const evidenceByReview = await getReviewPublicationEvidenceMap(
    result.rows.map((row) => row.review.id),
  );
  const error = params.error
    ? ERROR_MESSAGES[params.error as ReviewModerationBlockReason] ??
      "That moderation action was refused. Nothing was changed."
    : null;

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Moderation follows an explicit transition model. A review that was previously published is distinguished from one that never was by its publication timestamp; terminal states cannot be republished."
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <Card className="mb-4">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <label htmlFor="review-status" className="mb-1 block text-xs font-medium">
                Status
              </label>
              <select
                id="review-status"
                name="status"
                defaultValue={status}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                {driverReviews.status.enumValues.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              Filter
            </button>
          </form>
        </CardBody>
      </Card>

      {result.rows.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <Star size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">No reviews match</p>
            <p className="mt-1 text-sm text-muted">Try a different status filter.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.rows.map(({ review, company, authorName }) => {
            const evidence = evidenceByReview.get(review.id);
            const outcomes = allowedReviewOutcomes({
              status: review.status,
              publishedAt: review.publishedAt,
              moderatedAt: review.moderatedAt,
              evidence,
            });
            const previouslyPublished = review.publishedAt !== null;
            const historyUnknown =
              !previouslyPublished &&
              review.status === "under_review" &&
              !evidence?.enteredUnderReviewFromPending;

            return (
              <Card key={review.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{review.title}</CardTitle>
                      <Badge tone={statusTone(review.status)}>
                        {review.status.replaceAll("_", " ")}
                      </Badge>
                      <Badge tone="accent">{review.overallRating}/5</Badge>
                      {previouslyPublished ? (
                        <Badge tone="info">Previously published</Badge>
                      ) : historyUnknown ? (
                        <Badge tone="danger">Publication history unknown</Badge>
                      ) : (
                        <Badge tone="neutral">Never published</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {company.legalName} · by {authorName} · submitted {formatDate(review.createdAt)}
                      {review.publishedAt ? ` · first published ${formatDate(review.publishedAt)}` : ""}
                    </p>
                  </div>
                  <Link
                    href={`/companies/${company.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-brand underline-offset-4 hover:underline"
                  >
                    Company profile <ExternalLink size={12} />
                  </Link>
                </CardHeader>
                <CardBody className="space-y-4">
                  <p className="whitespace-pre-line rounded-xl bg-paper p-4 text-sm leading-relaxed text-ink-soft">
                    {review.body}
                  </p>

                  <dl className="grid gap-3 text-xs sm:grid-cols-3">
                    <div>
                      <dt className="uppercase tracking-wider text-muted">Employment</dt>
                      <dd className="mt-1">
                        {review.jobTitle ?? "Not stated"} · {review.employmentStart ?? "start unknown"} →{" "}
                        {review.employmentEnd ?? "end unknown"}
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wider text-muted">Eligibility attested</dt>
                      <dd className="mt-1">{review.eligibilityAttested ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wider text-muted">Last moderated</dt>
                      <dd className="mt-1">
                        {review.moderatedAt ? formatDate(review.moderatedAt) : "Never"}
                      </dd>
                    </div>
                  </dl>

                  {review.moderationNotes ? (
                    <p className="rounded-xl border border-warning/25 bg-warning-soft p-3 text-xs text-ink-soft">
                      Previous moderator note: {review.moderationNotes}
                    </p>
                  ) : null}

                  {outcomes.length === 0 ? (
                    <p className="rounded-xl border border-line bg-paper p-3 text-xs text-muted">
                      This review is in a terminal state. No ordinary moderation action is available.
                    </p>
                  ) : (
                    <form
                      action={moderateReviewAction}
                      className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
                    >
                      <input type="hidden" name="reviewId" value={review.id} />
                      <div>
                        <label
                          htmlFor={`review-outcome-${review.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Decision
                        </label>
                        <select
                          id={`review-outcome-${review.id}`}
                          name="outcome"
                          defaultValue={outcomes[0]}
                          className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
                        >
                          {outcomes.map((outcome) => (
                            <option key={outcome} value={outcome}>
                              {OUTCOME_LABELS[outcome]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor={`review-notes-${review.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Reasoning (recorded in the audit log)
                        </label>
                        <textarea
                          id={`review-notes-${review.id}`}
                          name="notes"
                          required
                          minLength={10}
                          maxLength={2000}
                          rows={2}
                          placeholder="Which policy applies and what evidence was reviewed."
                          className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600"
                      >
                        Record decision
                      </button>
                    </form>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={result.page}
        perPage={ADMIN_PAGE_SIZE}
        total={result.total}
        basePath="/admin/reviews"
        searchParams={params}
      />
    </div>
  );
}

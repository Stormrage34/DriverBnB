import Link from "next/link";
import { ExternalLink, ShieldCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { requireAdminPage } from "@/lib/guards";
import {
  adminEnumFilter,
  adminPage,
  getRecordedVacancyPreviousStatuses,
  listAdminVacancies,
  ADMIN_PAGE_SIZE,
} from "@/lib/admin-queries";
import { setVacancyModerationAction } from "@/app/admin/actions";
import { checkPublishable, LIVE_VACANCY_STATUSES } from "@/lib/vacancy";
import { isCompanySuspended } from "@/lib/company-suspension";
import {
  allowedVacancyModerationOutcomes,
  VACANCY_MODERATION_BLOCK_MESSAGES,
} from "@/lib/vacancy-moderation";
import { vacancies } from "@/db/schema";
import { formatDate, formatPayRange } from "@/lib/utils";
import { countryName, payPeriodLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

const OUTCOME_LABELS: Record<string, string> = {
  suspend: "Suspend vacancy",
  restore: "Restore to public view",
  expire: "Expire vacancy",
};

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "published_verified" || status === "confirmed") return "success";
  if (status === "published_unverified" || status === "reconfirmation_required") return "warning";
  if (status === "suspended" || status === "expired") return "danger";
  return "neutral";
}

export default async function AdminVacanciesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; error?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = adminEnumFilter(params.status, vacancies.status.enumValues, "all");
  const page = adminPage(params.page);
  const result = await listAdminVacancies({ status, page });

  const individualSuspensions = await getRecordedVacancyPreviousStatuses(
    result.rows
      .filter((row) => row.vacancy.status === "suspended" && !row.vacancy.suspendedFromStatus)
      .map((row) => row.vacancy.id),
  );

  const error = params.error
    ? VACANCY_MODERATION_BLOCK_MESSAGES[
        params.error as keyof typeof VACANCY_MODERATION_BLOCK_MESSAGES
      ] ?? "That moderation action was refused. Nothing was changed."
    : null;

  return (
    <div>
      <PageHeader
        title="Vacancies"
        description="Suspend, restore or expire an individual vacancy. Restoration is validated against the recorded previous state, the company's suspension state, current verification trust and the advert's completeness."
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
              <label htmlFor="vacancy-status" className="mb-1 block text-xs font-medium">
                Status
              </label>
              <select
                id="vacancy-status"
                name="status"
                defaultValue={status}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                {vacancies.status.enumValues.map((value) => (
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
            <Truck size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">No vacancies match</p>
            <p className="mt-1 text-sm text-muted">Try a different status filter.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.rows.map(({ vacancy, company }) => {
            const companySuspended = isCompanySuspended({
              suspendedAt: company.suspendedAt,
              verificationStatus: company.verificationStatus,
            });
            const previousStatus =
              vacancy.suspendedFromStatus ?? individualSuspensions.get(vacancy.id) ?? null;
            const context = {
              currentStatus: vacancy.status,
              suspendedFromStatus: vacancy.suspendedFromStatus,
              recordedPreviousStatus: individualSuspensions.get(vacancy.id) ?? null,
              companySuspended,
              companyVerificationStatus: company.verificationStatus,
              companyVerificationVersion: company.verificationVersion,
              publishability: checkPublishable(vacancy),
              reconfirmationOverdue: vacancy.reconfirmDueAt
                ? vacancy.reconfirmDueAt.getTime() < Date.now()
                : false,
            };
            const outcomes = allowedVacancyModerationOutcomes(context);
            const live = (LIVE_VACANCY_STATUSES as readonly string[]).includes(vacancy.status);

            return (
              <Card key={vacancy.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{vacancy.title}</CardTitle>
                      <Badge tone={statusTone(vacancy.status)}>
                        {vacancy.status.replaceAll("_", " ")}
                      </Badge>
                      {companySuspended ? <Badge tone="danger">Company suspended</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {company.legalName} · {countryName(vacancy.country)}
                      {vacancy.city ? `, ${vacancy.city}` : ""} · updated {formatDate(vacancy.updatedAt)}
                    </p>
                  </div>
                  {live ? (
                    <Link
                      href={`/jobs/${vacancy.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs text-brand underline-offset-4 hover:underline"
                    >
                      Public advert <ExternalLink size={12} />
                    </Link>
                  ) : (
                    <span className="text-xs text-muted">Not public</span>
                  )}
                </CardHeader>
                <CardBody className="space-y-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">Pay</dt>
                      <dd className="mt-1">
                        {formatPayRange(
                          vacancy.grossPayMin,
                          vacancy.grossPayMax,
                          vacancy.currency,
                          payPeriodLabel(vacancy.payPeriod),
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">
                        Previous state
                      </dt>
                      <dd className="mt-1">
                        {vacancy.status === "suspended"
                          ? previousStatus?.replaceAll("_", " ") ?? "not recorded"
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">
                        Completeness
                      </dt>
                      <dd className="mt-1 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-muted" />
                        {checkPublishable(vacancy).ok ? "Publishable" : "Missing required fields"}
                      </dd>
                    </div>
                  </dl>

                  {vacancy.moderationNote ? (
                    <p className="whitespace-pre-line rounded-xl bg-paper p-3 text-xs text-ink-soft">
                      Moderator note: {vacancy.moderationNote}
                    </p>
                  ) : null}

                  {outcomes.length === 0 ? (
                    <p className="rounded-xl border border-line bg-paper p-3 text-xs text-muted">
                      No moderation action is available for this state.
                    </p>
                  ) : (
                    <form
                      action={setVacancyModerationAction}
                      className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
                    >
                      <input type="hidden" name="vacancyId" value={vacancy.id} />
                      <div>
                        <label
                          htmlFor={`outcome-${vacancy.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Action
                        </label>
                        <select
                          id={`outcome-${vacancy.id}`}
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
                          htmlFor={`notes-${vacancy.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Reason (recorded in the audit log)
                        </label>
                        <input
                          id={`notes-${vacancy.id}`}
                          name="notes"
                          maxLength={2000}
                          placeholder="What was found and why this action is needed."
                          className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600"
                      >
                        Apply
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
        basePath="/admin/vacancies"
        searchParams={params}
      />
    </div>
  );
}

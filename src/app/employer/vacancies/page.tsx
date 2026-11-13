import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, Pencil, Plus, RotateCcw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser, getEmployerVacancies } from "@/lib/queries";
import { daysAgo, formatDate } from "@/lib/utils";
import { checkPublishable } from "@/lib/vacancy";
import {
  expireVacancyAction,
  publishVacancyAction,
  reconfirmVacancyAction,
} from "@/app/employer/actions";

export const dynamic = "force-dynamic";

export default async function EmployerVacanciesPage() {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  const vacancies = await getEmployerVacancies(company.id);

  return (
    <div>
      <PageHeader
        title="Vacancies"
        description="Structured, dated and reconfirmed. What drivers see is what you declared."
        action={
          <ButtonLink href="/employer/vacancies/new" variant="primary" size="sm">
            <Plus size={14} /> New vacancy
          </ButtonLink>
        }
      />

      {vacancies.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center">
            <p className="text-sm font-semibold">No vacancies yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Create a structured vacancy. You can save a draft and publish once the required conditions are
              complete.
            </p>
            <ButtonLink href="/employer/vacancies/new" variant="primary" size="sm" className="mt-4">
              Create vacancy
            </ButtonLink>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {vacancies.map((vacancy) => {
            const age = daysAgo(vacancy.lastConfirmedAt);
            const stale = age === null || age > 30;
            const publishable = checkPublishable(vacancy);
            const live = ["published_verified", "published_unverified", "confirmed", "reconfirmation_required"].includes(
              vacancy.status,
            );
            return (
              <Card key={vacancy.id}>
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={
                            vacancy.status === "confirmed"
                              ? "success"
                              : vacancy.status === "published_verified"
                                ? "info"
                                : vacancy.status === "draft"
                                  ? "neutral"
                                  : vacancy.status === "expired"
                                    ? "danger"
                                    : "warning"
                          }
                        >
                          {vacancy.status.replaceAll("_", " ")}
                        </Badge>
                        {stale && live ? <Badge tone="warning"><AlertTriangle size={11} /> reconfirmation due</Badge> : null}
                        <Badge tone="outline">{vacancy.infoScore}% info</Badge>
                      </div>
                      <h3 className="mt-2 text-[1rem] font-semibold">{vacancy.title}</h3>
                      <p className="text-xs text-muted">
                        {vacancy.city ? `${vacancy.city}, ` : ""}
                        {vacancy.country} · created {formatDate(vacancy.createdAt)} · last confirmed{" "}
                        {vacancy.lastConfirmedAt ? formatDate(vacancy.lastConfirmedAt) : "never"} ·{" "}
                        {vacancy.viewCount} views
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/employer/vacancies/${vacancy.id}/edit`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs text-ink-soft hover:bg-paper"
                      >
                        <Pencil size={12} /> Edit
                      </Link>
                      {live ? (
                        <Link
                          href={`/jobs/${vacancy.slug}`}
                          target="_blank"
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line-strong px-3 text-xs text-ink-soft hover:bg-paper"
                        >
                          <ExternalLink size={12} /> View
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    {vacancy.status === "draft" || vacancy.status === "expired" ? (
                      publishable.ok ? (
                        <form action={publishVacancyAction}>
                          <input type="hidden" name="vacancyId" value={vacancy.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-solid px-3 text-xs font-medium text-white hover:bg-brand-600"
                          >
                            <CheckCircle2 size={12} /> Publish now
                          </button>
                        </form>
                      ) : (
                        <Link
                          href={`/employer/vacancies/${vacancy.id}/edit`}
                          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-warning-soft px-3 text-xs font-medium text-warning"
                        >
                          <AlertTriangle size={12} /> Complete fields to publish
                        </Link>
                      )
                    ) : null}

                    {live ? (
                      <>
                        <form action={reconfirmVacancyAction}>
                          <input type="hidden" name="vacancyId" value={vacancy.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-3 text-xs font-medium text-success hover:bg-success/10"
                          >
                            <RotateCcw size={12} /> Reconfirm still open
                          </button>
                        </form>
                        <form action={expireVacancyAction}>
                          <input type="hidden" name="vacancyId" value={vacancy.id} />
                          <button
                            type="submit"
                            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-muted hover:border-danger/30 hover:text-danger"
                          >
                            <XCircle size={12} /> Mark filled / expire
                          </button>
                        </form>
                      </>
                    ) : null}

                    {!publishable.ok && vacancy.status === "draft" ? (
                      <p className="text-[0.7rem] text-muted">
                        Missing: {publishable.missing.slice(0, 3).join(", ")}
                        {publishable.missing.length > 3 ? ` +${publishable.missing.length - 3} more` : ""}
                      </p>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-4">
        <CardBody className="text-xs leading-relaxed text-muted">
          <p className="font-medium text-ink-soft">Why reconfirmation matters</p>
          <p className="mt-1">
            A vacancy that is no longer open wastes a driver’s time and damages trust. Roles older than 30
            days without confirmation are flagged to drivers as “reconfirmation overdue” and drop in ranking.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

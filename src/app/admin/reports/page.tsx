import { Flag } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { requireAdminPage } from "@/lib/guards";
import {
  adminEnumFilter,
  adminPage,
  listAdminReports,
  ADMIN_PAGE_SIZE,
} from "@/lib/admin-queries";
import { resolveReportAction } from "@/app/admin/actions";
import { contentReports } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const OUTCOME_LABELS: Record<string, string> = {
  investigating: "Mark investigating",
  resolved: "Resolve report",
  dismissed: "Dismiss report",
};

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "info" {
  if (status === "open") return "danger";
  if (status === "investigating") return "warning";
  if (status === "resolved") return "success";
  if (status === "dismissed") return "neutral";
  return "info";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; error?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const status = adminEnumFilter(params.status, contentReports.status.enumValues, "all");
  const page = adminPage(params.page);
  const result = await listAdminReports({ status, page });

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Driver and public reports about reviews, vacancies, companies or messages. Every decision is recorded against the moderator and the previous report state."
      />

      {params.error === "terminal_state" ? (
        <div className="mb-4 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          Resolved and dismissed reports are closed. Reopening one requires a new report.
        </div>
      ) : null}

      <Card className="mb-4">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <label htmlFor="report-status" className="mb-1 block text-xs font-medium">
                Status
              </label>
              <select
                id="report-status"
                name="status"
                defaultValue={status}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                {contentReports.status.enumValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
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
            <Flag size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">No reports match</p>
            <p className="mt-1 text-sm text-muted">Try a different status filter.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.rows.map(({ report, reporter }) => {
            const terminal = report.status === "resolved" || report.status === "dismissed";
            const outcomes = terminal
              ? []
              : report.status === "open"
                ? (["investigating", "resolved", "dismissed"] as const)
                : (["resolved", "dismissed"] as const);

            return (
              <Card key={report.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{report.reason}</CardTitle>
                      <Badge tone={statusTone(report.status)}>{report.status}</Badge>
                      <Badge tone="neutral">{report.targetType}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {reporter
                        ? `${reporter.displayName} · ${reporter.email}`
                        : "Anonymous reporter"}{" "}
                      · {formatDate(report.createdAt)}
                    </p>
                  </div>
                  <span className="font-mono text-[0.65rem] text-muted">{report.targetId}</span>
                </CardHeader>
                <CardBody className="space-y-4">
                  <p className="whitespace-pre-line rounded-xl bg-paper p-4 text-sm leading-relaxed text-ink-soft">
                    {report.details ?? "No further detail was provided."}
                  </p>

                  {report.resolutionNotes ? (
                    <p className="rounded-xl border border-line p-3 text-xs text-ink-soft">
                      Resolution: {report.resolutionNotes}
                    </p>
                  ) : null}

                  {outcomes.length === 0 ? (
                    <p className="rounded-xl border border-line bg-paper p-3 text-xs text-muted">
                      This report is closed. No further moderation action is available.
                    </p>
                  ) : (
                    <form
                      action={resolveReportAction}
                      className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
                    >
                      <input type="hidden" name="reportId" value={report.id} />
                      <div>
                        <label
                          htmlFor={`report-outcome-${report.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Action
                        </label>
                        <select
                          id={`report-outcome-${report.id}`}
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
                          htmlFor={`report-notes-${report.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          Resolution notes (recorded in the audit log)
                        </label>
                        <input
                          id={`report-notes-${report.id}`}
                          name="notes"
                          maxLength={2000}
                          placeholder="What was checked and the outcome."
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
        basePath="/admin/reports"
        searchParams={params}
      />
    </div>
  );
}

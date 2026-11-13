import Link from "next/link";
import { ArrowRight, BadgeCheck, Flag, ShieldAlert, Star, Truck, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/lib/guards";
import {
  getAdminStats,
  getPendingVerifications,
  getReports,
  getAdminReviews,
  getAuditLogs,
  getPendingReviewResponses,
} from "@/lib/queries";
import { moderateResponseAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const [stats, pendingVerifications, openReports, pendingReviews, pendingResponses, audit] = await Promise.all([
    getAdminStats(),
    getPendingVerifications(),
    getReports("open"),
    getAdminReviews("pending"),
    getPendingReviewResponses(),
    getAuditLogs(8),
  ]);

  return (
    <div>
      <PageHeader
        title="Moderation overview"
        description="Trust operations for the pilot: verification, vacancies, reviews and reports. Every action is logged."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Verified employers", value: stats.companies.verified, sub: `${stats.companies.pending} pending`, icon: BadgeCheck, href: "/admin/verifications" },
          { label: "Active vacancies", value: stats.vacancies.active, sub: `${stats.vacancies.stale} need reconfirmation`, icon: Truck, href: "/admin/vacancies" },
          { label: "Pending reviews", value: stats.reviews.pending, sub: `${stats.reviews.published} published`, icon: Star, href: "/admin/reviews" },
          { label: "Open reports", value: stats.reports.open, sub: `${stats.reports.total} total`, icon: Flag, href: "/admin/reports" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong">
            <stat.icon size={16} className="text-brand" />
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="mt-1 text-[0.7rem] text-muted">{stat.sub}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Verification queue</CardTitle>
            <Link href="/admin/verifications" className="text-xs text-brand underline-offset-4 hover:underline">All</Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {pendingVerifications.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted">Queue is empty.</p>
            ) : (
              pendingVerifications.slice(0, 4).map((row) => (
                <div key={row.company.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div>
                    <p className="text-sm font-medium">{row.company.legalName}</p>
                    <p className="text-xs text-muted">{row.company.country} · submitted {formatDate(row.company.updatedAt)}</p>
                  </div>
                  <Badge tone="warning">{row.company.verificationStatus.replaceAll("_", " ")}</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Review moderation</CardTitle>
            <Link href="/admin/reviews" className="text-xs text-brand underline-offset-4 hover:underline">All</Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {pendingReviews.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted">No reviews awaiting moderation.</p>
            ) : (
              pendingReviews.slice(0, 4).map((row) => (
                <div key={row.review.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{row.review.title}</p>
                    <Badge tone="warning">{row.review.overallRating}/5</Badge>
                  </div>
                  <p className="text-xs text-muted">{row.company.legalName} · {formatDate(row.review.createdAt)}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Open reports</CardTitle>
            <Link href="/admin/reports" className="text-xs text-brand underline-offset-4 hover:underline">All</Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {openReports.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted">No open reports.</p>
            ) : (
              openReports.slice(0, 4).map((row) => (
                <div key={row.report.id} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div>
                    <p className="text-sm font-medium">{row.report.reason}</p>
                    <p className="text-xs text-muted">
                      {row.report.targetType} · {formatDate(row.report.createdAt)}
                    </p>
                  </div>
                  <Badge tone="danger"><Flag size={11} /> open</Badge>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Employer replies awaiting moderation</CardTitle>
            <Badge tone="warning">{pendingResponses.length} pending</Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            {pendingResponses.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted">No replies awaiting moderation.</p>
            ) : (
              pendingResponses.slice(0, 4).map((row) => (
                <div key={row.response.id} className="rounded-xl border border-line p-3">
                  <p className="text-sm font-medium">{row.company.tradingName ?? row.company.legalName}</p>
                  <p className="text-xs text-muted">
                    Reply to “{row.review.title}” · {formatDate(row.response.createdAt)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-ink-soft">{row.response.body}</p>
                  <form action={moderateResponseAction} className="mt-2 space-y-2">
                    <input type="hidden" name="responseId" value={row.response.id} />
                    <input
                      name="notes"
                      required
                      minLength={10}
                      maxLength={2000}
                      placeholder="Reason (recorded in the audit log)"
                      className="w-full rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        name="outcome"
                        value="publish"
                        className="rounded-full bg-success-soft px-3 py-1 text-[0.7rem] font-medium text-success"
                      >
                        Publish reply
                      </button>
                      <button
                        type="submit"
                        name="outcome"
                        value="reject"
                        className="rounded-full bg-danger-soft px-3 py-1 text-[0.7rem] font-medium text-danger"
                      >
                        Reject
                      </button>
                    </div>
                  </form>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent admin actions</CardTitle>
            <Link href="/admin/audit" className="text-xs text-brand underline-offset-4 hover:underline">Audit log</Link>
          </CardHeader>
          <CardBody className="space-y-2">
            {audit.length === 0 ? (
              <p className="py-5 text-center text-sm text-muted">No actions recorded yet.</p>
            ) : (
              audit.map((row) => (
                <div key={row.log.id} className="flex items-start justify-between gap-3 text-xs">
                  <p className="text-ink-soft">
                    <span className="font-medium text-ink">{row.actor?.displayName ?? "system"}</span>{" "}
                    {row.log.action}
                  </p>
                  <span className="shrink-0 text-muted">{formatDate(row.log.createdAt)}</span>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 text-xs leading-relaxed text-muted">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <ShieldAlert size={15} className="text-warning" /> Moderation guardrails
        </p>
        <p className="mt-2">
          Never publish an unsubstantiated criminal allegation as fact. Verification is never granted because a
          company paid. Review removal requires a documented policy breach. All decisions are written to the
          audit log with the moderator’s identity and reasoning.
        </p>
        <p className="mt-2 flex items-center gap-2">
          <Users size={12} /> {stats.drivers} driver accounts · {stats.enquiries} enquiries sent
        </p>
      </div>
    </div>
  );
}

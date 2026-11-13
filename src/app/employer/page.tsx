import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Eye,
  Plus,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";
import { and, eq } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { identityChecked, isFullyVerified, roleCheckLabel } from "@/lib/verification";
import { requireEmployerPage } from "@/lib/guards";
import {
  getCompanyForUser,
  getCompanyRatingBreakdown,
  getEmployerEnquiries,
  getEmployerReviews,
  getEmployerVacancies,
} from "@/lib/queries";
import { db } from "@/lib/db";
import { reviewResponses, vacancies } from "@/db/schema";
import { daysAgo, formatDate } from "@/lib/utils";
import { vacancyStatusLabel } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function EmployerDashboardPage() {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  const [allVacancies, enquiries, reviews, breakdown, responses] = await Promise.all([
    getEmployerVacancies(company.id),
    getEmployerEnquiries(company.id),
    getEmployerReviews(company.id),
    getCompanyRatingBreakdown(company.id),
    db.select().from(reviewResponses).where(eq(reviewResponses.companyId, company.id)),
  ]);

  const active = allVacancies.filter((v) =>
    ["published_verified", "published_unverified", "confirmed", "reconfirmation_required"].includes(v.status),
  );
  const stale = active.filter((v) => {
    const age = daysAgo(v.lastConfirmedAt);
    return age === null || age > 30;
  });
  const newEnquiries = enquiries.filter((row) => row.enquiry.status === "sent");
  const unpublishedReviews = reviews.filter(
    (row) => !responses.some((response) => response.reviewId === row.review.id),
  );

  return (
    <div>
      <PageHeader
        title={company.tradingName ?? company.legalName}
        description="Your company workspace: verification, vacancies, enquiries and review responses."
        action={
          <ButtonLink href="/employer/vacancies/new" variant="primary" size="sm">
            <Plus size={14} /> New vacancy
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <BadgeCheck size={18} className="mt-0.5 text-brand" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">Verification status</p>
              <VerificationBadge status={company.verificationStatus} companyType={company.companyType} verificationVersion={company.verificationVersion} />
            </div>
            <p className="mt-1 text-xs text-muted">
              {company.verificationStatus === "verified"
                ? `Legal identity and ${roleCheckLabel(company.companyType).toLowerCase()} checked ${formatDate(company.verifiedAt)}.`
                : identityChecked(company.verificationStatus, company.verificationVersion)
                  ? "Legal identity is checked. The recruitment role is still awaiting confirmation."
                  : "Submit evidence to have your legal identity and recruitment role checked."}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/employer/verification" className="text-xs font-medium text-brand underline-offset-4 hover:underline">
            {company.verificationStatus === "unverified" ? "Start verification" : "Verification details"} →
          </Link>
        </div>
      </div>

      {stale.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/25 bg-warning-soft px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={17} className="mt-0.5 text-warning" />
            <div>
              <p className="text-sm font-medium text-warning">
                {stale.length} vacancy{stale.length > 1 ? "ies" : ""} need reconfirmation
              </p>
              <p className="text-xs text-ink-soft">
                Vacancies are shown as current only while confirmed. Reconfirm that the role is still open.
              </p>
            </div>
          </div>
          <ButtonLink href="/employer/vacancies" variant="secondary" size="sm">
            Review vacancies
          </ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Active vacancies", value: active.length, icon: Truck, href: "/employer/vacancies" },
          { label: "New enquiries", value: newEnquiries.length, icon: ClipboardList, href: "/employer/enquiries" },
          { label: "Published reviews", value: breakdown.count, icon: Star, href: "/employer/reviews" },
          {
            label: "Awaiting reply",
            value: unpublishedReviews.length,
            icon: Eye,
            href: "/employer/reviews",
          },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong">
            <stat.icon size={16} className="text-brand" />
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Latest vacancies</CardTitle>
            <Link href="/employer/vacancies" className="text-xs text-brand underline-offset-4 hover:underline">
              Manage all
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {allVacancies.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium">No vacancies yet</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
                  Publish a structured vacancy so drivers can compare real conditions.
                </p>
                <ButtonLink href="/employer/vacancies/new" variant="primary" size="sm" className="mt-3">
                  Create the first vacancy
                </ButtonLink>
              </div>
            ) : (
              allVacancies.slice(0, 5).map((vacancy) => (
                <div key={vacancy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{vacancy.title}</p>
                    <p className="text-xs text-muted">
                      {vacancyStatusLabel(vacancy.status, isFullyVerified(company.verificationStatus, company.verificationVersion))} · {vacancy.viewCount} views ·{" "}
                      {vacancy.infoScore}% info
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={vacancy.status === "confirmed" || vacancy.status === "published_verified" ? "success" : vacancy.status === "draft" ? "neutral" : "warning"}>
                      {vacancy.status.replaceAll("_", " ")}
                    </Badge>
                    <Link href={`/employer/vacancies/${vacancy.id}/edit`} className="text-xs text-brand underline-offset-4 hover:underline">
                      Edit
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>New enquiries</CardTitle>
              <Link href="/employer/enquiries" className="text-xs text-brand underline-offset-4 hover:underline">
                Inbox
              </Link>
            </CardHeader>
            <CardBody className="space-y-3">
              {newEnquiries.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted">
                  No unread enquiries. Drivers contact you directly — replies go to the contact details they shared.
                </p>
              ) : (
                newEnquiries.slice(0, 3).map((row) => (
                  <div key={row.enquiry.id} className="rounded-xl bg-paper p-3">
                    <p className="text-xs font-medium">{row.driverName}</p>
                    <p className="text-[0.7rem] text-muted">{row.vacancy?.title ?? "General enquiry"}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{row.enquiry.message}</p>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-xs leading-relaxed text-ink-soft">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <ShieldCheck size={14} className="text-brand" /> Trust reminder
              </p>
              <p className="mt-2">
                Payment never changes verification status, ranking or review visibility. If a driver reports a
                misleading vacancy, moderators may suspend it pending correction.
              </p>
              <Link href="/how-verification-works" className="mt-2 inline-block font-medium text-brand underline-offset-4 hover:underline">
                How verification works →
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Profile completeness</p>
            <p className="text-xs text-muted">
              {company.description ? "Company description present." : "Add a company description."} ·{" "}
              {company.website ? "Website present." : "Add a website."} · {company.sectors.length} sectors declared.
            </p>
          </div>
          <ButtonLink href="/employer/company" variant="secondary" size="sm">
            Edit company profile <ArrowRight size={14} />
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  EyeOff,
  FileWarning,
  Lock,
  Search,
  Send,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard-shell";
import { requireDriverPage } from "@/lib/guards";
import { getDriverDashboard } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PROFILE_FIELDS = [
  "firstName",
  "countryOfResidence",
  "languages",
  "licenceCategories",
  "yearsExperience",
  "transportExperience",
  "preferredCategories",
  "preferredCountries",
  "preferredRotation",
  "availability",
] as const;

export default async function DriverDashboardPage() {
  const user = await requireDriverPage();
  const { enquiries, savedJobs, reviews, profile } = await getDriverDashboard(user.id);

  const completed = profile
    ? PROFILE_FIELDS.filter((field) => {
        const value = profile[field];
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined && value !== "";
      }).length
    : 0;
  const completeness = Math.round((completed / PROFILE_FIELDS.length) * 100);
  const publishedReviews = reviews.filter((r) => r.review.status === "published").length;
  const pendingReviews = reviews.filter((r) => r.review.status === "pending" || r.review.status === "under_review").length;

  return (
    <div>
      <PageHeader
        title={`Good to see you, ${user.displayName.split(" ")[0]}`}
        description="Your search, your privacy and your decisions. Everything here is private unless you choose to share it."
        action={
          <ButtonLink href="/jobs" variant="primary" size="sm">
            <Search size={14} /> Find roles
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Saved vacancies", value: savedJobs.length, icon: Bookmark, href: "/dashboard/saved" },
          { label: "Enquiries sent", value: enquiries.length, icon: Send, href: "/dashboard/applications" },
          { label: "Published reviews", value: publishedReviews, icon: Star, href: "/dashboard/reviews" },
          { label: "Profile complete", value: `${completeness}%`, icon: UserRound, href: "/dashboard/profile" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-2xl border border-line bg-surface p-4 transition hover:border-line-strong">
            <stat.icon size={16} className="text-brand" />
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
            <p className="text-xs text-muted">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Your privacy posture</CardTitle>
            <Badge tone="success">
              <Lock size={11} /> Private by default
            </Badge>
          </CardHeader>
          <CardBody className="space-y-3">
            {[
              {
                icon: EyeOff,
                title: "Profile visibility",
                value: "Private — employers cannot browse or search profiles in this pilot",
              },
              {
                icon: Search,
                title: "Contact requests",
                value: "Not offered. An employer sees only what you send in an enquiry",
              },
              {
                icon: Send,
                title: "Contact sharing",
                value: "Only when you tick the box per enquiry",
              },
              {
                icon: UserRound,
                title: "Current employer",
                value: "Never shown publicly",
              },
            ].map((row) => (
              <div key={row.title} className="flex items-start gap-3 rounded-xl bg-paper px-4 py-3">
                <row.icon size={15} className="mt-0.5 shrink-0 text-muted" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-ink">{row.title}</p>
                  <p className="text-xs text-muted">{row.value}</p>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-2 pt-1">
              <ButtonLink href="/dashboard/profile" variant="secondary" size="sm">
                Edit profile
              </ButtonLink>
              <ButtonLink href="/dashboard/settings" variant="ghost" size="sm">
                Privacy settings
              </ButtonLink>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Complete your profile</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{completed} of {PROFILE_FIELDS.length} fields</span>
              <span className="font-medium text-ink">{completeness}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-accent" style={{ width: `${completeness}%` }} />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              A complete profile makes enquiries more credible. It is never published — employers only see
              what you send them.
            </p>
            {pendingReviews > 0 ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning">
                <FileWarning size={13} className="mt-0.5 shrink-0" />
                {pendingReviews} review{pendingReviews > 1 ? "s" : ""} awaiting moderation.
              </p>
            ) : null}
            {completeness < 100 ? (
              <ButtonLink href="/dashboard/profile" variant="primary" size="sm" className="mt-3 w-full">
                {completeness === 0 ? "Create your driver profile" : "Finish profile"} <ArrowRight size={14} />
              </ButtonLink>
            ) : (
              <p className="mt-3 flex items-center gap-2 text-xs text-success">
                <CheckCircle2 size={13} /> Profile complete
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent enquiries</CardTitle>
            <Link href="/dashboard/applications" className="text-xs text-brand underline-offset-4 hover:underline">
              All
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {enquiries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                No enquiries yet. Find a role that answers your questions, then message the employer directly.
              </p>
            ) : (
              enquiries.slice(0, 4).map((row) => (
                <div key={row.enquiry.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{row.vacancy?.title ?? "General enquiry"}</p>
                      <p className="text-xs text-muted">{row.company.tradingName ?? row.company.legalName}</p>
                    </div>
                    <Badge tone={row.enquiry.status === "responded" ? "success" : "neutral"}>
                      {row.enquiry.status}
                    </Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-ink-soft">{row.enquiry.message}</p>
                  <p className="mt-2 text-[0.65rem] text-muted">Sent {formatDate(row.enquiry.createdAt)}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Saved for later</CardTitle>
            <Link href="/dashboard/saved" className="text-xs text-brand underline-offset-4 hover:underline">
              All
            </Link>
          </CardHeader>
          <CardBody className="space-y-3">
            {savedJobs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">
                Save vacancies while you compare. Your list stays private.
              </p>
            ) : (
              savedJobs.slice(0, 4).map((row) => (
                <div key={row.vacancy.id} className="rounded-xl border border-line p-3">
                  <Link href={`/jobs/${row.vacancy.slug}`} className="text-sm font-medium underline-offset-4 hover:underline">
                    {row.vacancy.title}
                  </Link>
                  <p className="text-xs text-muted">
                    {row.company.tradingName ?? row.company.legalName} · {row.vacancy.rotation ?? "rotation not stated"}
                  </p>
                  <p className="mt-1 text-[0.65rem] text-muted">Last confirmed {formatDate(row.vacancy.lastConfirmedAt)}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-brand-100/60 px-5 py-4">
        <ShieldCheck size={18} className="text-brand" />
        <p className="flex-1 text-xs leading-relaxed text-ink-soft">
          Employers never pay for access to your profile, and DriverCompass never sells it. If an employer asks
          you to pay for a job or an introduction, report it.
        </p>
        <Link href="/review-policy" className="text-xs font-medium text-brand underline-offset-4 hover:underline">
          Report guidance
        </Link>
      </div>
    </div>
  );
}

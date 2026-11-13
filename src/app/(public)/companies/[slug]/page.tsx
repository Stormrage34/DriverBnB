import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  ExternalLink,
  Factory,
  Flag,
  Globe2,
  MapPin,
  MessageSquareQuote,
  ShieldCheck,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { VerificationBadge } from "@/components/verification-badge";
import {
  identityChecked,
  isFullyVerified,
  roleCheckLabel,
  roleChecked,
} from "@/lib/verification";
import { Stars, RatingBar } from "@/components/rating";
import { ReviewCard } from "@/components/review-card";
import { VacancyCard } from "@/components/vacancy-card";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  accommodationLabel,
  categoryLabel,
  companyTypeLabel,
  countryName,
  loadingLabel,
} from "@/lib/constants";
import {
  getCompanyActiveVacancies,
  getCompanyBySlug,
  getCompanyRatingBreakdown,
  getCompanyReviews,
  isCompanySaved,
  ratingMap,
} from "@/lib/queries";
import { formatDate, formatMoney } from "@/lib/utils";
import { toggleSavedCompanyAction } from "@/app/dashboard/actions";
import { monthlyEquivalent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company) return { title: "Company not found" };
  return {
    title: `${company.tradingName ?? company.legalName} — company profile`,
    description: company.description ?? undefined,
  };
}

export default async function CompanyProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await getCompanyBySlug(slug);
  if (!company || company.verificationStatus === "suspended") notFound();

  const [vacancies, reviews, breakdown, user] = await Promise.all([
    getCompanyActiveVacancies(company.id),
    getCompanyReviews(company.id),
    getCompanyRatingBreakdown(company.id),
    getCurrentUser(),
  ]);

  const saved = user?.role === "driver" ? await isCompanySaved(user.id, company.id) : false;
  const ratings = await ratingMap(vacancies.map((v) => company.id));

  const monthlyPay = vacancies
    .map((v) => monthlyEquivalent(v.grossPayMin, v.payPeriod))
    .filter((v): v is number => v !== null);
  const monthlyPayMax = vacancies
    .map((v) => monthlyEquivalent(v.grossPayMax ?? v.grossPayMin, v.payPeriod))
    .filter((v): v is number => v !== null);

  const accommodationSet = [...new Set(vacancies.map((v) => accommodationLabel(v.accommodation)))];
  const loadingSet = [...new Set(vacancies.map((v) => loadingLabel(v.loadingUnloading)))];
  const rotations = [...new Set(vacancies.map((v) => v.rotation).filter((v): v is string => Boolean(v)))];
  const languages = [...new Set(vacancies.flatMap((v) => v.languagesRequired))];

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.review.overallRating) === star).length,
  }));
  const totalReviews = reviews.length || 1;

  const identityDone = identityChecked(company.verificationStatus, company.verificationVersion);
  const roleDone = roleChecked(company.verificationStatus, company.verificationVersion);
  const fullVerified = isFullyVerified(company.verificationStatus, company.verificationVersion);
  const checks = [
    { label: "Company registered on DriverCompass", done: true },
    { label: "Legal identity checked against the company registry", done: identityDone },
    { label: roleCheckLabel(company.companyType), done: roleDone },
    { label: "Full verified badge granted", done: fullVerified },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/companies" className="hover:underline">Companies</Link>
        <span>/</span>
        <span className="text-ink-soft">{company.tradingName ?? company.legalName}</span>
      </nav>

      <header className="mt-4 rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand">
              <Factory size={24} strokeWidth={1.6} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <VerificationBadge status={company.verificationStatus} companyType={company.companyType} verificationVersion={company.verificationVersion} />
                <Badge tone={company.companyType === "direct_employer" ? "info" : "warning"}>
                  {companyTypeLabel(company.companyType)}
                </Badge>
                {company.isDemoSeed ? <Badge tone="neutral">Demo profile</Badge> : null}
                {company.operatesOwnFleet ? <Badge tone="outline">Own fleet</Badge> : null}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {company.tradingName ?? company.legalName}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted">
                <span className="inline-flex items-center gap-1"><MapPin size={13} /> {countryName(company.country)}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1"><Truck size={13} /> {company.sectors.join(", ") || "Transport"}</span>
                {company.fleetSize ? (
                  <>
                    <span>·</span>
                    <span>{company.fleetSize} vehicles</span>
                  </>
                ) : null}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Stars value={breakdown.average} />
                <span className="font-medium text-ink">
                  {breakdown.average === null ? "No rating" : `${breakdown.average.toFixed(1)} / 5`}
                </span>
                <span>· {breakdown.count} published reviews</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {company.website ? (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink-soft hover:bg-paper"
              >
                Website <ExternalLink size={13} />
              </a>
            ) : null}
            {user?.role === "driver" ? (
              <form action={toggleSavedCompanyAction}>
                <input type="hidden" name="companyId" value={company.id} />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink-soft hover:bg-paper"
                >
                  {saved ? <BookmarkCheck size={14} className="text-brand" /> : <Bookmark size={14} />}
                  {saved ? "Saved" : "Save company"}
                </button>
              </form>
            ) : null}
            <Link
              href={`/report?type=company&id=${company.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted hover:bg-ink/[0.04]"
            >
              <Flag size={13} /> Report
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-4">
          <div>
            <p className="text-[0.7rem] uppercase tracking-wider text-muted">Open vacancies</p>
            <p className="mt-1 text-lg font-semibold">{vacancies.length}</p>
          </div>
          <div>
            <p className="text-[0.7rem] uppercase tracking-wider text-muted">Gross pay range</p>
            <p className="mt-1 text-sm font-semibold">
              {monthlyPay.length ? (
                <>
                  {formatMoney(Math.min(...monthlyPay), "EUR")}
                  {monthlyPayMax.length && Math.max(...monthlyPayMax) !== Math.min(...monthlyPay)
                    ? ` – ${formatMoney(Math.max(...monthlyPayMax), "EUR")}`
                    : ""}
                  <span className="ml-1 text-[0.7rem] font-normal text-muted">/ month</span>
                </>
              ) : (
                "No active vacancies"
              )}
            </p>
          </div>
          <div>
            <p className="text-[0.7rem] uppercase tracking-wider text-muted">Profile updated</p>
            <p className="mt-1 text-sm font-semibold">{formatDate(company.updatedAt)}</p>
          </div>
          <div>
            <p className="text-[0.7rem] uppercase tracking-wider text-muted">Registration no.</p>
            <p className="mt-1 font-mono text-xs">{company.registrationNumber ?? "—"}</p>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>About the company</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {company.description ||
                  "This company has not written a description yet. The structured fields below are still the primary source."}
              </p>
              <dl className="grid gap-4 border-t border-line pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">Legal name</dt>
                  <dd className="mt-1 font-medium">{company.legalName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">Registered address</dt>
                  <dd className="mt-1">{company.registeredAddress ?? "Not provided"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">Contracting entity</dt>
                  <dd className="mt-1">{company.contractingEntity ?? company.legalName}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">Recruits directly</dt>
                  <dd className="mt-1">{company.recruitsDirectly ? "Yes — declared direct employer" : "No / not declared"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">Business email</dt>
                  <dd className="mt-1">{company.businessEmail ?? "Not public"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">Languages in vacancies</dt>
                  <dd className="mt-1">{languages.join(", ") || "Not stated"}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {vacancies.length > 0 ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Declared conditions across open vacancies</CardTitle>
                <span className="text-xs text-muted">{vacancies.length} roles</span>
              </CardHeader>
              <CardBody>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Accommodation arrangements</dt>
                    <dd className="mt-1">{accommodationSet.join(" · ") || "Not stated"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Loading / unloading</dt>
                    <dd className="mt-1">{loadingSet.join(" · ") || "Not stated"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Rotations offered</dt>
                    <dd className="mt-1">{rotations.join(" · ") || "Not stated"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">Transport categories</dt>
                    <dd className="mt-1">
                      {[...new Set(vacancies.map((v) => categoryLabel(v.transportCategory)))].join(" · ")}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-muted">
                  These are employer-declared facts about individual vacancies. They are not a company-wide
                  guarantee — always check the vacancy you apply for.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Open vacancies</h2>
                <p className="mt-1 text-sm text-muted">Confirmed roles, structured conditions, direct contact.</p>
              </div>
              <Link href="/jobs" className="text-sm font-medium text-brand underline-offset-4 hover:underline">
                All jobs <ArrowRight className="inline" size={14} />
              </Link>
            </div>
            {vacancies.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface/60 px-5 py-8 text-sm text-muted">
                This company has no active vacancies on DriverCompass right now. Save the profile to check later.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {vacancies.map((vacancy) => (
                  <VacancyCard
                    key={vacancy.id}
                    vacancy={vacancy}
                    company={company}
                    rating={{ average: breakdown.average, count: breakdown.count }}
                  />
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Driver reviews</CardTitle>
                <p className="mt-1 text-xs text-muted">
                  Published reviews of measurable employment conditions, with a right of reply.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold">{breakdown.average === null ? "—" : breakdown.average.toFixed(1)}</span>
                <div>
                  <Stars value={breakdown.average} />
                  <p className="text-[0.7rem] text-muted">{breakdown.count} reviews</p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {breakdown.count > 0 ? (
                <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const item = distribution.find((d) => d.star === star);
                      return (
                        <div key={star} className="flex items-center gap-2 text-xs text-muted">
                          <span className="w-8">{star}★</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                            <span
                              className="block h-full rounded-full bg-accent"
                              style={{ width: `${((item?.count ?? 0) / totalReviews) * 100}%` }}
                            />
                          </span>
                          <span className="w-6 text-right tabular-nums">{item?.count ?? 0}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2.5">
                    {[
                      ["Payment reliability", breakdown.categories.paymentReliability],
                      ["Advert accuracy", breakdown.categories.advertAccuracy],
                      ["Dispatch & management", breakdown.categories.dispatchManagement],
                      ["Equipment", breakdown.categories.equipment],
                      ["Home time", breakdown.categories.homeTime],
                      ["Accommodation", breakdown.categories.accommodation],
                      ["Deductions", breakdown.categories.deductions],
                      ["Working conditions", breakdown.categories.workingConditions],
                    ].map(([label, value]) => (
                      <RatingBar key={String(label)} label={String(label)} value={value as number | null} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No published reviews yet. Reviews require a genuine employment experience and are moderated
                  for eligibility before publication.
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Link
                  href={`/companies/${company.slug}/reviews`}
                  className="text-sm font-medium text-brand underline-offset-4 hover:underline"
                >
                  Read all {breakdown.count} reviews <ArrowRight className="inline" size={14} />
                </Link>
                {user?.role === "driver" ? (
                  <ButtonLink href={`/dashboard/reviews/new?company=${company.slug}`} variant="secondary" size="sm">
                    <Star size={14} /> Review this employer
                  </ButtonLink>
                ) : user ? null : (
                  <ButtonLink href={`/login?next=/companies/${company.slug}`} variant="secondary" size="sm">
                    Log in to review
                  </ButtonLink>
                )}
              </div>
            </CardBody>
          </Card>

          {reviews.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight">Latest reviews</h2>
              {reviews.slice(0, 3).map((row) => (
                <ReviewCard
                  key={row.review.id}
                  review={row.review}
                  authorName={row.authorName}
                  responses={row.responses}
                />
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand" /> Verification record
              </CardTitle>
            </CardHeader>
            <CardBody>
              <ul className="space-y-3">
                {checks.map((check) => (
                  <li key={check.label} className="flex items-start gap-2.5 text-xs leading-relaxed">
                    <span
                      className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                        check.done ? "bg-success-soft text-success" : "border border-line-strong bg-surface text-transparent"
                      }`}
                    >
                      <BadgeCheck size={10} />
                    </span>
                    <span className={check.done ? "text-ink" : "text-muted"}>{check.label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-xl bg-paper p-3 text-[0.7rem] leading-relaxed text-muted">
                <p className="font-medium text-ink-soft">Checked by DriverCompass</p>
                <p className="mt-1">
                  Legal identity: {identityDone ? "checked" : "not checked"} · Recruitment role:{" "}
                  {roleDone ? "checked" : "not checked"}
                </p>
                <p className="mt-2 font-medium text-ink-soft">Provided by the employer</p>
                <p className="mt-1">Fleet size · sectors · working conditions · benefits</p>
              </div>

              {fullVerified ? (
                <p className="mt-3 flex items-center gap-1.5 text-[0.7rem] text-muted">
                  <CalendarClock size={12} /> Verified{" "}
                  {company.verifiedAt ? formatDate(company.verifiedAt) : "(date not recorded)"}
                </p>
              ) : (
                <p className="mt-3 text-[0.7rem] leading-relaxed text-warning">
                  {roleDone
                    ? "The recruitment role is checked, but full verification is not complete. Treat declared conditions with care."
                    : "Identity verification is not complete. Treat declared conditions with additional care."}
                </p>
              )}
              <Link
                href="/how-verification-works"
                className="mt-3 inline-block text-xs font-medium text-brand underline-offset-4 hover:underline"
              >
                What verification means
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-3 text-xs text-ink-soft">
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Building2 size={14} /> Company facts
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Country</span>
                <span>{countryName(company.country)}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Type</span>
                <span className="text-right">{companyTypeLabel(company.companyType)}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Own fleet</span>
                <span>{company.operatesOwnFleet ? "Yes" : "Not declared"}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Fleet size</span>
                <span>{company.fleetSize ?? "Not disclosed"}</span>
              </p>
              <p className="flex justify-between gap-3">
                <span className="text-muted">Last updated</span>
                <span>{formatDate(company.updatedAt)}</span>
              </p>
            </CardBody>
          </Card>

          <div className="rounded-2xl border border-line bg-brand-solid p-5 text-white">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Users size={15} className="text-accent" /> Driver-first rule
            </p>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Employer payment never affects verification, ranking or review publication. If you are asked to
              pay for a job, report it.
            </p>
            <Link href="/review-policy" className="mt-3 inline-block text-xs font-medium text-accent underline-offset-4 hover:underline">
              Read the review policy
            </Link>
          </div>

          {breakdown.count > 0 ? (
            <Card>
              <CardBody className="text-xs text-ink-soft">
                <p className="flex items-center gap-1.5 font-semibold text-ink">
                  <MessageSquareQuote size={14} /> Employer replies
                </p>
                <p className="mt-2 leading-relaxed text-muted">
                  Employers may reply publicly to any review. They cannot delete criticism or pay to change a
                  rating.
                </p>
              </CardBody>
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

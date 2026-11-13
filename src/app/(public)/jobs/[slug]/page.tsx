import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  BriefcaseBusiness,
  CalendarCheck2,
  Check,
  Euro,
  Clock,
  FileText,
  Flag,
  Globe2,
  GraduationCap,
  House,
  Languages,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  Weight,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EnquiryForm } from "@/components/enquiry-form";
import {
  identityChecked,
  isFullyVerified,
  roleCheckLabel,
  roleChecked,
} from "@/lib/verification";
import { RatingInline } from "@/components/rating";
import { VerificationBadge } from "@/components/verification-badge";
import { getCurrentUser } from "@/lib/auth";
import {
  accommodationLabel,
  applicationMethodLabel,
  categoryLabel,
  companyTypeLabel,
  contractTypeLabel,
  countryName,
  loadingLabel,
  payPeriodLabel,
  vacancyStatusLabel,
} from "@/lib/constants";
import {
  getDriverProfile,
  getVacancyBySlug,
  isVacancySaved,
} from "@/lib/queries";
import { daysAgo, formatDate, formatMoney, formatPayRange, monthlyEquivalent, relativeDays } from "@/lib/utils";
import { toggleSavedVacancyAction } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const row = await getVacancyBySlug(slug);
  if (!row) return { title: "Vacancy not found" };
  return {
    title: `${row.vacancy.title} — ${row.company.tradingName ?? row.company.legalName}`,
    description: `${categoryLabel(row.vacancy.transportCategory)} role in ${countryName(row.vacancy.country)}. Gross pay, rotation, home time and accommodation stated.`,
  };
}

export default async function VacancyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await getVacancyBySlug(slug);
  if (!row) notFound();

  const { vacancy, company, rating } = row;
  if (["draft", "expired", "suspended"].includes(vacancy.status)) notFound();

  const user = await getCurrentUser();
  const [saved, driverProfile] = await Promise.all([
    user?.role === "driver" ? isVacancySaved(user.id, vacancy.id) : Promise.resolve(false),
    user?.role === "driver" ? getDriverProfile(user.id) : Promise.resolve(null),
  ]);
  const stale = vacancy.status === "reconfirmation_required";
  const confirmedDays = daysAgo(vacancy.lastConfirmedAt);
  const monthlyMin = monthlyEquivalent(vacancy.grossPayMin, vacancy.payPeriod);
  const monthlyMax = monthlyEquivalent(vacancy.grossPayMax, vacancy.payPeriod);

  const conditions: Array<{ label: string; value: string; icon?: React.ReactNode; wide?: boolean }> = [
    { label: "Contract type", value: contractTypeLabel(vacancy.contractType), icon: <FileText size={14} /> },
    {
      label: "Contracting legal entity",
      value: vacancy.contractingEntity,
      icon: <BriefcaseBusiness size={14} />,
      wide: true,
    },
    { label: "Employment country", value: countryName(vacancy.country), icon: <Globe2 size={14} /> },
    { label: "Transport category", value: categoryLabel(vacancy.transportCategory), icon: <Truck size={14} /> },
    { label: "Rotation", value: vacancy.rotation ?? "—", icon: <Clock size={14} /> },
    { label: "Home time", value: vacancy.homeTime ?? "—", icon: <House size={14} /> },
    {
      label: "Weekly rest",
      value: vacancy.weeklyRest ?? "—",
      icon: <CalendarCheck2 size={14} />,
      wide: true,
    },
    {
      label: "Accommodation",
      value: `${accommodationLabel(vacancy.accommodation)}${
        vacancy.accommodationDetails ? ` — ${vacancy.accommodationDetails}` : ""
      }`,
      icon: <House size={14} />,
      wide: true,
    },
    {
      label: "Loading / unloading",
      value: loadingLabel(vacancy.loadingUnloading),
      icon: <Weight size={14} />,
    },
    { label: "Vehicle", value: vacancy.vehicleType ?? "—", icon: <Truck size={14} /> },
    { label: "Languages required", value: vacancy.languagesRequired.join(", ") || "None stated", icon: <Languages size={14} /> },
    { label: "Operating countries", value: vacancy.operatingCountries.join(", ") || "—", icon: <Globe2 size={14} /> },
    { label: "Experience required", value: vacancy.experienceRequirements ?? "Not stated" },
    { label: "Training provided", value: vacancy.trainingProvided ?? "Not stated", icon: <GraduationCap size={14} /> },
    { label: "Licence requirements", value: vacancy.licenceRequirements.join(", ") || "—" },
  ];

  const missing = [
    !vacancy.rotation && "rotation",
    !vacancy.homeTime && "home time",
    !vacancy.weeklyRest && "weekly rest",
    !vacancy.vehicleType && "vehicle",
    vacancy.accommodation === "not_disclosed" && "accommodation",
    vacancy.operatingCountries.length === 0 && "operating countries",
    vacancy.grossPayMin === null && vacancy.grossPayMax === null && "gross pay",
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        <Link href="/" className="hover:underline">Home</Link>
        <span>/</span>
        <Link href="/jobs" className="hover:underline">Jobs</Link>
        <span>/</span>
        <span className="text-ink-soft">{categoryLabel(vacancy.transportCategory)}</span>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <header className="rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="outline">{categoryLabel(vacancy.transportCategory)}</Badge>
              <VerificationBadge status={company.verificationStatus} companyType={company.companyType} verificationVersion={company.verificationVersion} />
              {stale ? (
                <Badge tone="warning">
                  <AlertTriangle size={12} /> Reconfirmation overdue
                </Badge>
              ) : null}
              {vacancy.status === "published_unverified" ? (
                <Badge tone="warning">Employer not verified</Badge>
              ) : null}
              {company.isDemoSeed ? <Badge tone="neutral">Demo data</Badge> : null}
            </div>

            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-[2.15rem]">
              {vacancy.title}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
              <Link href={`/companies/${company.slug}`} className="font-medium underline-offset-4 hover:underline">
                {company.tradingName ?? company.legalName}
              </Link>
              <span className="text-muted">·</span>
              <span className="inline-flex items-center gap-1 text-muted">
                <MapPin size={13} /> {vacancy.city ? `${vacancy.city}, ` : ""}
                {countryName(vacancy.country)}
              </span>
              <span className="text-muted">·</span>
              <RatingInline average={rating.average} count={rating.count} />
            </p>

            <div className="mt-6 grid gap-4 rounded-2xl bg-paper p-5 sm:grid-cols-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-wider text-muted">Gross pay</p>
                <p className="mt-1 text-xl font-semibold tracking-tight">
                  {formatPayRange(vacancy.grossPayMin, vacancy.grossPayMax, vacancy.currency, payPeriodLabel(vacancy.payPeriod))}
                </p>
                {vacancy.payPeriod !== "month" && monthlyMin ? (
                  <p className="mt-1 text-xs text-muted">
                    ≈ {formatMoney(monthlyMin, "EUR")}
                    {monthlyMax && monthlyMax !== monthlyMin ? `–${formatMoney(monthlyMax, "EUR")}` : ""} monthly
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted">Before tax and employee contributions</p>
                )}
              </div>
              <div>
                <p className="text-[0.7rem] uppercase tracking-wider text-muted">Rotation</p>
                <p className="mt-1 text-sm font-medium">{vacancy.rotation ?? "Not stated"}</p>
                <p className="mt-1 text-xs text-muted">Home time: {vacancy.homeTime ?? "not stated"}</p>
              </div>
              <div>
                <p className="text-[0.7rem] uppercase tracking-wider text-muted">Weekly rest</p>
                <p className="mt-1 text-sm font-medium">{vacancy.weeklyRest ?? "Not stated"}</p>
                <p className="mt-1 text-xs text-muted">{accommodationLabel(vacancy.accommodation)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarCheck2 size={13} className={stale ? "text-warning" : "text-success"} />
                Last confirmed {relativeDays(vacancy.lastConfirmedAt)}
                {confirmedDays !== null ? ` · ${formatDate(vacancy.lastConfirmedAt)}` : ""}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Euro size={13} /> {vacancy.infoScore}% of comparable fields completed
              </span>
            </div>
          </header>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold tracking-tight">Employment conditions</h2>
            <p className="mt-1 text-sm text-muted">
              Structured fields, not prose. Where a field says “not stated”, the employer has not provided it.
            </p>
            <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {conditions.map((item) => (
                <div key={item.label} className={item.wide ? "sm:col-span-2" : undefined}>
                  <dt className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wider text-muted">
                    {item.icon} {item.label}
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
            {missing.length > 0 ? (
              <div className="mt-5 rounded-xl border border-warning/25 bg-warning-soft p-4">
                <p className="text-[0.7rem] font-medium uppercase tracking-wider text-warning">
                  Not stated by the employer
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{missing.join(" · ")}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  A field that is missing is not a favourable condition. Ask the employer before you accept.
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold tracking-tight">Pay structure</h2>
            <div className="mt-4 rounded-xl bg-paper p-4 text-sm leading-relaxed text-ink-soft">
              {vacancy.payStructure || "The employer has not described how pay is built up."}
            </div>

            {vacancy.allowances.length > 0 ? (
              <div className="mt-4">
                <p className="text-[0.7rem] uppercase tracking-wider text-muted">Allowances & extras</p>
                <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
                  {vacancy.allowances.map((allowance, index) => (
                    <li key={`${allowance.label}-${index}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span>
                        {allowance.label}
                        {allowance.note ? <span className="ml-2 text-xs text-muted">{allowance.note}</span> : null}
                      </span>
                      <span className="font-medium tabular-nums">
                        {allowance.amount === null ? "See note" : formatMoney(allowance.amount, allowance.currency || "EUR")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-success" />
              Gross figures are shown as supplied by the employer. DriverCompass does not compute net pay:
              tax, social contributions and expatriate rules depend on your personal situation.
            </p>
          </section>

          {(vacancy.equipment || vacancy.benefits) ? (
            <section className="grid gap-4 sm:grid-cols-2">
              {vacancy.equipment ? (
                <div className="rounded-2xl border border-line bg-surface p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Vehicle & equipment</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{vacancy.equipment}</p>
                </div>
              ) : null}
              {vacancy.benefits ? (
                <div className="rounded-2xl border border-line bg-surface p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Benefits</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{vacancy.benefits}</p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section id="apply" className="rounded-2xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold tracking-tight">Contact this employer directly</h2>
            <p className="mt-1 text-sm text-muted">
              Application method: {applicationMethodLabel(vacancy.applicationMethod)}.
              {vacancy.contactName ? ` Contact: ${vacancy.contactName}.` : ""}
            </p>

            <div className="mt-5">
              {vacancy.applicationMethod === "external_link" && vacancy.applicationUrl ? (
                <div className="rounded-2xl bg-paper p-5">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    This employer handles applications on its own site. DriverCompass does not receive your
                    application or CV.
                  </p>
                  <ButtonLink
                    href={vacancy.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    variant="primary"
                    className="mt-4"
                  >
                    Open employer application page <ArrowUpRight size={15} />
                  </ButtonLink>
                </div>
              ) : vacancy.applicationMethod === "email" && vacancy.applicationEmail ? (
                <div className="rounded-2xl bg-paper p-5">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Send your application directly to the employer’s recruitment inbox.
                  </p>
                  <ButtonLink href={`mailto:${vacancy.applicationEmail}`} variant="primary" className="mt-4">
                    <Mail size={15} /> Email {vacancy.applicationEmail}
                  </ButtonLink>
                </div>
              ) : !user ? (
                <div className="rounded-2xl bg-paper p-5">
                  <p className="text-sm leading-relaxed text-ink-soft">
                    Create a free driver account to send a direct enquiry. Contact details are shared only
                    if you tick the box — otherwise the employer sees your message and name only.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink href={`/register?role=driver&next=${encodeURIComponent(`/jobs/${vacancy.slug}`)}`} variant="primary">
                      Create driver account
                    </ButtonLink>
                    <ButtonLink href={`/login?next=/jobs/${vacancy.slug}`} variant="secondary">
                      Log in
                    </ButtonLink>
                  </div>
                </div>
              ) : user.role !== "driver" ? (
                <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">
                  Direct enquiries are sent by driver accounts. You are signed in as {user.role}.
                </p>
              ) : (
                <EnquiryForm
                  vacancyId={vacancy.id}
                  defaultEmail={driverProfile?.contactEmail || user.email}
                  hasPhone={Boolean(driverProfile?.phone)}
                />
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-line pt-4">
              {user?.role === "driver" ? (
                <form action={toggleSavedVacancyAction}>
                  <input type="hidden" name="vacancyId" value={vacancy.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                  >
                    {saved ? <BookmarkCheck size={15} className="text-brand" /> : <Bookmark size={15} />}
                    {saved ? "Saved to your list" : "Save this vacancy"}
                  </button>
                </form>
              ) : null}
              <Link
                href={`/report?type=vacancy&id=${vacancy.id}`}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink"
              >
                <Flag size={13} /> Report this vacancy
              </Link>
              <span className="ml-auto text-[0.7rem] text-muted">Confirmed {relativeDays(vacancy.lastConfirmedAt)}</span>
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[0.7rem] uppercase tracking-wider text-muted">Employer</p>
                <Link
                  href={`/companies/${company.slug}`}
                  className="mt-1 block text-[0.98rem] font-semibold underline-offset-4 hover:underline"
                >
                  {company.tradingName ?? company.legalName}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {companyTypeLabel(company.companyType)} · {countryName(company.country)}
                </p>
              </div>
              <VerificationBadge status={company.verificationStatus} companyType={company.companyType} verificationVersion={company.verificationVersion} />
            </div>

            <dl className="mt-4 space-y-3 border-t border-line pt-4 text-xs">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Legal identity</dt>
                <dd className="text-right font-medium">
                  {identityChecked(company.verificationStatus, company.verificationVersion) ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <BadgeCheck size={13} /> Checked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted">
                      <X size={13} /> Not checked
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Recruitment role</dt>
                <dd className="text-right font-medium">
                  {roleChecked(company.verificationStatus, company.verificationVersion) ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <BadgeCheck size={13} /> {roleCheckLabel(company.companyType)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted">
                      <X size={13} /> Not checked
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Classification</dt>
                <dd className="text-right font-medium">
                  {companyTypeLabel(company.companyType)}{" "}
                  <span className="font-normal text-muted">(declared)</span>
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Vacancy status</dt>
                <dd className="text-right font-medium">{vacancyStatusLabel(vacancy.status, isFullyVerified(company.verificationStatus, company.verificationVersion))}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Last confirmed</dt>
                <dd className="text-right font-medium">{formatDate(vacancy.lastConfirmedAt)}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted">Registration no.</dt>
                <dd className="text-right font-mono text-[0.7rem]">{company.registrationNumber ?? "—"}</dd>
              </div>
            </dl>

            <ButtonLink href={`/companies/${company.slug}`} variant="secondary" size="sm" className="mt-4 w-full">
              View company profile
            </ButtonLink>
          </div>

          <div className="rounded-2xl border border-line bg-brand-100/60 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={16} className="text-brand" /> What is verified here
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                {identityChecked(company.verificationStatus, company.verificationVersion) ? (
                  <Check size={13} className="mt-0.5 shrink-0 text-success" />
                ) : (
                  <X size={13} className="mt-0.5 shrink-0 text-warning" />
                )}
                {identityChecked(company.verificationStatus, company.verificationVersion)
                  ? "Legal identity is checked against the company registry."
                  : "Legal identity has not been checked for this company."}
              </li>
              <li className="flex gap-2">
                {roleChecked(company.verificationStatus, company.verificationVersion) ? (
                  <Check size={13} className="mt-0.5 shrink-0 text-success" />
                ) : (
                  <X size={13} className="mt-0.5 shrink-0 text-warning" />
                )}
                {roleChecked(company.verificationStatus, company.verificationVersion)
                  ? `${roleCheckLabel(company.companyType)}.`
                  : "The recruitment role has not been checked."}
              </li>
              <li className="flex gap-2">
                <Check size={13} className="mt-0.5 shrink-0 text-success" />
                Vacancy confirmation is separate: the employer re-confirms the role is still open.
              </li>
              <li className="flex gap-2">
                <Check size={13} className="mt-0.5 shrink-0 text-success" />
                Payment never buys a badge, a rating or review removal.
              </li>
            </ul>
            <Link href="/how-verification-works" className="mt-3 inline-block text-xs font-medium text-brand underline-offset-4 hover:underline">
              Read how verification works
            </Link>
          </div>

          {vacancy.allowances.length > 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-5">
              <p className="text-[0.7rem] uppercase tracking-wider text-muted">At a glance</p>
              <ul className="mt-3 space-y-2 text-xs text-ink-soft">
                <li className="flex justify-between gap-3">
                  <span>Gross</span>
                  <span className="font-medium text-ink">
                    {formatPayRange(vacancy.grossPayMin, vacancy.grossPayMax, vacancy.currency, payPeriodLabel(vacancy.payPeriod))}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Accommodation</span>
                  <span className="text-right font-medium text-ink">{accommodationLabel(vacancy.accommodation)}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Loading</span>
                  <span className="font-medium text-ink">{loadingLabel(vacancy.loadingUnloading)}</span>
                </li>
                <li className="flex justify-between gap-3">
                  <span>Info completeness</span>
                  <span className="font-medium text-ink">{vacancy.infoScore}%</span>
                </li>
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

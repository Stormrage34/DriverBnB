import Link from "next/link";
import { ArrowUpRight, Euro, House, MapPin, RotateCcw, Truck, Weight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/verification-badge";
import { RatingInline } from "@/components/rating";
import {
  accommodationLabel,
  categoryLabel,
  loadingLabel,
  payPeriodLabel,
} from "@/lib/constants";
import { formatPayRange, relativeDays } from "@/lib/utils";
import type { Company, Vacancy } from "@/db/schema";

export function VacancyCard({
  vacancy,
  company,
  rating,
}: {
  vacancy: Vacancy;
  company: Company;
  rating: { average: number | null; count: number };
}) {
  const stale = vacancy.status === "reconfirmation_required";
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong hover:shadow-[0_10px_30px_-18px_var(--color-shadow)]">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <Badge tone="outline">{categoryLabel(vacancy.transportCategory)}</Badge>
        {company.isDemoSeed ? <Badge tone="neutral">Demo data</Badge> : null}
        {company.companyType !== "direct_employer" ? (
          <Badge tone="warning">Intermediary</Badge>
        ) : null}
        {stale ? <Badge tone="warning">Reconfirmation overdue</Badge> : null}
      </div>

      <h3 className="text-[1.05rem] font-semibold leading-snug">
        <Link href={`/jobs/${vacancy.slug}`} className="after:absolute after:inset-0 after:content-['']">
          {vacancy.title}
        </Link>
      </h3>

      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
        <Link
          href={`/companies/${company.slug}`}
          className="relative z-10 font-medium underline-offset-4 hover:underline"
        >
          {company.tradingName ?? company.legalName}
        </Link>
        <span className="text-muted">·</span>
        <span className="inline-flex items-center gap-1 text-muted">
          <MapPin size={13} /> {vacancy.city ? `${vacancy.city}, ` : ""}
          {vacancy.country}
        </span>
      </p>

      <p className="mt-3 text-[1.35rem] font-semibold tracking-tight">
        {formatPayRange(vacancy.grossPayMin, vacancy.grossPayMax, vacancy.currency, payPeriodLabel(vacancy.payPeriod))}
        <span className="ml-2 align-middle text-[0.7rem] font-normal uppercase tracking-wide text-muted">gross</span>
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-ink-soft">
        <div className="flex items-start gap-1.5">
          <RotateCcw size={13} className="mt-0.5 shrink-0 text-muted" />
          <span>{vacancy.rotation || "Rotation not stated"}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <House size={13} className="mt-0.5 shrink-0 text-muted" />
          <span>{accommodationLabel(vacancy.accommodation)}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <Weight size={13} className="mt-0.5 shrink-0 text-muted" />
          <span>{loadingLabel(vacancy.loadingUnloading)}</span>
        </div>
        <div className="flex items-start gap-1.5">
          <Truck size={13} className="mt-0.5 shrink-0 text-muted" />
          <span>{vacancy.vehicleType || "Vehicle not stated"}</span>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <VerificationBadge status={company.verificationStatus} companyType={company.companyType} verificationVersion={company.verificationVersion} />
          <RatingInline average={rating.average} count={rating.count} />
        </span>
        <span className="inline-flex items-center gap-1">
          <Euro size={12} />
          {vacancy.infoScore}% info
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between text-[0.7rem] text-muted">
        <span>Last confirmed {relativeDays(vacancy.lastConfirmedAt)}</span>
        <span className="inline-flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          View <ArrowUpRight size={12} />
        </span>
      </div>
    </article>
  );
}

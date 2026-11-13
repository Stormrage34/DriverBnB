import Link from "next/link";
import { Factory, MapPin, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/verification-badge";
import { RatingInline } from "@/components/rating";
import { companyTypeLabel, countryName } from "@/lib/constants";
import type { Company } from "@/db/schema";

export function CompanyCard({
  company,
  rating,
  vacancyCount,
}: {
  company: Company;
  rating: { average: number | null; count: number };
  vacancyCount: number;
}) {
  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong hover:shadow-[0_10px_30px_-18px_var(--color-shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand">
          <Factory size={19} strokeWidth={1.7} />
        </div>
        <VerificationBadge status={company.verificationStatus} companyType={company.companyType} verificationVersion={company.verificationVersion} />
      </div>

      <h3 className="mt-3 text-[1.02rem] font-semibold leading-snug">
        <Link href={`/companies/${company.slug}`} className="after:absolute after:inset-0 after:content-['']">
          {company.tradingName ?? company.legalName}
        </Link>
      </h3>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
        <MapPin size={12} /> {countryName(company.country)}
        {company.companyType !== "direct_employer" ? (
          <>
            <span>·</span>
            <span>{companyTypeLabel(company.companyType)}</span>
          </>
        ) : null}
      </p>

      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-soft">
        {company.description ?? "No company description provided."}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {company.isDemoSeed ? <Badge tone="neutral">Demo data</Badge> : null}
        {company.sectors.slice(0, 3).map((sector) => (
          <Badge key={sector} tone="neutral">
            {sector}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Truck size={13} /> {vacancyCount} open {vacancyCount === 1 ? "vacancy" : "vacancies"}
        </span>
        <RatingInline average={rating.average} count={rating.count} />
      </div>
    </article>
  );
}

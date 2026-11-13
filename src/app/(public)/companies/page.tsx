import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Filter, Factory } from "lucide-react";
import { CompanyCard } from "@/components/company-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { COMPANY_TYPES, COUNTRIES } from "@/lib/constants";
import { listCompanies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transport company directory",
  description:
    "Browse European transport employers: verification status, direct-employer classification, transport sectors and driver reviews.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function pick(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const SECTORS = [
  "Refrigerated",
  "ADR tanker",
  "Tank container",
  "Container",
  "General freight",
  "Regional",
  "Bulk",
  "Heavy haulage",
];

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = {
    q: pick(params.q) || undefined,
    country: pick(params.country) || undefined,
    type: pick(params.type) || undefined,
    sector: pick(params.sector) || undefined,
    verifiedOnly: pick(params.verified) === "1",
    page: Number(pick(params.page) || "1"),
  };

  const result = await listCompanies(filters);
  const activeCount =
    (filters.q ? 1 : 0) +
    (filters.country ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.sector ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav className="text-xs text-muted">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-soft">Companies</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">The company is the product</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Job boards compete on the number of adverts. We compete on what can be established about the
            company behind them: legal identity, direct-employer status, declared conditions and driver
            experience.
          </p>
        </div>
        <Badge tone="outline">
          <Factory size={12} /> {result.total} companies
        </Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[17rem_1fr]">
        <form action="/companies" method="get" className="lg:self-start">
          <details open className="group rounded-2xl border border-line bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Filter size={15} /> Filters
                {activeCount > 0 ? (
                  <span className="rounded-full bg-brand-solid px-1.5 py-0.5 text-[0.65rem] text-white">{activeCount}</span>
                ) : null}
              </span>
              <ChevronDown size={16} className="transition group-open:rotate-180 lg:hidden" />
            </summary>
            <div className="space-y-5 border-t border-line px-5 py-5">
              <div>
                <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-ink-soft">Search</label>
                <input
                  id="q"
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Company name"
                  className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="country" className="mb-1.5 block text-xs font-medium text-ink-soft">Country</label>
                <select
                  id="country"
                  name="country"
                  defaultValue={filters.country ?? ""}
                  className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">All countries</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="type" className="mb-1.5 block text-xs font-medium text-ink-soft">Employer type</label>
                <select
                  id="type"
                  name="type"
                  defaultValue={filters.type ?? ""}
                  className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">All types</option>
                  {COMPANY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="sector" className="mb-1.5 block text-xs font-medium text-ink-soft">Sector</label>
                <select
                  id="sector"
                  name="sector"
                  defaultValue={filters.sector ?? ""}
                  className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">Any sector</option>
                  {SECTORS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-xl bg-paper p-3 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="verified"
                  value="1"
                  defaultChecked={filters.verifiedOnly}
                  className="h-4 w-4 rounded border-line-strong accent-[var(--color-brand)]"
                />
                Fully verified companies only
              </label>
              <div className="flex flex-col gap-2">
                <button type="submit" className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600">
                  Apply filters
                </button>
                <Link href="/companies" className="text-center text-xs text-muted underline-offset-4 hover:underline">
                  Clear all filters
                </Link>
              </div>
            </div>
          </details>
        </form>

        <div>
          {result.rows.length === 0 ? (
            <EmptyState
              title="No companies match these filters"
              description="Try widening the country or sector. Companies remain listed while unverified — the badge simply tells you what has been checked."
              action={<Link href="/companies" className="text-sm font-medium text-brand underline-offset-4 hover:underline">Reset filters</Link>}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {result.rows.map((row) => (
                <CompanyCard key={row.company.id} company={row.company} rating={row.rating} vacancyCount={row.vacancyCount} />
              ))}
            </div>
          )}
          <div className="mt-6">
            <Pagination page={result.page} perPage={result.perPage} total={result.total} basePath="/companies" searchParams={params} />
          </div>
        </div>
      </div>
    </div>
  );
}

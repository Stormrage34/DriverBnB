import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, Filter, SlidersHorizontal } from "lucide-react";
import { VacancyCard } from "@/components/vacancy-card";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import {
  ACCOMMODATION_OPTIONS,
  COUNTRIES,
  LOADING_OPTIONS,
  TRANSPORT_CATEGORIES,
} from "@/lib/constants";
import { searchVacancies } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find transport jobs",
  description:
    "Search structured, confirmed vacancies from verified European transport employers and compare real working conditions.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function asArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function pick(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const sortParam = pick(params.sort);
  const pageParam = Number(pick(params.page) || "1");

  const filters = {
    q: pick(params.q).trim() || undefined,
    countries: asArray(params.country).filter((code) => COUNTRIES.some((country) => country.code === code)),
    categories: asArray(params.category).filter((value) =>
      TRANSPORT_CATEGORIES.some((category) => category.value === value),
    ),
    adr: pick(params.adr) === "1",
    payMin: numberOrUndefined(pick(params.payMin)),
    payMax: numberOrUndefined(pick(params.payMax)),
    accommodation: asArray(params.accommodation).filter((value) =>
      ACCOMMODATION_OPTIONS.some((option) => option.value === value),
    ),
    loading: asArray(params.loading).filter((value) =>
      LOADING_OPTIONS.some((option) => option.value === value),
    ),
    directOnly: pick(params.direct) === "1",
    verifiedOnly: pick(params.verified) === "1",
    language: pick(params.language) || undefined,
    sort: (["relevance", "newest", "pay"].includes(sortParam) ? sortParam : "relevance") as
      | "relevance"
      | "newest"
      | "pay",
    page: Number.isFinite(pageParam) ? Math.min(500, Math.max(1, Math.floor(pageParam))) : 1,
  };

  const result = await searchVacancies(filters);
  const activeFilterCount =
    filters.countries.length +
    filters.categories.length +
    filters.accommodation.length +
    filters.loading.length +
    (filters.adr ? 1 : 0) +
    (filters.directOnly ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.payMin ? 1 : 0) +
    (filters.payMax ? 1 : 0) +
    (filters.language ? 1 : 0) +
    (filters.q ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <nav className="text-xs text-muted">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-soft">Jobs</span>
      </nav>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Find a job that tells you the truth</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Every vacancy here answers the questions a job advert usually avoids: pay structure,
            rotation, home time, accommodation, weekly rest and who signs the contract.
          </p>
        </div>
        <Badge tone="outline">
          <SlidersHorizontal size={12} /> {result.total} live vacancies
        </Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[17rem_1fr]">
        <form action="/jobs" method="get" className="lg:h-full lg:self-start">
        <details data-filters className="group rounded-2xl border border-line bg-surface lg:h-full lg:self-start">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <Filter size={15} /> Filters
              {activeFilterCount > 0 ? (
                <span className="rounded-full bg-brand-solid px-1.5 py-0.5 text-[0.65rem] text-white">{activeFilterCount}</span>
              ) : null}
            </span>
            <ChevronDown size={16} className="transition group-open:rotate-180 lg:hidden" />
          </summary>

          <div className="filter-panel space-y-5 border-t border-line px-5 py-5">
            <div>
              <label htmlFor="q" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Keyword
              </label>
              <input
                id="q"
                name="q"
                defaultValue={filters.q ?? ""}
                placeholder="Company, city or role"
                className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="country" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Employment country
              </label>
              <select
                id="country"
                name="country"
                defaultValue={filters.countries[0] ?? ""}
                className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">All countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-medium text-ink-soft">Transport category</legend>
              <div className="space-y-1.5">
                {TRANSPORT_CATEGORIES.map((c) => (
                  <label key={c.value} className="flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      name="category"
                      value={c.value}
                      defaultChecked={filters.categories.includes(c.value)}
                      className="h-4 w-4 rounded border-line-strong accent-[var(--color-brand)]"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <p className="mb-2 text-xs font-medium text-ink-soft">Gross pay (monthly equivalent)</p>
              <div className="flex items-center gap-2">
                <input
                  name="payMin"
                  type="number"
                  min={0}
                  step={100}
                  defaultValue={filters.payMin ?? ""}
                  placeholder="Min €"
                  aria-label="Minimum gross monthly pay"
                  className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
                <span className="text-muted">–</span>
                <input
                  name="payMax"
                  type="number"
                  min={0}
                  step={100}
                  defaultValue={filters.payMax ?? ""}
                  placeholder="Max €"
                  aria-label="Maximum gross monthly pay"
                  className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="accommodation" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Accommodation
              </label>
              <select
                id="accommodation"
                name="accommodation"
                defaultValue={filters.accommodation[0] ?? ""}
                className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">Any arrangement</option>
                {ACCOMMODATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="loading" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Loading / unloading
              </label>
              <select
                id="loading"
                name="loading"
                defaultValue={filters.loading[0] ?? ""}
                className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">Any</option>
                {LOADING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-xl bg-paper p-3">
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="direct"
                  value="1"
                  defaultChecked={filters.directOnly}
                  className="h-4 w-4 rounded border-line-strong accent-[var(--color-brand)]"
                />
                Direct employers only
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="verified"
                  value="1"
                  defaultChecked={filters.verifiedOnly}
                  className="h-4 w-4 rounded border-line-strong accent-[var(--color-brand)]"
                />
                Fully verified employers only
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="adr"
                  value="1"
                  defaultChecked={filters.adr}
                  className="h-4 w-4 rounded border-line-strong accent-[var(--color-brand)]"
                />
                ADR / tanker work
              </label>
            </div>

            <div>
              <label htmlFor="language" className="mb-1.5 block text-xs font-medium text-ink-soft">
                Language required
              </label>
              <select
                id="language"
                name="language"
                defaultValue={filters.language ?? ""}
                className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm focus:border-brand focus:outline-none"
              >
                <option value="">Any language</option>
                {["English", "Dutch", "German", "French", "Danish", "Polish", "Bulgarian"].map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600"
              >
                Apply filters
              </button>
              <Link href="/jobs" className="text-center text-xs text-muted underline-offset-4 hover:underline">
                Clear all filters
              </Link>
            </div>
          </div>
        </details>
        </form>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <p className="text-xs text-muted">
              Showing <span className="font-medium text-ink">{result.rows.length}</span> of{" "}
              <span className="font-medium text-ink">{result.total}</span> vacancies · sorted by{" "}
              {filters.sort === "pay" ? "pay" : filters.sort === "newest" ? "newest" : "relevance & verification"}
            </p>
            <form action="/jobs" method="get" className="flex items-center gap-2 text-xs text-muted">
              {Object.entries(params).map(([key, value]) => {
                if (key === "sort" || key === "page" || value === undefined) return null;
                const values = Array.isArray(value) ? value : [value];
                return values.map((v, i) => <input key={`${key}-${i}`} type="hidden" name={key} value={v} />);
              })}
              <label className="flex items-center gap-2">
                Sort
                <select
                  name="sort"
                  defaultValue={filters.sort}
                  className="rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-xs text-ink"
                >
                  <option value="relevance">Relevance & verification</option>
                  <option value="newest">Newest</option>
                  <option value="pay">Highest pay</option>
                </select>
              </label>
              <button type="submit" className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-ink hover:bg-paper">
                Go
              </button>
            </form>
          </div>

          {result.rows.length === 0 ? (
            activeFilterCount > 0 ? (
              <EmptyState
                title="No vacancies match these filters"
                description="Try removing the pay filter, selecting more transport categories or clearing the keyword. We never pad results with expired or unverified listings."
                action={
                  <Link href="/jobs" className="min-h-11 inline-flex items-center text-sm font-medium text-brand underline-offset-4 hover:underline">
                    Clear all filters
                  </Link>
                }
              />
            ) : (
              <EmptyState
                title="No live vacancies yet"
                description="Confirmed vacancies appear here as soon as employers publish them. Nothing is hidden by filters — the board is currently empty."
                action={
                  <Link href="/companies" className="min-h-11 inline-flex items-center text-sm font-medium text-brand underline-offset-4 hover:underline">
                    Browse employers
                  </Link>
                }
              />
            )
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {result.rows.map((row) => (
                <VacancyCard
                  key={row.vacancy.id}
                  vacancy={row.vacancy}
                  company={row.company}
                  rating={row.rating}
                />
              ))}
            </div>
          )}

          <div className="mt-6">
            <Pagination
              page={result.page}
              perPage={result.perPage}
              total={result.total}
              basePath="/jobs"
              searchParams={params}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

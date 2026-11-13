import Link from "next/link";
import { Building2, MapPin, Trash2, Truck } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { requireDriverPage } from "@/lib/guards";
import { getDriverDashboard, getSavedCompanies, ratingMap } from "@/lib/queries";
import { accommodationLabel, countryName, payPeriodLabel } from "@/lib/constants";
import { formatDate, formatPayRange } from "@/lib/utils";
import { toggleSavedCompanyAction, toggleSavedVacancyAction } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await requireDriverPage();
  const [{ savedJobs }, savedCompanies] = await Promise.all([
    getDriverDashboard(user.id),
    getSavedCompanies(user.id),
  ]);
  const ratings = await ratingMap([
    ...savedJobs.map((r) => r.company.id),
    ...savedCompanies.map((r) => r.company.id),
  ]);

  return (
    <div>
      <PageHeader
        title="Saved"
        description="A private shortlist. Nothing here is visible to employers."
        action={
          <ButtonLink href="/jobs" variant="secondary" size="sm">
            <Truck size={14} /> Browse jobs
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Saved vacancies</CardTitle>
          <span className="text-xs text-muted">{savedJobs.length}</span>
        </CardHeader>
        <CardBody className="space-y-3">
          {savedJobs.length === 0 ? (
            <EmptyState
              title="No saved vacancies yet"
              description="Save roles while you compare conditions. Your shortlist is private and can be removed at any time."
              className="border-0 bg-transparent py-6"
            />
          ) : (
            savedJobs.map((row) => (
              <div key={row.vacancy.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-4">
                <div className="min-w-0">
                  <Link href={`/jobs/${row.vacancy.slug}`} className="text-sm font-semibold underline-offset-4 hover:underline">
                    {row.vacancy.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted">
                    {row.company.tradingName ?? row.company.legalName} · {countryName(row.vacancy.country)}
                    {row.vacancy.city ? `, ${row.vacancy.city}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatPayRange(row.vacancy.grossPayMin, row.vacancy.grossPayMax, row.vacancy.currency, payPeriodLabel(row.vacancy.payPeriod))}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="outline">{accommodationLabel(row.vacancy.accommodation)}</Badge>
                    <Badge tone="neutral">Confirmed {formatDate(row.vacancy.lastConfirmedAt)}</Badge>
                    {ratings.get(row.company.id)?.average ? (
                      <Badge tone="accent">{ratings.get(row.company.id)!.average!.toFixed(1)} / 5</Badge>
                    ) : null}
                  </div>
                </div>
                <form action={toggleSavedVacancyAction}>
                  <input type="hidden" name="vacancyId" value={row.vacancy.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-danger/30 hover:text-danger"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </form>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Saved companies</CardTitle>
          <span className="text-xs text-muted">{savedCompanies.length}</span>
        </CardHeader>
        <CardBody className="space-y-3">
          {savedCompanies.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              Save employers you want to keep an eye on.{" "}
              <Link href="/companies" className="text-brand underline-offset-4 hover:underline">Browse the directory</Link>.
            </p>
          ) : (
            savedCompanies.map((row) => (
              <div key={row.company.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-line p-4">
                <div>
                  <Link href={`/companies/${row.company.slug}`} className="text-sm font-semibold underline-offset-4 hover:underline">
                    {row.company.tradingName ?? row.company.legalName}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                    <MapPin size={12} /> {countryName(row.company.country)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <Building2 size={12} /> {row.company.companyType.replaceAll("_", " ")}
                  </p>
                </div>
                <form action={toggleSavedCompanyAction}>
                  <input type="hidden" name="companyId" value={row.company.id} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:border-danger/30 hover:text-danger"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </form>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

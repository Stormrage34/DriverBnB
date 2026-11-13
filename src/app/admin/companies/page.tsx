import Link from "next/link";
import { ExternalLink, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/verification-badge";
import { setCompanySuspensionAction } from "@/app/admin/actions";
import { requireAdminPage } from "@/lib/guards";
import { listAdminCompanies, type AdminCompanyState } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { companyTypeLabel, countryName } from "@/lib/constants";
import { isCompanySuspended } from "@/lib/company-suspension";

export const dynamic = "force-dynamic";

function stateLabel(state: AdminCompanyState): string {
  if (state === "suspended") return "Suspended";
  if (state === "active") return "Active";
  return "All";
}

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const state: AdminCompanyState =
    params.state === "suspended" || params.state === "active" ? params.state : "all";
  const rows = await listAdminCompanies({ q, state });

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Suspend or restore a company. Suspension hides the company, its vacancies and its reviews from every public path and blocks employer writes."
      />

      <Card className="mb-4">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-[14rem] flex-1">
              <label htmlFor="company-search" className="mb-1 block text-xs font-medium">
                Search legal name, trading name or registration number
              </label>
              <input
                id="company-search"
                name="q"
                defaultValue={q}
                className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="company-state" className="mb-1 block text-xs font-medium">
                State
              </label>
              <select
                id="company-state"
                name="state"
                defaultValue={state}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="all">{stateLabel("all")}</option>
                <option value="active">{stateLabel("active")}</option>
                <option value="suspended">{stateLabel("suspended")}</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              Filter
            </button>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <ShieldCheck size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">No companies match</p>
            <p className="mt-1 text-sm text-muted">Try a different search or state.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map(({ company, ownerEmail }) => {
            const suspended = isCompanySuspended(company);
            return (
              <Card key={company.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{company.legalName}</CardTitle>
                      <VerificationBadge
                        status={company.verificationStatus}
                        companyType={company.companyType}
                        verificationVersion={company.verificationVersion}
                      />
                      {suspended ? <Badge tone="danger">Suspended</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {countryName(company.country)} · {companyTypeLabel(company.companyType)} ·
                      owner {ownerEmail ?? "unknown"}
                    </p>
                  </div>
                  <Link
                    href={`/companies/${company.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-brand underline-offset-4 hover:underline"
                  >
                    Public profile <ExternalLink size={12} />
                  </Link>
                </CardHeader>
                <CardBody className="space-y-4">
                  <dl className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">
                        Registration
                      </dt>
                      <dd className="mt-1 font-mono text-xs">{company.registrationNumber ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">
                        Verification trust
                      </dt>
                      <dd className="mt-1">
                        {company.verificationVersion >= 1
                          ? "Trusted snapshot recorded"
                          : "Legacy / requires review"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">
                        Last update
                      </dt>
                      <dd className="mt-1">{formatDate(company.updatedAt)}</dd>
                    </div>
                  </dl>

                  {suspended ? (
                    <div className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm">
                      <p className="flex items-center gap-2 font-medium text-danger">
                        <ShieldAlert size={15} /> Suspended {formatDate(company.suspendedAt)}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-xs text-ink-soft">
                        {company.suspensionReason ?? "No reason recorded."}
                      </p>
                    </div>
                  ) : null}

                  <form
                    action={setCompanySuspensionAction}
                    className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_auto] sm:items-end"
                  >
                    <input type="hidden" name="companyId" value={company.id} />
                    <input
                      type="hidden"
                      name="outcome"
                      value={suspended ? "restore" : "suspend"}
                    />
                    <div>
                      <label
                        htmlFor={`reason-${company.id}`}
                        className="mb-1 block text-xs font-medium"
                      >
                        {suspended ? "Restoration reason" : "Suspension reason"} (recorded in the
                        audit log)
                      </label>
                      <textarea
                        id={`reason-${company.id}`}
                        name="reason"
                        required
                        minLength={10}
                        maxLength={1000}
                        rows={2}
                        placeholder={
                          suspended
                            ? "What was reviewed and why the company may return."
                            : "What is wrong, what evidence was seen, and what must change."
                        }
                        className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-white ${
                        suspended ? "bg-brand-solid hover:bg-brand-600" : "bg-danger-solid hover:brightness-95"
                      }`}
                    >
                      {suspended ? "Restore company" : "Suspend company"}
                    </button>
                  </form>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

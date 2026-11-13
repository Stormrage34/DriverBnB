import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { VacancyForm } from "@/components/vacancy-form";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser, getCompanyVacancy } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function EditVacancyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  const { id } = await params;
  const { error } = await searchParams;
  const vacancy = await getCompanyVacancy(company.id, id);
  if (!vacancy) notFound();

  return (
    <div>
      <Link href="/employer/vacancies" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> Back to vacancies
      </Link>
      <PageHeader
        title="Edit vacancy"
        description={`Status: ${vacancy.status.replaceAll("_", " ")} · ${vacancy.infoScore}% of comparable fields complete.`}
        action={
          vacancy.status !== "draft" ? (
            <Link href={`/jobs/${vacancy.slug}`} target="_blank" className="text-sm font-medium text-brand underline-offset-4 hover:underline">
              View public page →
            </Link>
          ) : null
        }
      />
      {error === "incomplete" ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          This vacancy cannot be published until the required condition fields are complete.
        </p>
      ) : null}
      {error === "transition" ? (
        <p className="mb-4 flex items-start gap-2 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          That action is not allowed for this vacancy. A draft must be completed before publishing, a
          suspended vacancy cannot be republished by the employer, and only a live vacancy can be
          reconfirmed.
        </p>
      ) : null}
      <VacancyForm
        vacancy={vacancy}
        defaultContractingEntity={company.contractingEntity ?? company.legalName}
        defaultCountry={company.country}
      />
    </div>
  );
}

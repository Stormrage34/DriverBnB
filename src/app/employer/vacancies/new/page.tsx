import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { VacancyForm } from "@/components/vacancy-form";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewVacancyPage() {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  return (
    <div>
      <Link href="/employer/vacancies" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> Back to vacancies
      </Link>
      <PageHeader
        title="New vacancy"
        description="Drivers compare structured conditions, not adjectives. Complete the fields that decide whether the job works."
      />
      <VacancyForm
        defaultContractingEntity={company.contractingEntity ?? company.legalName}
        defaultCountry={company.country}
      />
    </div>
  );
}

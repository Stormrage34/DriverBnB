import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { PageHeader } from "@/components/dashboard-shell";
import { ReviewForm } from "@/components/review-form";
import { requireDriverPage } from "@/lib/guards";
import { db } from "@/lib/db";
import { companies } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  await requireDriverPage();
  const { company: companySlug } = await searchParams;

  const rows = await db
    .select({ id: companies.id, name: companies.tradingName, legalName: companies.legalName, slug: companies.slug })
    .from(companies)
    .where(and(ne(companies.verificationStatus, "suspended"), isNull(companies.suspendedAt)))
    .orderBy(asc(companies.legalName));

  const list = rows.map((row) => ({ id: row.id, name: row.name ?? row.legalName }));
  const selected = companySlug ? rows.find((row) => row.slug === companySlug) : undefined;
  if (companySlug && !selected) notFound();

  return (
    <div>
      <Link href="/dashboard/reviews" className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> Back to my reviews
      </Link>
      <PageHeader
        title="Review an employer"
        description="Only publish what you can stand behind. Measurable conditions help; personal attacks do not."
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning-soft px-5 py-4 text-xs leading-relaxed text-ink-soft">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
        <p>
          Never include names of individual dispatchers or managers, phone numbers, addresses or allegations
          of criminality. Those reviews are rejected under the review policy, and unlawful content can expose
          you personally.
        </p>
      </div>

      <ReviewForm companies={list} defaultCompanyId={selected?.id} />
    </div>
  );
}

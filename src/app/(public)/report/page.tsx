import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Flag } from "lucide-react";
import { ReportForm } from "@/components/report-form";

export const metadata: Metadata = {
  title: "Report content",
  description: "Report a misleading vacancy, fake company, abusive review or privacy issue.",
};

const TYPES = {
  vacancy: { label: "vacancy", back: "/jobs" },
  company: { label: "company profile", back: "/companies" },
  review: { label: "review", back: "/companies" },
  message: { label: "message", back: "/dashboard" },
} as const;

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; id?: string }>;
}) {
  const params = await searchParams;
  const type = params.type as keyof typeof TYPES | undefined;
  const id = params.id;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!type || !TYPES[type] || !id || !uuid.test(id)) notFound();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link href={TYPES[type].back} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <ArrowLeft size={13} /> Back
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning">
          <Flag size={12} /> Content report
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">Report this {TYPES[type].label}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Moderators review reports against the platform rules and the review policy. Reports about
          criminal allegations, exploitation or safety are escalated for legal review before any public
          statement is made.
        </p>

        <div className="mt-6">
          <ReportForm targetType={type} targetId={id} />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Prefer email? Write to <span className="font-medium text-ink-soft">trust@drivercompass.eu</span> with the
        link and what is wrong.
      </p>
    </div>
  );
}

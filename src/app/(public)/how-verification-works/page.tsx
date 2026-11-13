import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, Check, ClipboardCheck, FileSearch, ShieldCheck, Truck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { VERIFICATION_STATUS_VALUES, getVerificationPresentation } from "@/lib/verification";
import { VACANCY_STATUSES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "How verification works",
  description:
    "What DriverCompass checks, what it does not check, and why a paid listing never earns a verification badge.",
};

const CHECKS = [
  { label: "Legal company name", checked: true, note: "Matched against the registration extract supplied." },
  { label: "Company registration number", checked: true, note: "Format and country checked; extract reviewed by a moderator." },
  { label: "Registered business address", checked: true, note: "Consistency check against the registration record." },
  { label: "Recruitment role", checked: true, note: "Direct employer, agency, subcontractor or intermediary; checked against the contracting entity." },
  { label: "Vacancy still open", checked: true, note: "Employer reconfirms; the date is shown on every vacancy." },
  { label: "Salary actually paid", checked: false, note: "Not verifiable before employment — driver reviews cover this." },
  { label: "Working conditions in practice", checked: false, note: "Employer-declared; staff reviews report the reality." },
  { label: "Quality of management", checked: false, note: "Subjective — only driver experience can speak to it." },
];

export default function HowVerificationWorksPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">Trust infrastructure</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Verification is a record, not a badge you can buy.
      </h1>
      <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-ink-soft">
        Every company profile separates what DriverCompass has checked from what the employer has declared.
        A subscription buys visibility and tools. It never buys a verification status, a rating or the
        removal of criticism.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <BadgeCheck size={16} className="text-success" /> Company identity
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Who the legal entity is, where it is registered and what role it plays in recruitment:
            direct employer, agency, subcontractor or intermediary. Checked by a human moderator
            against registry evidence.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardCheck size={16} className="text-info" /> Vacancy confirmation
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Whether this specific role still exists. Confirmation is dated, expires, and is shown on the
            vacancy — it is never inferred from the company badge.
          </p>
        </div>
      </div>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Company verification statuses</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-[0.7rem] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">What it means</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {VERIFICATION_STATUS_VALUES.map((status) => {
              const presentation = getVerificationPresentation(status, "direct_employer", 1);
              return (
                <tr key={status}>
                  <td className="px-4 py-3 align-top">
                    <Badge tone={presentation.tone}>{presentation.label}</Badge>
                  </td>
                  <td className="px-4 py-3 align-top text-ink-soft">
                    {verificationMeaning(status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Vacancy statuses</h2>
      <p className="mt-2 text-sm text-muted">
        The company badge never implies that a vacancy is current. These are separate states:
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {VACANCY_STATUSES.map((status) => (
          <div key={status.value} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
            <span className="text-sm">{status.label}</span>
            <Badge tone={status.value === "suspended" || status.value === "expired" ? "danger" : status.value.includes("confirmed") ? "success" : "neutral"}>
              {status.value}
            </Badge>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">Company verification process</h2>
      <ol className="mt-4 space-y-3">
        {[
          { title: "Registration", copy: "The employer creates an account and identifies the contracting legal entity." },
          { title: "Evidence submission", copy: "Registration number, registered address, contact person and evidence notes are submitted for review." },
          { title: "Identity check", copy: "A moderator checks the registration record and marks identity as checked." },
          { title: "Direct-employer check", copy: "Where declared, the moderator checks that the company recruits directly rather than acting for another employer." },
          { title: "Verification decision", copy: "The company becomes Verified, or the submission is rejected with recorded reasons and a right to correct." },
          { title: "Continuous review", copy: "Reports, suspensions and periodic checks can change the status. Every change is logged." },
        ].map((step, index) => (
          <li key={step.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-solid text-xs font-semibold text-white">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.copy}</p>
            </div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 text-xl font-semibold tracking-tight">What we check — and what we do not</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface">
        <ul className="divide-y divide-line">
          {CHECKS.map((check) => (
            <li key={check.label} className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${check.checked ? "bg-success-soft text-success" : "bg-paper text-muted"}`}>
                {check.checked ? <Check size={13} /> : <X size={13} />}
              </span>
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted">{check.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 rounded-2xl border border-warning/25 bg-warning-soft p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-warning">
          <AlertTriangle size={16} /> A verified badge is not a guarantee of employment terms
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          It confirms who the company is. Whether the job is good depends on conditions, management and
          your own priorities — which is what structured vacancies and driver reviews are for.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        <ButtonLink href="/companies" variant="primary">
          <FileSearch size={15} /> Browse verified employers
        </ButtonLink>
        <ButtonLink href="/review-policy" variant="secondary">
          <ShieldCheck size={15} /> Review policy
        </ButtonLink>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Need a correction? If a company profile or vacancy contains wrong information,{" "}
        <Link href="/contact" className="underline underline-offset-4">contact us</Link> or use the report link
        on the page. Employers have a documented right to appeal decisions; drivers have a documented right to
        report content.
      </p>
    </div>
  );
}

function verificationMeaning(value: string): string {
  switch (value) {
    case "unverified":
      return "The company exists on the platform but has not submitted evidence. Everything on the profile is employer-declared.";
    case "submitted":
      return "Evidence has been submitted and is waiting for moderator review.";
    case "identity_checked":
      return "The legal identity and registration number have been checked. The recruitment role is not yet confirmed.";
    case "direct_employer_checked":
      return "Identity and recruitment role have both been assessed. For a direct employer the label is “Direct-employer status checked”; for an agency or subcontractor it is “Intermediary status checked”. The full badge is not yet granted.";
    case "verified":
      return "Legal identity and the recruitment role have both been checked. The badge does not guarantee working conditions or salary.";
    case "suspended":
      return "The profile is suspended pending investigation. It is hidden from drivers and cannot publish vacancies.";
    default:
      return "";
  }
}

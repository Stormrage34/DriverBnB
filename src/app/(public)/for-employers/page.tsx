import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Check, ClipboardCheck, Euro, Eye, ShieldCheck, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "For transport employers",
  description:
    "Publish verified, structured vacancies to professional drivers. Transparent conditions, direct enquiries and a right of reply.",
};

const STEPS = [
  { title: "Register the company", copy: "Identify the legal entity that signs the employment contract — not a trading name or a client." },
  { title: "Submit verification evidence", copy: "Registration number, registered address, contact person and evidence notes. A moderator reviews it." },
  { title: "Publish structured vacancies", copy: "Pay build-up, rotation, home time, accommodation, weekly rest, loading duties and licence requirements." },
  { title: "Reconfirm every 30 days", copy: "Roles stay live only while they are real. The last confirmation date is shown to every driver." },
];

export default function ForEmployersPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">For transport employers</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Publish the conditions. Earn the drivers who fit.
          </h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-ink-soft">
            Drivers are not short of adverts. They are short of reliable information. A structured,
            confirmed vacancy on DriverCompass answers the questions that decide whether someone applies —
            and sends you enquiries that are already informed.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href="/register?role=employer" variant="primary">Register a company</ButtonLink>
            <ButtonLink href="/contact" variant="secondary">Talk to the pilot team</ButtonLink>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="success"><ShieldCheck size={12} /> No per-hire commission</Badge>
            <Badge tone="info"><Users size={12} /> No candidate ranking for sale</Badge>
            <Badge tone="outline"><Eye size={12} /> Paid placement clearly labelled</Badge>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm font-semibold">What drivers see on every vacancy</p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink-soft">
            {[
              "Gross pay and pay structure, with allowances separated",
              "Rotation, home time and weekly-rest arrangements",
              "Accommodation: free, deducted, optional or not provided",
              "Loading/unloading duties and vehicle type",
              "Contracting legal entity and contract type",
              "Verification status and last confirmation date",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check size={13} className="mt-0.5 shrink-0 text-success" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-line bg-surface p-5">
              <span className="font-mono text-xs text-muted">0{index + 1}</span>
              <p className="mt-2 text-sm font-semibold">{step.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Pilot pricing hypotheses</h2>
            <p className="mt-1 text-sm text-muted">
              Pricing is a hypothesis for the first pilot cohort. No payment is taken in this build.
            </p>
          </div>
          <Badge tone="warning">Not yet billing</Badge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.value} className="flex flex-col rounded-2xl border border-line bg-surface p-5">
              <p className="text-sm font-semibold">{plan.name}</p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{plan.price}</p>
              <p className="text-[0.7rem] text-muted">{plan.priceNote}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-ink-soft">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-1.5">
                    <Check size={12} className="mt-0.5 shrink-0 text-success" /> {feature}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register?role=employer" variant="secondary" size="sm" className="mt-4 w-full">
                Start with {plan.name}
              </ButtonLink>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="flex items-center gap-2 text-sm font-semibold"><BadgeCheck size={16} className="text-success" /> What verification requires</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
            <li>· Registered legal name and company registration number</li>
            <li>· Registered business address and official website</li>
            <li>· Named contact person and business email</li>
            <li>· Declaration: direct employer, agency, subcontractor or intermediary</li>
            <li>· The contracting legal entity for each vacancy</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck size={16} className="text-info" /> The rules you accept</p>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
            <li>· Gross and net are never conflated; allowances are itemised</li>
            <li>· Vacancies are reconfirmed at least every 30 days</li>
            <li>· Agencies disclose their role and the contracting entity</li>
            <li>· Reviews cannot be deleted for disagreement</li>
            <li>· Paid promotion is labelled and never overrides filters</li>
          </ul>
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl">
            <p className="flex items-center gap-2 text-sm font-semibold"><Euro size={16} className="text-brand" /> Charged to employers, free for drivers</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Drivers never pay to search, read reviews or contact an employer. You pay for visibility and
              recruitment tools — never for a badge, a rating or a candidate’s private details.
            </p>
          </div>
          <ButtonLink href="/register?role=employer" variant="accent">
            Register a company <ArrowRight size={15} />
          </ButtonLink>
        </div>
      </section>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Questions about verification or the pilot? <Link href="/contact" className="underline underline-offset-4">Contact the team</Link> or read{" "}
        <Link href="/how-verification-works" className="underline underline-offset-4">how verification works</Link>.
      </p>
    </div>
  );
}

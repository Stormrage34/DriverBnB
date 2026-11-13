import Link from "next/link";
import { BadgeCheck } from "lucide-react";

const STEPS = [
  {
    title: "Search the vacancies",
    copy: "Start with the record, not with a form.",
  },
  {
    title: "Read the full record",
    copy: "The same fields appear in the same order on every vacancy.",
  },
  {
    title: "Contact the employer",
    copy: "Use the application link, its recruitment inbox, or an enquiry you send yourself.",
  },
  {
    title: "Keep your profile private",
    copy: "Employers see it only after you write to them.",
  },
];

export function Steps() {
  return (
    <ol className="grid gap-0 border-t border-line">
      {STEPS.map((step, index) => (
        <li key={step.title} className="grid gap-2 border-b border-line py-5 sm:grid-cols-[4rem_1fr_1.2fr] sm:items-baseline sm:gap-6">
          <span className="text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
          <h3 className="text-lg font-medium">{step.title}</h3>
          <p className="text-base leading-relaxed text-ink-soft">{step.copy}</p>
        </li>
      ))}
    </ol>
  );
}

const CHECKS = [
  { label: "Company identity", value: "Checked", done: true },
  { label: "Direct employer or agency", value: "Verified", done: true },
  { label: "Vacancy details", value: "Every field checked", done: true },
  { label: "Reviews with a reply", value: "Open to reply", done: false },
];

export function Trust() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-5">
        <h2 className="text-3xl font-semibold sm:text-4xl">
          Employers fund the platform. They do not buy a better truth.
        </h2>
        <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-ink-soft">
          A company that pays for a listing still has its identity checked, its vacancy fields confirmed, and
          its reviews answered in public. Payment buys a listing, nothing else.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
          <Link href="/review-policy" className="draw-underline font-medium">
            Read the review policy
          </Link>
          <Link href="/how-verification-works" className="draw-underline text-ink-soft">
            How verification works
          </Link>
        </div>
      </div>

      <div className="lg:col-span-6 lg:col-start-7">
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Recorded separately</p>
          <ul className="mt-4 divide-y divide-line">
            {CHECKS.map((check) => (
              <li key={check.label} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm">{check.label}</span>
                <span
                  className={
                    check.done
                      ? "inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success"
                      : "inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-xs font-medium text-warning"
                  }
                >
                  {check.done ? <BadgeCheck size={13} aria-hidden /> : null}
                  {check.value}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Private by default: a driver profile is visible only when the driver makes contact.
          </p>
        </div>
      </div>
    </div>
  );
}

export function EmployerBand() {
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
      <ul className="lg:col-span-7">
        {[
          ["Direct enquiries", "Drivers contact you from the record, using the channel you publish."],
          ["One subscription", "Employers pay to list vacancies. There is no placement fee."],
          ["Payment buys nothing else", "Paying does not buy verification, rating changes or driver data."],
        ].map(([title, copy]) => (
          <li key={title} className="border-t border-line py-5 first:border-t-0 first:pt-0">
            <h3 className="text-lg font-medium">{title}</h3>
            <p className="mt-1 max-w-[52ch] text-base leading-relaxed text-ink-soft">{copy}</p>
          </li>
        ))}
      </ul>
      <div className="lg:col-span-4 lg:col-start-9">
        <Link
          href="/for-employers"
          className="inline-flex h-12 items-center rounded-full bg-brand-solid px-5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          List a vacancy
        </Link>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          A verified employer record, structured vacancies and a right of reply on every review.
        </p>
      </div>
    </div>
  );
}


const EVIDENCE = [
  {
    label: "Verified experience",
    copy: "The employer, the relationship and the period were confirmed. The opinion never is.",
  },
  {
    label: "Company reply",
    copy: "The employer's own statement, published next to the review and never counted as a review or a vote.",
  },
  {
    label: "Not verified",
    copy: "Written by a driver who says they worked there. Published and labelled, excluded from the score.",
  },
];

export function EmployerIntelligence() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-7">
        <p className="max-w-[52ch] text-base leading-relaxed text-ink-soft">
          Find out what other professional drivers say about the companies they have worked for, and compare
          employment conditions before you apply.
        </p>
        <ul className="mt-6">
          {EVIDENCE.map((item) => (
            <li key={item.label} className="border-t border-line py-3.5 first:border-t-0 first:pt-0">
              <h3 className="text-lg font-medium">{item.label}</h3>
              <p className="mt-1 max-w-[52ch] text-base leading-relaxed text-ink-soft">{item.copy}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-4 lg:col-start-9">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-sm leading-relaxed text-ink-soft">
            Reviews are shown on an employer profile only where drivers have published them. Nothing here is
            generated, estimated or seeded: an employer with no reviews shows none.
          </p>
          <Link
            href="/companies"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-brand-solid px-5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            Find employers
          </Link>
        </div>
      </div>
    </div>
  );
}

const CAPABILITIES = [
  "Licence categories, Code 95 and ADR specialisations",
  "Tanker, reefer, container and curtain-side experience",
  "Countries, routes and equipment you have actually worked",
  "Languages, availability and preferred working arrangements",
];

export function SkillsValue() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-5">
        <p className="max-w-[46ch] text-base leading-relaxed text-ink-soft">
          Showcase your licences, qualifications, specialist transport experience and professional skills in one
          profile you control.
        </p>
        <Link
          href="/register?role=driver"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-brand-solid px-5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Build your professional profile
        </Link>
        <p className="mt-4 max-w-[44ch] text-sm leading-relaxed text-muted">
          What you declare is labelled as declared. Nothing becomes public until you choose it, and there is no
          score attached to your name.
        </p>
      </div>
      <div className="lg:col-span-6 lg:col-start-7">
        <ul className="grid gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <li key={item} className="rounded-xl border border-line bg-surface p-4 text-sm leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function DirectConnection() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-6">
        <p className="max-w-[50ch] text-base leading-relaxed text-ink-soft">
          Discover transport employers, compare their opportunities and contact companies directly. Your profile and
          employment decisions remain under your control.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-ink-soft">
          <li>· You decide whether a profile is visible, and to whom.</li>
          <li>· You choose which employer to write to, and what to share.</li>
          <li>· No allocation, no ranking, no intermediary between you and the employer.</li>
        </ul>
      </div>
      <div className="lg:col-span-4 lg:col-start-9">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">For employers</p>
          <p className="mt-2 text-base leading-relaxed">
            Publish the conditions, present the fleet and answer drivers in public.
          </p>
          <Link href="/for-employers" className="mt-4 inline-flex text-sm font-medium">
            <span className="draw-underline">See employer plans</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

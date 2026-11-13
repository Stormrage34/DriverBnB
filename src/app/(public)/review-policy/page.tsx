import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Check, MessageSquareQuote, Scale, ShieldCheck, X } from "lucide-react";

export const metadata: Metadata = {
  title: "Review policy",
  description:
    "Eligibility, moderation, right of reply and removal rules for driver reviews on DriverCompass.",
};

export default function ReviewPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">Trust</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Review policy</h1>
      <p className="mt-2 text-xs text-muted">Version 1.0 · 12 November 2026</p>

      <p className="mt-4 text-sm leading-relaxed text-ink-soft">
        Reviews exist to tell drivers what employment at a company is actually like. That requires honesty
        from reviewers, restraint from employers and consistent moderation from us. This policy applies to
        every review and employer response.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: "Eligibility", copy: "A genuine employment experience, attested and checked." },
          { icon: MessageSquareQuote, title: "Right of reply", copy: "Employers can answer publicly — once per review." },
          { icon: Scale, title: "No paid removal", copy: "Payment cannot remove criticism or change a rating." },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-line bg-surface p-4">
            <item.icon size={16} className="text-brand" />
            <p className="mt-2 text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{item.copy}</p>
          </div>
        ))}
      </div>

      <div className="prose-legal mt-10 max-w-none">
        <h2>1. Who may review</h2>
        <ul>
          <li>Drivers who have worked for the company, as an employee or genuine contractor.</li>
          <li>One review per driver per employment period. Duplicate periods are blocked automatically.</li>
          <li>Reviews must state the employment period and the reviewer must attest to the experience.</li>
          <li>Reviews are published pseudonymously (first name and initial). Your contact details are never published.</li>
          <li>We may ask for evidence of employment — for example a contract, payslip or tachograph-based confirmation — where a review is disputed or a pattern suggests manipulation.</li>
        </ul>

        <h2>2. What a review should cover</h2>
        <ul>
          <li>Payment reliability: was salary paid on time and in full?</li>
          <li>Advertisement accuracy: did the actual conditions match the vacancy?</li>
          <li>Dispatch and management: was communication professional?</li>
          <li>Equipment: was the truck maintained properly?</li>
          <li>Home time: were agreed rotations respected?</li>
          <li>Accommodation: were rest arrangements suitable?</li>
          <li>Deductions: were they explained and justified?</li>
          <li>Working conditions: were drivers treated fairly?</li>
        </ul>

        <h2>3. What must not be published</h2>
        <ul>
          <li>Names, photos, phone numbers, addresses or other personal data of individuals.</li>
          <li>Allegations of criminal conduct, fraud, exploitation or legal violations presented as established facts without substantiation.</li>
          <li>Abuse, threats, discriminatory language or harassment.</li>
          <li>Content unrelated to the employment experience, including commercial promotion.</li>
          <li>Confidential information that would breach a legal duty (for example customer pricing or personal data of colleagues).</li>
        </ul>
        <p>
          If you need to raise a criminal or safety allegation, contact{" "}
          <a href="mailto:trust@drivercompass.eu">trust@drivercompass.eu</a> instead of posting it. We will assess
          it, may seek legal review, and will not publish it as fact without an appropriate basis.
        </p>

        <h2>4. Moderation process</h2>
        <ul>
          <li>Every review starts as <strong>pending</strong> and is not visible publicly.</li>
          <li>A moderator checks eligibility signals, personal data, abuse and legal risk, normally within 5 working days.</li>
          <li>Outcomes: published, returned for correction, rejected with reasons, or escalated for legal review.</li>
          <li>Moderation decisions are recorded with the reviewer, date and reasoning.</li>
          <li>Reviews may later be placed under review if reported or if new evidence emerges.</li>
        </ul>

        <h2>5. Employer right of reply</h2>
        <ul>
          <li>An employer may publish one response per review, visible directly beneath it.</li>
          <li>Responses must address the substance, not attack the reviewer personally or reveal their identity.</li>
          <li>Responses are moderated under the same rules as reviews.</li>
          <li>An employer may report a review they believe breaches this policy; they cannot delete it by disagreeing with it.</li>
        </ul>

        <h2>6. Corrections and removal</h2>
        <p>
          A review is removed only where it breaches this policy, is unlawful, is shown to be fabricated, or
          the reviewer asks for deletion. Removal is never available for payment, subscription tier or
          commercial relationship. Where a review is removed, the decision and reason are logged.
        </p>

        <h2>7. Reporting and appeals</h2>
        <p>
          Anyone can report a review using the report link. Reviewers and employers may appeal a moderation
          decision by writing to <a href="mailto:trust@drivercompass.eu">trust@drivercompass.eu</a> within 30 days,
          explaining the error. Appeals are decided by a different moderator where practicable. Where a
          dispute raises defamation, data protection or employment-law questions, we may restrict the content
          while obtaining advice.
        </p>

        <h2>8. Manipulation</h2>
        <p>
          Buying, incentivising or coordinating reviews is prohibited. We look for duplicate accounts, shared
          devices, implausible employment periods and review bursts. Confirmed manipulation leads to removal
          of the reviews and suspension of the accounts involved — including employer accounts.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-warning/25 bg-warning-soft p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-warning">
          <AlertTriangle size={15} /> A note on evidence
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          We do not publish private evidence. If you send a contract or payslip to support a review, it is
          used only for moderation and is not shown to the employer or the public.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-success"><Check size={15} /> Allowed</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            “Salary was paid on the 5th every month for 14 months. Rotation changed twice without notice.”
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-danger"><X size={15} /> Not allowed</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">
            “The dispatcher [full name] is a thief and the company is running an illegal scam.” — names a
            person and asserts criminality without evidence.
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted">
        See also the <Link href="/terms" className="underline underline-offset-4">terms of service</Link> and{" "}
        <Link href="/privacy" className="underline underline-offset-4">privacy notice</Link>.
      </p>
    </div>
  );
}

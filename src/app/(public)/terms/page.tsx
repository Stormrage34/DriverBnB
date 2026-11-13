import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for drivers, employers and visitors using the DriverCompass pilot platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Terms of service</h1>
      <p className="mt-2 text-xs text-muted">Version 1.0 · 12 November 2026 · pilot draft pending legal review</p>

      <div className="prose-legal mt-8 max-w-none">
        <h2>1. What DriverCompass is</h2>
        <p>
          DriverCompass is a platform that publishes company profiles, structured vacancies and driver reviews,
          and enables direct contact between drivers and transport employers. It is not a recruitment agency,
          employment agency, payroll provider or transport operator. We do not select candidates, negotiate
          wages, conclude employment contracts or take responsibility for the execution of carriage.
        </p>
        <p>
          Any employment or commercial relationship is formed directly between the driver and the employer.
          Neither party is obliged to enter into it, and either may end discussions at any time.
        </p>

        <h2>2. Accounts</h2>
        <ul>
          <li>You must be at least 18 and provide accurate, current information.</li>
          <li>You are responsible for keeping your credentials secure and for activity under your account.</li>
          <li>One person may not maintain accounts for the purpose of manipulating reviews or enquiries.</li>
          <li>We may suspend or close accounts that breach these terms, the review policy or applicable law.</li>
        </ul>

        <h2>3. Driver obligations</h2>
        <ul>
          <li>Keep qualifications and experience accurate. We do not verify licences unless explicitly stated.</li>
          <li>Do not misrepresent your identity, right to work or licence status.</li>
          <li>Review only employers you genuinely worked for, and describe measurable conditions rather than personal attacks.</li>
          <li>Do not share another person’s personal data in enquiries or reviews.</li>
        </ul>

        <h2>4. Employer obligations</h2>
        <ul>
          <li>Identify the legal entity that signs the employment contract for every vacancy.</li>
          <li>Disclose whether you are a direct employer, recruitment agency, subcontractor or intermediary.</li>
          <li>Publish gross pay and itemise allowances; never present gross pay as net.</li>
          <li>Reconfirm vacancies at least every 30 days and expire roles that are filled.</li>
          <li>Do not discriminate unlawfully or publish vacancies that are not genuine.</li>
          <li>Verification evidence must be authentic. Submitting another company’s documents is grounds for immediate suspension and may be unlawful.</li>
        </ul>

        <h2>5. Reviews, moderation and right of reply</h2>
        <p>
          Reviews are moderated under the <Link href="/review-policy">review policy</Link>. Employers may
          publish one response per review. Employers cannot delete reviews, edit ratings or pay to change
          their position. We may remove content that breaches the policy, exposes personal data, makes
          unsubstantiated criminal allegations or is unlawful. Moderation decisions and their reasons are
          recorded.
        </p>

        <h2>6. Verification</h2>
        <p>
          A verification badge records that specified checks were completed on a date. It is not a guarantee
          of working conditions, solvency, safety or continued vacancy availability. Verification status and
          vacancy confirmation are separate and must not be conflated. A paid subscription never affects
          verification status.
        </p>

        <h2>7. Paid plans</h2>
        <p>
          Paid employer plans, when introduced, purchase visibility and recruitment tools only. Prices shown
          in this build are hypotheses and no payment is taken. Future billing terms, renewal and
          cancellation rules will be published before any charge is made.
        </p>

        <h2>8. Prohibited conduct</h2>
        <ul>
          <li>Impersonating a company or a driver.</li>
          <li>Scraping, harvesting or bulk-messaging users.</li>
          <li>Posting fake vacancies, fake reviews or manipulated ratings.</li>
          <li>Uploading malicious code or attempting to bypass access controls.</li>
          <li>Using the platform to advertise unlawful employment or bogus self-employment arrangements.</li>
        </ul>

        <h2>9. Content and licence</h2>
        <p>
          You retain ownership of the content you submit. You grant us a non-exclusive, worldwide licence to
          host, display and moderate it for the purpose of operating the platform. We may remove content
          that breaches these terms or the law.
        </p>

        <h2>10. Availability and liability</h2>
        <p>
          The pilot is provided “as is”. We do not guarantee uninterrupted availability, that every vacancy is
          accurate beyond the recorded confirmation date, or that a driver will find employment. To the extent
          permitted by law, we are not liable for indirect or consequential loss arising from reliance on
          employer-declared information. Nothing in these terms limits liability that cannot be limited by
          law, including for consumers.
        </p>

        <h2>11. Suspension and termination</h2>
        <p>
          You may delete your account at any time in account settings. We may suspend accounts, remove
          content or restrict features where necessary to protect users, comply with law or investigate
          reports. Where a decision affects an employer’s verification, the employer may request a review.
        </p>

        <h2>12. Governing law and disputes</h2>
        <p>
          These terms are governed by the laws of the Republic of Bulgaria, without prejudice to mandatory
          consumer protections in your country of residence. Before litigation, please contact us so we can
          try to resolve the issue.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these terms: <a href="mailto:legal@drivercompass.eu">legal@drivercompass.eu</a> or the{" "}
          <Link href="/contact">contact form</Link>.
        </p>
        <p className="text-xs">
          Pilot draft. Before public launch, these terms must be reviewed by qualified counsel in each
          operating country, including employment-agency, consumer and e-commerce requirements.
        </p>
      </div>
    </div>
  );
}

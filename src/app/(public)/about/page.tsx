import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Ban, Handshake, Lock, MessageSquareQuote, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About DriverCompass",
  description:
    "Why a driver-first transport network exists: transparent employers, structured conditions, direct contact and driver control.",
};

const PRINCIPLES = [
  {
    icon: Handshake,
    title: "The platform introduces. It does not decide.",
    copy: "We never choose an employer for a driver, accept an offer, rank candidates for money or negotiate wages. The relationship belongs to the two parties.",
  },
  {
    icon: BadgeCheck,
    title: "Verification is evidence, not marketing.",
    copy: "Identity checks and vacancy confirmations are recorded, dated and separate. A subscription never changes a badge.",
  },
  {
    icon: MessageSquareQuote,
    title: "Drivers can be honest without being reckless.",
    copy: "Reviews cover measurable conditions, carry a right of reply and are moderated for personal data and unsubstantiated allegations.",
  },
  {
    icon: Lock,
    title: "Looking for work is private.",
    copy: "Profiles and CVs are private by default. Employers cannot browse drivers; drivers choose who sees their details.",
  },
  {
    icon: Ban,
    title: "No pay-to-erase.",
    copy: "Companies cannot buy a better rating, delete criticism or hide the fact that they are an intermediary.",
  },
  {
    icon: Truck,
    title: "Conditions beat adjectives.",
    copy: "Gross pay, rotation, home time, accommodation and loading duties are structured fields — comparable across companies.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted">About the project</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Recruitment built around the driver’s decision.
      </h1>
      <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-ink-soft">
        DriverCompass is a European transport network for professional drivers and the companies that employ
        them. It is being built by an international C+E driver with experience across Benelux, Scandinavia and
        Germany — because the information gap between a vacancy advert and the actual job is not a small
        inconvenience. It decides whether a driver’s week, income and rest are workable.
      </p>
      <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-ink-soft">
        The pilot starts in the Netherlands: reefer, ADR tanker, tank-container, sea-container and box
        transport, with expansion to Germany and Belgium once the verification model works in one market.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {PRINCIPLES.map((principle) => (
          <div key={principle.title} className="rounded-2xl border border-line bg-surface p-5">
            <principle.icon size={18} className="text-brand" strokeWidth={1.8} />
            <p className="mt-3 text-sm font-semibold">{principle.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{principle.copy}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold tracking-tight">What DriverCompass is not</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
          <li>· Not a recruitment agency and not an employment agency.</li>
          <li>· Not a payroll company, umbrella scheme or bogus self-employment marketplace.</li>
          <li>· Not a freight exchange; we do not negotiate loads, rates or carriage contracts.</li>
          <li>· Not a candidate-ranking product: employers cannot pay to see or prioritise drivers.</li>
          <li>· Not a review site where reputation can be bought.</li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Where the platform’s functions could require authorisation in a Member State, the pilot scope and
          legal position are reviewed before launch in that country. This page is product communication, not
          legal advice.
        </p>
      </div>

      <div className="mt-10 rounded-3xl bg-brand-solid p-6 text-white sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight">A platform is credible when a driver can say:</h2>
        <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-white/75">
          “I know who this company is, I understand what the job actually pays and requires, I have read what
          other drivers experienced, and I decided to contact them myself.”
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href="/register?role=driver" variant="accent">
            Create a driver account <ArrowRight size={15} />
          </ButtonLink>
          <ButtonLink href="/for-employers" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/15">
            For employers
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

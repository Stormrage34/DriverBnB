
import { AppFrame } from "@/components/home/app-frame";
import { HeroTriptych } from "@/components/home/hero-triptych";
import { Faq, FaqSchema } from "@/components/home/faq";
import { TaglineReveal } from "@/components/home/tagline-reveal";
import {
  DirectConnection,
  EmployerBand,
  EmployerIntelligence,
  SkillsValue,
  Steps,
  Trust,
} from "@/components/home/sections";

export const dynamic = "force-dynamic";

function Section({
  id,
  label,
  heading,
  lead,
  children,
  height = "screen",
}: {
  id?: string;
  label: string;
  heading: string;
  lead?: string;
  children: React.ReactNode;
  height?: "screen" | "auto";
}) {
  return (
    <section
      id={id}
      className={
        height === "screen"
          ? "mx-auto flex min-h-[100svh] w-full max-w-[1280px] flex-col justify-start px-4 pb-16 pt-16 sm:px-6 lg:pb-16 lg:pt-24"
          : "mx-auto w-full max-w-[1280px] px-4 py-16 sm:px-6 lg:py-[120px]"
      }
    >
      <div className="grid gap-4 lg:grid-cols-12">
        <p className="text-xs uppercase tracking-[0.16em] text-muted lg:col-span-3">{label}</p>
        <div className="lg:col-span-6">
          <h2 className="text-3xl font-semibold lg:text-5xl">{heading}</h2>
        </div>
        {lead ? (
          <p className="text-base text-ink-soft lg:col-span-3 lg:pt-2">{lead}</p>
        ) : null}
      </div>
      <div className="mt-12 lg:mt-16">{children}</div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-[1280px] items-center px-4 py-10 sm:px-6 lg:py-0">
        <div className="w-full">
          <p className="mb-4 flex items-center gap-2 text-sm text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
            Pilot build: company profiles are demo data, and no vacancies are live yet.
          </p>
          <HeroTriptych />
        </div>
      </section>

      <Section
        id="record"
        label="The vacancy record"
        heading="One record, the same fields, in the same order."
        lead="Pay and whether it is gross or net, the accommodation, the rotation, who loads and unloads, the truck, and whether the employer hires directly or through an agency."
      >
        <AppFrame />
      </Section>

      <Section
        id="reviews"
        label="Employer intelligence"
        heading="Don't just read the job offer. Hear from the drivers."
      >
        <EmployerIntelligence />
      </Section>

      <Section
        id="skills"
        label="Professional value"
        heading="Your experience has value. Make it visible."
        lead="One profile you control for licences, qualifications, specialisms and the work you have actually done."
      >
        <SkillsValue />
      </Section>

      <Section
        id="how"
        label="How the search works"
        heading="Four steps, and the driver keeps the decision."
        lead="DriverCompass introduces the parties and structures the information. It does not select, rank or negotiate."
      >
        <Steps />
      </Section>

      <section className="mx-auto flex min-h-[100svh] w-full max-w-[1280px] flex-col justify-center px-4 py-16 sm:px-6 lg:py-24">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Why this exists</p>
        <div className="mt-6">
          <TaglineReveal text="Real drivers. Real experiences. Better employment decisions." />
        </div>
        <p className="mt-8 max-w-[52ch] text-base text-ink-soft">
          An advert says what a company promises. A record says what the conditions were, and a review says what
          the work was like for someone who was there.
        </p>
      </section>

      <Section
        id="trust"
        label="Checks and reviews"
        heading="Three checks and a review with a right of reply."
        lead="Each check is recorded and shown separately, so a paid listing never reads as a verified one."
      >
        <Trust />
      </Section>

      <Section
        id="direct"
        label="Direct marketplace"
        heading="Connect directly. Keep control."
        lead="Discovery, information and connection are the platform's job. The employment decision stays with the driver."
      >
        <DirectConnection />
      </Section>

      <Section
        id="faq"
        label="Questions"
        heading="What drivers ask before they sign up."
        lead="Short answers, no sales language."
      >
        <Faq />
      </Section>

      <Section
        id="employers"
        label="For transport employers"
        heading="Good employers deserve to stand out."
        lead="Publish transparent employment conditions, present your fleet and connect directly with qualified drivers."
      >
        <EmployerBand />
      </Section>
      <FaqSchema />
    </>
  );
}

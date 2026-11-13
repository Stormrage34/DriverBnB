import Link from "next/link";

const QUESTIONS = [
  {
    q: "Is DriverCompass a recruitment agency?",
    a: "No. We publish employment conditions, record what drivers report and carry the enquiry. The employment discussion happens directly between the driver and the employer.",
  },
  {
    q: "Can an employer pay for better reviews?",
    a: "No. A subscription buys listing tools. It does not move a review, a score, a verification or a ranking, and a paid listing is never marked as verified.",
  },
  {
    q: "How is a review verified?",
    a: "The platform confirms the employer, the relationship and the period. It does not confirm the opinion, and it never publishes the driver's identity in order to verify it.",
  },
  {
    q: "What happens to my reviews if I hide my profile?",
    a: "They stay published. Hiding a profile hides you, not what you reported. You choose separately whether your name, a role description or nothing is shown next to a review.",
  },
  {
    q: "Do I have to upload my CV or my documents?",
    a: "No. A profile works without documents. Document checks are optional, they are never public, and you can remove them.",
  },
  {
    q: "What does it cost a driver?",
    a: "Nothing. Creating a profile, reading employer records and reviews, and contacting employers through the platform are free.",
  },
];

export function Faq() {
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-7">
        <dl className="divide-y divide-line border-t border-line">
          {QUESTIONS.map((item) => (
            <div key={item.q} className="py-5 first:pt-0">
              <dt className="text-lg font-medium">{item.q}</dt>
              <dd className="mt-2 max-w-[62ch] text-base text-ink-soft">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="lg:col-span-4 lg:col-start-9">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-lg font-medium">Start with a profile, not a job application.</p>
          <p className="mt-2 text-base text-ink-soft">
            It takes the fields you already know and it stays private until you decide otherwise.
          </p>
          <Link
            href="/register?role=driver"
            className="mt-4 inline-flex h-12 items-center rounded-full bg-brand-solid px-5 text-sm font-semibold text-white transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-brand-600"
          >
            Create your driver profile
          </Link>
        </div>
      </div>
    </div>
  );
}

export function FaqSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: QUESTIONS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}

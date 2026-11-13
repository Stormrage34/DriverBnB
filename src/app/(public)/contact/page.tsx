import type { Metadata } from "next";
import { Mail, MessageSquare, ShieldAlert } from "lucide-react";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the DriverCompass pilot team about driver accounts, employer verification or content reports.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Talk to the pilot team</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">
        DriverCompass is a pre-alpha pilot. Driver questions, employer verification requests and
        corrections all go to the same small team.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_18rem]">
        <div className="rounded-2xl border border-line bg-surface p-6">
          <ContactForm />
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Mail size={15} className="text-brand" /> Direct email
            </p>
            <ul className="mt-3 space-y-3 text-sm">
              <li>
                <p className="text-xs uppercase tracking-wider text-muted">Drivers</p>
                <a href="mailto:drivers@drivercompass.eu" className="underline-offset-4 hover:underline">drivers@drivercompass.eu</a>
              </li>
              <li>
                <p className="text-xs uppercase tracking-wider text-muted">Employers</p>
                <a href="mailto:employers@drivercompass.eu" className="underline-offset-4 hover:underline">employers@drivercompass.eu</a>
              </li>
              <li>
                <p className="text-xs uppercase tracking-wider text-muted">Trust & safety</p>
                <a href="mailto:trust@drivercompass.eu" className="underline-offset-4 hover:underline">trust@drivercompass.eu</a>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-line bg-brand-100/60 p-5 text-xs leading-relaxed text-ink-soft">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <MessageSquare size={14} /> Response times
            </p>
            <p className="mt-2">Driver and employer questions: within 2 working days.</p>
            <p className="mt-1">Trust and safety reports: within 24 hours on working days.</p>
          </div>

          <div className="rounded-2xl border border-danger/20 bg-danger-soft p-5 text-xs leading-relaxed text-ink-soft">
            <p className="flex items-center gap-2 text-sm font-semibold text-danger">
              <ShieldAlert size={14} /> Not for emergencies
            </p>
            <p className="mt-2">
              If you are in immediate danger, contact local emergency services. DriverCompass cannot provide
              roadside assistance or legal advice.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

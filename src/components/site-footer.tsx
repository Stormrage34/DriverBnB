import Link from "next/link";
import { Logo } from "@/components/logo";

const COLUMNS = [
  {
    title: "For drivers",
    links: [
      { href: "/jobs", label: "Find jobs" },
      { href: "/companies", label: "Company directory" },
      { href: "/how-verification-works", label: "How verification works" },
      { href: "/register?role=driver", label: "Create a driver account" },
    ],
  },
  {
    title: "For employers",
    links: [
      { href: "/for-employers", label: "Why list with us" },
      { href: "/register?role=employer", label: "Register a company" },
      { href: "/employer", label: "Employer dashboard" },
      { href: "/contact", label: "Talk to the pilot team" },
    ],
  },
  {
    title: "Trust & legal",
    links: [
      { href: "/privacy", label: "Privacy notice" },
      { href: "/terms", label: "Terms of service" },
      { href: "/review-policy", label: "Review policy" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              A driver-first professional-driver marketplace. Built around drivers: employers publish
              transparent conditions, drivers keep control and contact them directly.
            </p>
            <p className="mt-4 text-xs text-muted">
              Pilot build · demo company data clearly labelled
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{column.title}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-soft underline-offset-4 hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} DriverCompass (pilot). All company profiles in this build are demo data.</p>
          <p>
            DriverCompass is not a recruitment agency and does not negotiate or conclude employment
            contracts.
          </p>
        </div>
      </div>
    </footer>
  );
}

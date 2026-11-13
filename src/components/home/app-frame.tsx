import { BadgeCheck, Building2, MapPin, Search } from "lucide-react";

const ROWS = [
  {
    company: "Rheinland Transport",
    role: "International C+E driver",
    where: "Rotterdam · NL",
    pay: "€3,180 gross",
    tag: "Direct employer",
    active: true,
  },
  {
    company: "Nordwärts Logistik",
    role: "Tanker driver, ADR",
    where: "Bremen · DE",
    pay: "€3,450 gross",
    tag: "Verified",
    active: false,
  },
  {
    company: "Vlaanderen Freight",
    role: "Distribution, nights",
    where: "Antwerp · BE",
    pay: "€2,890 gross",
    tag: "Agency, labelled",
    active: false,
  },
];

const RECORD = [
  { label: "Gross pay", value: "€2,760 per month", note: "€2,300 base · €540 allowances · €80 deductions" },
  { label: "Pay is", value: "Gross", note: "No net-per-day figure offered" },
  { label: "Accommodation", value: "Free", note: "Single room, no deduction" },
  { label: "Rotation", value: "Four weeks away, one week home", note: "Home time at the depot" },
  { label: "Loading", value: "Driver loads, customer unloads", note: "At the depot" },
  { label: "Employer", value: "Direct employer", note: "Not an agency placement" },
];

export function AppFrame() {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
          <Search size={14} aria-hidden /> C+E
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5">
          <MapPin size={14} aria-hidden /> Netherlands
        </span>
        <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 sm:inline-flex">
          Gross pay stated
        </span>
        <span className="ml-auto text-xs text-muted">3 of 3 records</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,22rem)_1fr]">
        <ul className="max-h-[190px] divide-y divide-line overflow-y-auto border-b border-line lg:max-h-none lg:overflow-visible lg:border-b-0 lg:border-r">
          {ROWS.map((row) => (
            <li
              key={row.company}
              className={row.active ? "bg-brand-100/60 px-4 py-4" : "px-4 py-4"}
              aria-current={row.active ? "true" : undefined}
            >
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <Building2 size={12} aria-hidden /> {row.tag}
              </p>
              <p className="mt-1 text-sm font-medium">{row.role}</p>
              <p className="text-xs text-ink-soft">
                {row.company} · {row.where}
              </p>
              <p className="mt-2 text-xs text-accent-ink">{row.pay}</p>
            </li>
          ))}
        </ul>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Vacancy record</p>
              <h3 className="mt-1 text-xl font-medium">International C+E driver</h3>
              <p className="text-sm text-ink-soft">Rheinland Transport · Rotterdam, Netherlands</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-medium text-success">
              <BadgeCheck size={13} aria-hidden /> Vacancy confirmed
            </span>
          </div>

          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {RECORD.map((field) => (
              <div key={field.label} className="border-t border-line pt-3">
                <dt className="text-xs uppercase tracking-[0.12em] text-muted">{field.label}</dt>
                <dd className="mt-1 text-sm font-medium">{field.value}</dd>
                <dd className="text-xs leading-relaxed text-ink-soft">{field.note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

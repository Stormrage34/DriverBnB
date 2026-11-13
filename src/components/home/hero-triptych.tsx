"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeroPiece = {
  kicker: string;
  title: string;
  lines: Array<{ label: string; value: string; tone?: "accent" | "muted" }>;
};

const SETS: HeroPiece[][] = [
  [
    {
      kicker: "Vacancy record",
      title: "International C+E, Rotterdam",
      lines: [
        { label: "Gross pay", value: "€2,300 base, €540 allowances" },
        { label: "Accommodation", value: "Free. Single room, no deduction" },
        { label: "Rotation", value: "Four weeks away, one week home" },
      ],
    },
    {
      kicker: "Company",
      title: "Direct employer, verified",
      lines: [
        { label: "Identity", value: "Checked against registration" },
        { label: "Vacancy", value: "Conditions confirmed" },
        { label: "Reviews", value: "Right of reply" },
      ],
    },
    {
      kicker: "Driver review",
      title: "From a driver who drove for them",
      lines: [
        { label: "Rotation", value: "As advertised" },
        { label: "Pay", value: "Gross, on time" },
        { label: "Home time", value: "One week, kept" },
      ],
    },
  ],
  [
    {
      kicker: "Vacancy record",
      title: "Tanker, Antwerp — no flat rate",
      lines: [
        { label: "Gross pay", value: "€3,450, allowances listed", tone: "accent" },
        { label: "Accommodation", value: "Not provided, hotel paid" },
        { label: "Loading", value: "Driver loads, 3 times a week" },
      ],
    },
    {
      kicker: "Verification",
      title: "Three checks, recorded apart",
      lines: [
        { label: "Company identity", value: "Verified" },
        { label: "Employer type", value: "Direct, not agency" },
        { label: "Vacancy details", value: "Confirmed by employer" },
      ],
    },
    {
      kicker: "Driver review",
      title: "Two years on the same route",
      lines: [
        { label: "Pay", value: "Never late" },
        { label: "Truck", value: "As stated" },
        { label: "Weekends", value: "At the depot" },
      ],
    },
  ],
  [
    {
      kicker: "Vacancy record",
      title: "Distribution, Bremen — home nightly",
      lines: [
        { label: "Gross pay", value: "€2,890 plus shift allowance", tone: "accent" },
        { label: "Home time", value: "Nightly, depot 20 minutes" },
        { label: "Loading", value: "Not the driver's duty" },
      ],
    },
    {
      kicker: "Company",
      title: "Agency vacancy, labelled",
      lines: [
        { label: "Employer type", value: "Agency, stated up front" },
        { label: "Contract", value: "With the agency, not the depot" },
        { label: "Pay", value: "Gross, per hour" },
      ],
    },
    {
      kicker: "Driver review",
      title: "Written after the last trip",
      lines: [
        { label: "Rotation", value: "As advertised" },
        { label: "Accommodation", value: "Clean, shared" },
        { label: "Reply", value: "Employer answered" },
      ],
    },
  ],
];

export function HeroTriptych() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (paused || reduced.matches) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % SETS.length), 2800);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused]);

  return (
    <div className="relative h-full">
      <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-3" data-enter>
          <h1 className="hero-heading max-w-[14ch] text-4xl font-semibold lg:text-5xl">
            Know the employer. Choose your next move.
          </h1>
          <p className="mt-6 max-w-[34ch] text-base text-ink-soft">
            Compare transport employers, discover genuine driver experiences, showcase your
            professional skills and connect directly with companies across Europe.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register?role=driver"
              className="inline-flex h-12 items-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium transition hover:bg-paper"
            >
              Create your driver profile
            </Link>
          </div>
        </div>

        <div className="relative lg:col-span-6 lg:col-start-4" data-visual>
          <div className="relative mx-auto h-[300px] w-full max-w-[628px] overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:h-[440px] lg:h-[716px] lg:p-6">
            {SETS.map((set, setIndex) => (
              <div
                key={setIndex}
                aria-hidden={setIndex !== index}
                className={cn(
                  "absolute inset-4 grid grid-rows-3 gap-3 transition-opacity duration-700 lg:inset-6 lg:gap-4",
                  setIndex === index ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                {set.map((piece, pieceIndex) => (
                  <article
                    key={piece.title}
                    className={cn(
                      "rounded-xl border border-line bg-paper/70 p-4",
                      pieceIndex === 0 && "border-accent/40",
                    )}
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">{piece.kicker}</p>
                    <h2 className="mt-1 text-base font-medium">{piece.title}</h2>
                    <dl className="mt-3 space-y-1.5">
                      {piece.lines.map((line) => (
                        <div key={line.label} className="grid grid-cols-[8rem_1fr] gap-2 text-xs">
                          <dt className="text-muted">{line.label}</dt>
                          <dd className="text-ink">
                            {line.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play the record examples" : "Pause the record examples"}
              className="absolute bottom-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-soft transition hover:text-ink lg:bottom-6 lg:right-6"
            >
              {paused ? <Play size={14} /> : <Pause size={14} />}
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 lg:col-start-10 lg:justify-self-end" data-enter>
          <Link
            href="/jobs"
            className="group inline-flex h-16 w-full items-center justify-between gap-6 rounded-full bg-ink px-6 text-base font-medium text-paper transition hover:opacity-90 lg:w-auto"
          >
            Find employers
            <span aria-hidden className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

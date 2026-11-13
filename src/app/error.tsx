"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">This page could not load</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        Your data has not been changed. Try again, or return to the job board. If the problem
        continues, contact us with the reference below.
      </p>
      {error.digest ? <p className="mt-3 text-xs text-muted">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-full bg-brand-solid px-5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Try again
        </button>
        <Link
          href="/jobs"
          className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-paper"
        >
          Back to jobs
        </Link>
      </div>
    </div>
  );
}

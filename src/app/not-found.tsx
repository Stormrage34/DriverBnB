import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
        The page may have moved, expired or never existed. You can return to the job board or browse
        employers who publish structured working conditions.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href="/jobs"
          className="inline-flex min-h-11 items-center rounded-full bg-brand-solid px-5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Find jobs
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-sm font-medium text-ink hover:bg-paper"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

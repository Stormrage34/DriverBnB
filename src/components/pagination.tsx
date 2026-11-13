import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  perPage,
  total,
  basePath,
  searchParams,
}: {
  page: number;
  perPage: number;
  total: number;
  basePath: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams ?? {})) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const window = [];
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  for (let i = start; i <= Math.min(pages, start + 4); i += 1) window.push(i);

  return (
    <nav className="flex items-center justify-between gap-3 pt-2" aria-label="Pagination">
      <p className="text-xs text-muted">
        Page {page} of {pages} · {total} results
      </p>
      <div className="flex items-center gap-1">
        <Link
          href={href(Math.max(1, page - 1))}
          aria-label="Previous page"
          aria-disabled={page === 1}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink-soft",
            page === 1 && "pointer-events-none opacity-40",
          )}
        >
          <ChevronLeft size={16} />
        </Link>
        {window.map((p) => (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={cn(
              "grid h-10 min-w-10 place-items-center rounded-lg border px-2 text-xs",
              p === page
                ? "border-brand bg-brand-solid text-white"
                : "border-line bg-surface text-ink-soft hover:bg-paper",
            )}
          >
            {p}
          </Link>
        ))}
        <Link
          href={href(Math.min(pages, page + 1))}
          aria-label="Next page"
          aria-disabled={page === pages}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface text-ink-soft",
            page === pages && "pointer-events-none opacity-40",
          )}
        >
          <ChevronRight size={16} />
        </Link>
      </div>
    </nav>
  );
}

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
  const rounded = value === null ? 0 : Math.round(value * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value === null ? "No rating" : `${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rounded >= i;
        const half = !filled && rounded >= i - 0.5;
        return (
          <Star
            key={i}
            width={size}
            height={size}
            className={cn(
              filled || half ? "text-accent" : "text-line-strong",
              filled ? "fill-current" : half ? "fill-current opacity-50" : "",
            )}
            strokeWidth={1.5}
          />
        );
      })}
    </span>
  );
}

export function RatingInline({
  average,
  count,
  className,
}: {
  average: number | null;
  count: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted", className)}>
      {count > 0 && average !== null ? (
        <>
          <Stars value={average} />
          <span className="font-medium text-ink">{average.toFixed(1)}</span>
          <span>({count})</span>
        </>
      ) : (
        <span>No published reviews yet</span>
      )}
    </span>
  );
}

export function RatingBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-xs">
      <span className="text-ink-soft">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-line">
        <span
          className="block h-full rounded-full bg-accent"
          style={{ width: value === null ? "0%" : `${(value / 5) * 100}%` }}
        />
      </span>
      <span className="text-right font-medium tabular-nums text-ink">{value === null ? "—" : value.toFixed(1)}</span>
    </div>
  );
}

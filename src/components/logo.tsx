import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The DriverCompass mark: a two-tone heading — an amber leading edge over the
 * ink body. It reads as direction, not as a truck or a compass dial.
 * Keep the geometry identical to public/brand/mark.svg.
 */
export function Mark({
  size = 28,
  inverted = false,
  className,
}: {
  size?: number;
  inverted?: boolean;
  className?: string;
}) {
  const body = inverted ? "#F6F5F1" : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn(inverted ? "text-white" : "text-ink", className)}
    >
      <path d="M16 2 L27 30 L16 23 L5 30 Z" fill={body} />
      <path d="M16 2 L21.4 16.4 L16 23 L10.6 16.4 Z" fill="#E8A33D" />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="DriverCompass home"
    >
      <Mark size={26} inverted={inverted} />
      <span
        className={cn(
          "text-[1.05rem] font-semibold tracking-[-0.02em]",
          inverted ? "text-white" : "text-ink",
        )}
      >
        Driver<span className={inverted ? "text-accent" : "text-brand"}>Compass</span>
      </span>
    </Link>
  );
}

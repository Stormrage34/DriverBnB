import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(
  amount: number | null | undefined,
  currency = "EUR",
  options: { compact?: boolean } = {},
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    notation: options.compact ? "compact" : "standard",
  }).format(amount);
}

export function formatPayRange(
  min: number | null,
  max: number | null,
  currency: string,
  periodLabel: string,
): string {
  if (min === null && max === null) return "Pay not disclosed";
  if (min !== null && max !== null) {
    if (min === max) return `${formatMoney(min, currency)} ${periodLabel}`;
    return `${formatMoney(min, currency)} – ${formatMoney(max, currency)} ${periodLabel}`;
  }
  if (min !== null) return `From ${formatMoney(min, currency)} ${periodLabel}`;
  return `Up to ${formatMoney(max, currency)} ${periodLabel}`;
}

/** Normalise advertised pay to a monthly figure in EUR for comparison only. */
export function monthlyEquivalent(
  amount: number | null,
  period: "month" | "week" | "hour",
): number | null {
  if (amount === null || amount === undefined) return null;
  switch (period) {
    case "month":
      return Math.round(amount);
    case "week":
      return Math.round(amount * 4.333);
    case "hour":
      return Math.round(amount * 173.33);
  }
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function daysAgo(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export function relativeDays(value: Date | string | null | undefined): string {
  const days = daysAgo(value);
  if (days === null) return "—";
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(text: string, length = 160): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trimEnd()}…`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function uniqueSlug(base: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

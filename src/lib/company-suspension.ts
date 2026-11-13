import type { Company } from "@/db/schema";
import { isLiveVacancyStatus } from "@/lib/vacancy";
import { isFullyVerified } from "@/lib/verification";

export const SUSPENDED_COMPANY_ERROR =
  "This company is suspended. Publishing, editing and reconfirmation are disabled until an administrator restores it.";

export type CompanySuspensionState = Pick<
  Company,
  "suspendedAt" | "verificationStatus"
>;

export type CompanySuspensionDetails = CompanySuspensionState &
  Pick<Company, "suspensionReason">;

/**
 * Suspension is company-wide and independent of the verification status.
 * `verificationStatus === "suspended"` is a legacy state and is also treated as suspended.
 */
export function isCompanySuspended(company: CompanySuspensionState): boolean {
  return company.suspendedAt !== null || company.verificationStatus === "suspended";
}

export function companySuspensionReason(
  company: CompanySuspensionDetails,
): string | null {
  return company.suspensionReason ?? null;
}

export type VacancyRestorationInput = {
  currentStatus: string;
  previousStatus: string | null;
  publishable: boolean;
  companyStatus: string;
  companyVerificationVersion: number;
};

/**
 * Decide the status of a company-suspended vacancy on restoration.
 *
 * - An individual admin suspension has no `suspendedFromStatus`, so it is never selected.
 * - Expired/draft/unknown previous states are not republished.
 * - Invalid vacancies go to draft rather than back to public view.
 * - A verified label is restored only when the current company is trusted.
 */
export function resolveVacancyRestoration(input: VacancyRestorationInput): string {
  if (input.currentStatus !== "suspended") return input.currentStatus;
  if (!input.previousStatus || !isLiveVacancyStatus(input.previousStatus)) {
    return "suspended";
  }
  if (!input.publishable) return "draft";

  const trusted = isFullyVerified(
    input.companyStatus,
    input.companyVerificationVersion,
  );

  switch (input.previousStatus) {
    case "published_verified":
    case "published_unverified":
      return trusted ? "published_verified" : "published_unverified";
    case "confirmed":
      return "confirmed";
    case "reconfirmation_required":
      return "reconfirmation_required";
    default:
      return "suspended";
  }
}

import type { Vacancy } from "@/db/schema";
import { isLiveVacancyStatus, type PublishabilityResult } from "@/lib/vacancy";
import { resolveVacancyRestoration } from "@/lib/company-suspension";

export type VacancyModerationOutcome = "suspend" | "restore" | "expire";

export type VacancyModerationBlockReason =
  | "already_suspended"
  | "not_public"
  | "not_suspended"
  | "company_suspended"
  | "previous_status_unknown"
  | "previous_status_not_restorable"
  | "incomplete";

export type VacancyModerationContext = {
  currentStatus: string;
  /** Status stored by the company-suspension flow, if any. */
  suspendedFromStatus: string | null;
  /**
   * Status recorded when an administrator suspended this vacancy directly.
   * Individual suspensions deliberately keep `suspendedFromStatus` null so a
   * company restoration can never override them; their prior state is read
   * from the moderation audit trail instead.
   */
  recordedPreviousStatus: string | null;
  companySuspended: boolean;
  companyVerificationStatus: string;
  companyVerificationVersion: number;
  publishability: PublishabilityResult;
  /** True when the vacancy's reconfirmation window has elapsed. */
  reconfirmationOverdue?: boolean;
};

export type VacancyModerationResolution =
  | {
      ok: true;
      nextStatus: Vacancy["status"];
      previousStatus: string;
    }
  | {
      ok: false;
      reason: VacancyModerationBlockReason;
      missing?: string[];
    };

/**
 * Central authority for administrator vacancy moderation (KI-070).
 *
 * Restoration is the dangerous direction, so it is validated rather than
 * trusted: the vacancy must currently be suspended, the company must not be
 * suspended, a prior public state must be recorded, and the advert must still
 * be complete. An incomplete advert is never restored to a public status.
 *
 * Individual administrative suspensions store no `suspendedFromStatus` so the
 * company-restoration path skips them; their prior state is supplied from the
 * audit trail and is required for a manual restore.
 */
export function resolveVacancyModerationTransition(
  context: VacancyModerationContext,
  outcome: VacancyModerationOutcome,
): VacancyModerationResolution {
  const { currentStatus } = context;

  if (outcome === "suspend") {
    if (currentStatus === "suspended") return { ok: false, reason: "already_suspended" };
    if (!isLiveVacancyStatus(currentStatus)) return { ok: false, reason: "not_public" };
    return { ok: true, nextStatus: "suspended", previousStatus: currentStatus };
  }

  if (outcome === "expire") {
    if (currentStatus === "expired") return { ok: false, reason: "not_public" };
    if (currentStatus !== "suspended" && !isLiveVacancyStatus(currentStatus)) {
      return { ok: false, reason: "not_public" };
    }
    return { ok: true, nextStatus: "expired", previousStatus: currentStatus };
  }

  if (currentStatus !== "suspended") return { ok: false, reason: "not_suspended" };
  if (context.companySuspended) return { ok: false, reason: "company_suspended" };

  const previousStatus = context.suspendedFromStatus ?? context.recordedPreviousStatus;
  if (!previousStatus) return { ok: false, reason: "previous_status_unknown" };
  if (!isLiveVacancyStatus(previousStatus)) {
    return { ok: false, reason: "previous_status_not_restorable" };
  }
  if (!context.publishability.ok) {
    return { ok: false, reason: "incomplete", missing: context.publishability.missing };
  }

  const restored = resolveVacancyRestoration({
    currentStatus: "suspended",
    previousStatus,
    publishable: true,
    companyStatus: context.companyVerificationStatus,
    companyVerificationVersion: context.companyVerificationVersion,
  });

  // A restored advert whose confirmation window elapsed must be shown as
  // needing reconfirmation, never as freshly confirmed.
  const nextStatus =
    context.reconfirmationOverdue && restored !== "reconfirmation_required"
      ? "reconfirmation_required"
      : restored;

  return { ok: true, nextStatus: nextStatus as Vacancy["status"], previousStatus };
}

/** Outcomes the admin UI may offer for the current state. */
export function allowedVacancyModerationOutcomes(
  context: VacancyModerationContext,
): VacancyModerationOutcome[] {
  return (["suspend", "restore", "expire"] as const).filter(
    (outcome) => resolveVacancyModerationTransition(context, outcome).ok,
  );
}

export const VACANCY_MODERATION_BLOCK_MESSAGES: Record<VacancyModerationBlockReason, string> = {
  already_suspended: "This vacancy is already suspended.",
  not_public: "Only a live or suspended vacancy can be moderated.",
  not_suspended: "This vacancy is not suspended, so it cannot be restored.",
  company_suspended:
    "The company is suspended. Restore the company before restoring its vacancy.",
  previous_status_unknown:
    "The previous public state of this suspension is not recorded. Restoring it could publish a draft or expired advert, so it was left suspended.",
  previous_status_not_restorable:
    "The recorded previous state is not a public state. The vacancy was left suspended.",
  incomplete:
    "The vacancy is missing information required for publication. The vacancy was left suspended.",
};

import type { Vacancy } from "@/db/schema";

const KEY_FIELDS: Array<keyof Vacancy> = [
  "title",
  "country",
  "contractingEntity",
  "transportCategory",
  "licenceRequirements",
  "contractType",
  "grossPayMin",
  "payStructure",
  "workingPattern",
  "rotation",
  "homeTime",
  "loadingUnloading",
  "accommodation",
  "weeklyRest",
  "vehicleType",
  "operatingCountries",
  "languagesRequired",
];

/**
 * 0–100 completeness score used for ranking and for the driver-facing
 * "information completeness" signal. Empty arrays count as missing.
 */
export function computeInfoScore(vacancy: Partial<Vacancy>): number {
  let filled = 0;
  for (const field of KEY_FIELDS) {
    const value = vacancy[field];
    if (Array.isArray(value)) {
      if (value.length > 0) filled += 1;
    } else if (value !== null && value !== undefined && value !== "") {
      filled += 1;
    }
  }
  return Math.round((filled / KEY_FIELDS.length) * 100);
}

export type PublishabilityResult = { ok: true } | { ok: false; missing: string[] };

/**
 * A vacancy may be saved as a draft at any time, but publishing requires the
 * structured fields the driver needs to compare real conditions.
 */
export function checkPublishable(vacancy: Partial<Vacancy>): PublishabilityResult {
  const missing: string[] = [];
  if (!vacancy.title) missing.push("Job title");
  if (!vacancy.country) missing.push("Employment country");
  if (!vacancy.contractingEntity) missing.push("Contracting legal entity");
  if (!vacancy.transportCategory) missing.push("Transport category");
  if (vacancy.grossPayMin === null || vacancy.grossPayMin === undefined) {
    missing.push("Gross salary (minimum)");
  }
  if (!vacancy.payStructure) missing.push("Pay structure (what the salary includes)");
  if (!vacancy.workingPattern) missing.push("Working pattern");
  if (!vacancy.rotation) missing.push("Rotation");
  if (!vacancy.homeTime) missing.push("Home-time arrangements");
  if (!vacancy.weeklyRest) missing.push("Weekly rest arrangements");
  if (vacancy.accommodation === "not_disclosed" || !vacancy.accommodation) {
    missing.push("Accommodation arrangement");
  }
  if (!vacancy.licenceRequirements || vacancy.licenceRequirements.length === 0) {
    missing.push("Licence requirements");
  }
  if (!vacancy.applicationMethod) missing.push("Application method");
  if (vacancy.applicationMethod === "external_link" && !vacancy.applicationUrl) {
    missing.push("Application URL");
  }
  if (vacancy.applicationMethod === "email" && !vacancy.applicationEmail) {
    missing.push("Recruitment email");
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

export function payMonthly(
  amount: number | null,
  period: "month" | "week" | "hour" | string,
): number | null {
  if (amount === null || amount === undefined) return null;
  if (period === "week") return Math.round(amount * 4.333);
  if (period === "hour") return Math.round(amount * 173.33);
  return Math.round(amount);
}

/** Statuses in which a vacancy is visible to drivers and must remain complete. */
export const LIVE_VACANCY_STATUSES = [
  "published_unverified",
  "published_verified",
  "confirmed",
  "reconfirmation_required",
] as const;

export type LiveVacancyStatus = (typeof LIVE_VACANCY_STATUSES)[number];

export function isLiveVacancyStatus(status: string | null | undefined): status is LiveVacancyStatus {
  return status !== null && status !== undefined && (LIVE_VACANCY_STATUSES as readonly string[]).includes(status);
}

export type VacancySaveResolution =
  | { ok: true; nextStatus: Vacancy["status"]; requiresPublishable: boolean }
  | { ok: false; error: string };

/**
 * Decide whether a vacancy save is allowed and what status it should end in.
 *
 * Rules enforced here (and covered by tests):
 * - A suspended vacancy cannot be edited back into publication by its employer.
 * - Publishing requires every driver-facing condition field.
 * - A vacancy that is already live must satisfy the same completeness rules even when
 *   the employer saves without re-ticking "publish" — otherwise salary/conditions could
 *   be silently cleared on a live advert.
 * - Confirmed stays confirmed on edit; drafts can be saved incomplete.
 */
export function resolveVacancySave(input: {
  existingStatus: string | null;
  wantsPublish: boolean;
  companyVerified: boolean;
  draft: Partial<Vacancy>;
}): VacancySaveResolution {
  const { existingStatus, wantsPublish, companyVerified, draft } = input;

  if (existingStatus === "suspended") {
    return {
      ok: false,
      error: "This vacancy is suspended by moderation and cannot be edited or republished.",
    };
  }

  const requiresPublishable = wantsPublish || isLiveVacancyStatus(existingStatus);

  if (requiresPublishable) {
    const check = checkPublishable(draft);
    if (!check.ok) {
      return {
        ok: false,
        error: wantsPublish
          ? `Before publishing, complete: ${check.missing.join(", ")}.`
          : `A live vacancy cannot be saved with missing information: ${check.missing.join(
              ", ",
            )}. Complete the fields or expire the vacancy.`,
      };
    }
  }

  if (!existingStatus) {
    return {
      ok: true,
      nextStatus: wantsPublish
        ? companyVerified
          ? "published_verified"
          : "published_unverified"
        : "draft",
      requiresPublishable,
    };
  }

  if (!wantsPublish) {
    return { ok: true, nextStatus: existingStatus as Vacancy["status"], requiresPublishable };
  }

  if (existingStatus === "confirmed") {
    return { ok: true, nextStatus: "confirmed", requiresPublishable };
  }

  return {
    ok: true,
    nextStatus: companyVerified ? "published_verified" : "published_unverified",
    requiresPublishable,
  };
}

export type VacancyTransition = "publish" | "reconfirm";

export type VacancyTransitionResolution =
  | { ok: true; nextStatus: Vacancy["status"] }
  | { ok: false; error: string };

const PUBLISHABLE_FROM = new Set([
  "draft",
  "expired",
  "published_unverified",
  "published_verified",
  "reconfirmation_required",
  "confirmed",
]);

/**
 * Server-side state machine for employer-initiated vacancy transitions.
 *
 * This is the only place that decides whether publish/reconfirm is legal.
 * Both actions load the current row from the database and pass it here, so a
 * crafted POST cannot move a draft or an admin-suspended vacancy into a live
 * state without passing the same checks (H2).
 */
export function resolveVacancyTransition(input: {
  currentStatus: string;
  transition: VacancyTransition;
  draft: Partial<Vacancy>;
  companyVerified: boolean;
}): VacancyTransitionResolution {
  const { currentStatus, transition, draft, companyVerified } = input;

  if (currentStatus === "suspended") {
    return {
      ok: false,
      error: "This vacancy is suspended by moderation and cannot be published or reconfirmed.",
    };
  }

  if (transition === "publish") {
    if (!PUBLISHABLE_FROM.has(currentStatus)) {
      return {
        ok: false,
        error: `A vacancy with status "${currentStatus}" cannot be published.`,
      };
    }
    if (currentStatus === "confirmed") {
      return { ok: true, nextStatus: "confirmed" };
    }

    const check = checkPublishable(draft);
    if (!check.ok) {
      return { ok: false, error: `Before publishing, complete: ${check.missing.join(", ")}.` };
    }

    return {
      ok: true,
      nextStatus: companyVerified ? "published_verified" : "published_unverified",
    };
  }

  if (!isLiveVacancyStatus(currentStatus)) {
    return {
      ok: false,
      error: "Only a vacancy that is already live can be reconfirmed as open.",
    };
  }

  const check = checkPublishable(draft);
  if (!check.ok) {
    return {
      ok: false,
      error: `Before reconfirming, complete: ${check.missing.join(", ")}.`,
    };
  }

  return { ok: true, nextStatus: "confirmed" };
}

import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, companies, vacancies } from "@/db/schema";
import { RECONFIRM_AFTER_DAYS, RECONFIRM_GRACE_DAYS } from "@/lib/constants";
import { LIVE_VACANCY_STATUSES, isLiveVacancyStatus } from "@/lib/vacancy";
import { isCompanySuspended } from "@/lib/company-suspension";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_BATCH = 500;

export type VacancyLifecycleAction =
  | "none"
  | "mark_reconfirmation_required"
  | "expire";

export type VacancyLifecycleSkipReason =
  | "not_live"
  | "company_suspended"
  | "not_due"
  | "within_grace";

export type VacancyLifecycleInput = {
  status: string;
  reconfirmDueAt: Date | null;
  lastConfirmedAt: Date | null;
  companySuspended: boolean;
  now: Date;
};

export type VacancyLifecycleResolution =
  | { action: "none"; reason: VacancyLifecycleSkipReason }
  | {
      action: "mark_reconfirmation_required";
      nextStatus: "reconfirmation_required";
      dueAt: Date;
      graceEndsAt: Date;
    }
  | {
      action: "expire";
      nextStatus: "expired";
      dueAt: Date;
      graceEndsAt: Date;
    };

/**
 * Decide what the lifecycle job should do with a single live vacancy.
 *
 * A live vacancy becomes `reconfirmation_required` on its due date and is
 * expired only after a grace period, so an employer gets a visible window to
 * reconfirm before the advert disappears. A live legacy row with no
 * confirmation timestamps cannot prove freshness: its due date is treated as
 * "now", which starts the same grace window instead of hiding it immediately.
 * Suspended companies and suspended vacancies are never touched.
 */
export function resolveVacancyLifecycle(input: VacancyLifecycleInput): VacancyLifecycleResolution {
  if (input.status === "suspended") {
    return { action: "none", reason: "not_live" };
  }
  if (!isLiveVacancyStatus(input.status)) {
    return { action: "none", reason: "not_live" };
  }
  if (input.companySuspended) {
    return { action: "none", reason: "company_suspended" };
  }

  const dueAt =
    input.reconfirmDueAt ??
    (input.lastConfirmedAt
      ? new Date(input.lastConfirmedAt.getTime() + RECONFIRM_AFTER_DAYS * DAY_MS)
      : input.now);
  const graceEndsAt = new Date(dueAt.getTime() + RECONFIRM_GRACE_DAYS * DAY_MS);

  if (input.status === "reconfirmation_required") {
    if (input.now.getTime() < graceEndsAt.getTime()) {
      return { action: "none", reason: "within_grace" };
    }
    return { action: "expire", nextStatus: "expired", dueAt, graceEndsAt };
  }

  if (input.now.getTime() < dueAt.getTime()) {
    return { action: "none", reason: "not_due" };
  }

  return {
    action: "mark_reconfirmation_required",
    nextStatus: "reconfirmation_required",
    dueAt,
    graceEndsAt,
  };
}

export type VacancyLifecycleRunResult = {
  now: string;
  dryRun: boolean;
  scanned: number;
  markedReconfirmationRequired: number;
  expired: number;
  skipped: number;
};

export type VacancyLifecycleRunOptions = {
  now?: Date;
  dryRun?: boolean;
  limit?: number;
};

/**
 * Idempotent lifecycle sweep. Repeated runs make no further change once each
 * vacancy has reached its target state. Updates are conditional on the status
 * that was read, so two concurrent runs cannot double-apply a transition.
 *
 * No scheduler is deployed with this repository. Run it through the
 * authenticated internal route or the manual script documented in README.
 */
export async function processVacancyLifecycle(
  options: VacancyLifecycleRunOptions = {},
): Promise<VacancyLifecycleRunResult> {
  const now = options.now ?? new Date();
  const dryRun = options.dryRun ?? false;
  const limit = Math.min(MAX_BATCH, Math.max(1, options.limit ?? MAX_BATCH));

  const rows = await db
    .select({
      vacancy: {
        id: vacancies.id,
        status: vacancies.status,
        reconfirmDueAt: vacancies.reconfirmDueAt,
        lastConfirmedAt: vacancies.lastConfirmedAt,
      },
      company: {
        suspendedAt: companies.suspendedAt,
        verificationStatus: companies.verificationStatus,
      },
    })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(
      and(
        inArray(vacancies.status, [...LIVE_VACANCY_STATUSES]),
        or(
          eq(vacancies.status, "reconfirmation_required"),
          isNull(vacancies.reconfirmDueAt),
          lte(vacancies.reconfirmDueAt, now),
        ),
      ),
    )
    .orderBy(asc(vacancies.reconfirmDueAt))
    .limit(limit);

  const result: VacancyLifecycleRunResult = {
    now: now.toISOString(),
    dryRun,
    scanned: rows.length,
    markedReconfirmationRequired: 0,
    expired: 0,
    skipped: 0,
  };

  const transitions: Array<{
    id: string;
    currentStatus: string;
    nextStatus: "reconfirmation_required" | "expired";
    dueAt: Date;
    graceEndsAt: Date;
    setDueAt: Date | null;
  }> = [];

  for (const row of rows) {
    const resolution = resolveVacancyLifecycle({
      status: row.vacancy.status,
      reconfirmDueAt: row.vacancy.reconfirmDueAt,
      lastConfirmedAt: row.vacancy.lastConfirmedAt,
      companySuspended: isCompanySuspended(row.company),
      now,
    });

    if (resolution.action === "none") {
      result.skipped += 1;
      continue;
    }

    if (resolution.action === "mark_reconfirmation_required") {
      result.markedReconfirmationRequired += 1;
    } else {
      result.expired += 1;
    }

    transitions.push({
      id: row.vacancy.id,
      currentStatus: row.vacancy.status,
      nextStatus: resolution.nextStatus,
      dueAt: resolution.dueAt,
      graceEndsAt: resolution.graceEndsAt,
      setDueAt: row.vacancy.reconfirmDueAt === null ? resolution.dueAt : null,
    });
  }

  if (dryRun || transitions.length === 0) {
    return result;
  }

  await db.transaction(async (tx) => {
    for (const transition of transitions) {
      const updated = await tx
        .update(vacancies)
        .set({
          status: transition.nextStatus,
          ...(transition.setDueAt ? { reconfirmDueAt: transition.setDueAt } : {}),
          updatedAt: now,
        })
        .where(
          and(
            eq(vacancies.id, transition.id),
            eq(vacancies.status, transition.currentStatus as typeof vacancies.status.enumValues[number]),
          ),
        )
        .returning({ id: vacancies.id });

      if (updated.length === 0) continue;

      await tx.insert(auditLogs).values({
        actorUserId: null,
        action:
          transition.nextStatus === "expired"
            ? "vacancy.expired_by_lifecycle"
            : "vacancy.reconfirmation_required",
        entityType: "vacancy",
        entityId: transition.id,
        metadata: {
          previousStatus: transition.currentStatus,
          nextStatus: transition.nextStatus,
          dueAt: transition.dueAt.toISOString(),
          graceEndsAt: transition.graceEndsAt.toISOString(),
          trigger: "lifecycle",
        },
        ipAddress: "system",
      });
    }
  });

  return result;
}

import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  companies,
  contentReports,
  driverReviews,
  users,
  vacancies,
} from "@/db/schema";
import {
  readReviewPublicationEvidence,
  type ReviewPublicationEvidence,
} from "@/lib/reviews";

export const ADMIN_PAGE_SIZE = 20;
const MAX_ADMIN_PAGE = 500;

export type AdminPaged<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Bounded, validated page number. Anything malformed falls back to page 1. */
export function adminPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_ADMIN_PAGE);
}

/** Validated enum filter with an explicit "all" fallback. */
export function adminEnumFilter<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T | "all",
): T | "all" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

async function paged<T>(
  page: number,
  rows: Promise<T[]>,
  total: Promise<Array<{ value: number | string }>>,
): Promise<AdminPaged<T>> {
  const [rowsResult, totalResult] = await Promise.all([rows, total]);
  return {
    rows: rowsResult,
    total: Number(totalResult[0]?.value ?? 0),
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

/* ------------------------------------------------------------------ */
/* Vacancies                                                          */
/* ------------------------------------------------------------------ */

export type AdminVacancyStatus = (typeof vacancies.status.enumValues)[number];

export async function listAdminVacancies(input: { status?: string; page?: number } = {}) {
  const status = adminEnumFilter<AdminVacancyStatus>(
    input.status,
    vacancies.status.enumValues,
    "all",
  );
  const where = status === "all" ? undefined : eq(vacancies.status, status);
  const page = input.page ?? 1;

  return paged(
    page,
    db
      .select({
        vacancy: vacancies,
        company: {
          id: companies.id,
          legalName: companies.legalName,
          tradingName: companies.tradingName,
          slug: companies.slug,
          verificationStatus: companies.verificationStatus,
          verificationVersion: companies.verificationVersion,
          suspendedAt: companies.suspendedAt,
        },
      })
      .from(vacancies)
      .innerJoin(companies, eq(vacancies.companyId, companies.id))
      .where(where)
      .orderBy(desc(vacancies.updatedAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(vacancies).where(where),
  );
}

/**
 * Prior state recorded when an administrator suspended a vacancy directly.
 * Individual suspensions keep `suspended_from_status` null so company
 * restoration cannot revive them; the audit trail is the recorded context a
 * manual restore must validate against.
 */
export async function getRecordedVacancyPreviousStatuses(
  vacancyIds: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (vacancyIds.length === 0) return result;

  const logs = await db
    .select({
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "admin.vacancy_suspend"),
        inArray(auditLogs.entityId, vacancyIds),
      ),
    )
    .orderBy(desc(auditLogs.createdAt));

  for (const log of logs) {
    if (!log.entityId || result.has(log.entityId)) continue;
    const previous = log.metadata?.previousStatus;
    if (typeof previous === "string") result.set(log.entityId, previous);
  }
  return result;
}

export async function getRecordedVacancyPreviousStatus(
  vacancyId: string,
): Promise<string | null> {
  return (await getRecordedVacancyPreviousStatuses([vacancyId])).get(vacancyId) ?? null;
}

/* ------------------------------------------------------------------ */
/* Reviews                                                            */
/* ------------------------------------------------------------------ */

export type AdminReviewStatus = (typeof driverReviews.status.enumValues)[number];

/**
 * Recorded publication history for the listed reviews. A legacy `under_review`
 * row with no entries here cannot be proven never-published, so the moderator
 * UI must not offer publish/reject for it.
 */
export async function getReviewPublicationEvidenceMap(
  reviewIds: string[],
): Promise<Map<string, ReviewPublicationEvidence>> {
  const result = new Map<string, ReviewPublicationEvidence>();
  if (reviewIds.length === 0) return result;

  const events = await db
    .select({ entityId: auditLogs.entityId, metadata: auditLogs.metadata })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "admin.review_moderation"),
        eq(auditLogs.entityType, "review"),
        inArray(auditLogs.entityId, reviewIds),
      ),
    );

  const grouped = new Map<string, Array<{ metadata: Record<string, unknown> }>>();
  for (const event of events) {
    if (!event.entityId) continue;
    const list = grouped.get(event.entityId) ?? [];
    list.push({ metadata: event.metadata ?? {} });
    grouped.set(event.entityId, list);
  }

  for (const reviewId of reviewIds) {
    result.set(reviewId, readReviewPublicationEvidence(grouped.get(reviewId) ?? []));
  }
  return result;
}

export async function listAdminReviews(input: { status?: string; page?: number } = {}) {
  const status = adminEnumFilter<AdminReviewStatus>(
    input.status,
    driverReviews.status.enumValues,
    "all",
  );
  const where = status === "all" ? undefined : eq(driverReviews.status, status);
  const page = input.page ?? 1;

  return paged(
    page,
    db
      .select({
        review: driverReviews,
        company: {
          id: companies.id,
          legalName: companies.legalName,
          tradingName: companies.tradingName,
          slug: companies.slug,
        },
        authorName: users.displayName,
      })
      .from(driverReviews)
      .innerJoin(companies, eq(driverReviews.companyId, companies.id))
      .innerJoin(users, eq(driverReviews.driverUserId, users.id))
      .where(where)
      .orderBy(desc(driverReviews.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(driverReviews).where(where),
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                            */
/* ------------------------------------------------------------------ */

export type AdminReportStatus = (typeof contentReports.status.enumValues)[number];

export async function listAdminReports(input: { status?: string; page?: number } = {}) {
  const status = adminEnumFilter<AdminReportStatus>(
    input.status,
    contentReports.status.enumValues,
    "all",
  );
  const where = status === "all" ? undefined : eq(contentReports.status, status);
  const page = input.page ?? 1;

  return paged(
    page,
    db
      .select({
        report: contentReports,
        reporter: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
        },
      })
      .from(contentReports)
      .leftJoin(users, eq(contentReports.reporterUserId, users.id))
      .where(where)
      .orderBy(desc(contentReports.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(contentReports).where(where),
  );
}

/* ------------------------------------------------------------------ */
/* Users                                                              */
/* ------------------------------------------------------------------ */

export type AdminUserRole = (typeof users.role.enumValues)[number];
export const ADMIN_USER_STATES = ["active", "suspended"] as const;
export type AdminUserState = (typeof ADMIN_USER_STATES)[number];

/**
 * Explicit safe field selection. No password hash, session token, reset token
 * or other authentication secret may enter an admin list result.
 */
const adminUserColumns = {
  id: users.id,
  email: users.email,
  role: users.role,
  displayName: users.displayName,
  isActive: users.isActive,
  suspendedReason: users.suspendedReason,
  emailVerifiedAt: users.emailVerifiedAt,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export async function listAdminUsers(
  input: {
    role?: string;
    state?: string;
    q?: string;
    page?: number;
  } = {},
) {
  const role = adminEnumFilter<AdminUserRole>(input.role, users.role.enumValues, "all");
  const state = adminEnumFilter<AdminUserState>(input.state, ADMIN_USER_STATES, "all");
  const page = input.page ?? 1;

  const conditions: SQL[] = [];
  if (role !== "all") conditions.push(eq(users.role, role));
  if (state === "suspended") {
    conditions.push(or(eq(users.isActive, false), isNotNull(users.suspendedReason))!);
  } else if (state === "active") {
    conditions.push(eq(users.isActive, true), isNull(users.suspendedReason));
  }
  if (input.q) {
    const escaped = input.q.trim().replace(/[\\%_]/g, (match) => `\\${match}`);
    const pattern = `%${escaped}%`;
    conditions.push(or(ilike(users.email, pattern), ilike(users.displayName, pattern))!);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return paged(
    page,
    db
      .select(adminUserColumns)
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(users).where(where),
  );
}

/* ------------------------------------------------------------------ */
/* Audit log                                                          */
/* ------------------------------------------------------------------ */

export const ADMIN_AUDIT_ENTITIES = [
  "company",
  "vacancy",
  "review",
  "review_response",
  "report",
  "user",
  "driver_profile",
] as const;
export type AdminAuditEntity = (typeof ADMIN_AUDIT_ENTITIES)[number];

export async function listAdminAuditLogs(
  input: { entity?: string; page?: number } = {},
) {
  const entity = adminEnumFilter<AdminAuditEntity>(
    input.entity,
    ADMIN_AUDIT_ENTITIES,
    "all",
  );
  const where = entity === "all" ? undefined : eq(auditLogs.entityType, entity);
  const page = input.page ?? 1;

  return paged(
    page,
    db
      .select({
        log: auditLogs,
        actor: {
          id: users.id,
          displayName: users.displayName,
          email: users.email,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.actorUserId, users.id))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(auditLogs).where(where),
  );
}

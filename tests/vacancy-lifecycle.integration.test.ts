import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, savedVacancies, vacancies } from "@/db/schema";
import { getDriverDashboard } from "@/lib/queries";
import { processVacancyLifecycle } from "@/lib/vacancy-lifecycle";
import { resolveVacancyTransition } from "@/lib/vacancy";
import { createCompany, createUser, createVacancy } from "./helpers/fixtures";
import { ensureTestDatabase, truncateAll } from "./helpers/test-db";

const NOW = new Date("2026-06-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("vacancy lifecycle execution", () => {
  let driverId: string;
  let employerId: string;
  let dueVacancyId: string;
  let lateGraceVacancyId: string;
  let futureVacancyId: string;
  let suspendedVacancyId: string;
  let suspendedCompanyVacancyId: string;
  let legacyVacancyId: string;
  let expiredVacancyId: string;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();

    employerId = await createUser("employer", "lifecycle-employer@test.local");
    driverId = await createUser("driver", "lifecycle-driver@test.local");

    const company = await createCompany({
      ownerUserId: employerId,
      slug: "lifecycle-active-company",
      legalName: "Lifecycle Active Company B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });

    const suspendedCompany = await createCompany({
      ownerUserId: employerId,
      slug: "lifecycle-suspended-company",
      legalName: "Lifecycle Suspended Company B.V.",
      suspendedAt: new Date(NOW.getTime() - 10 * DAY),
      suspensionReason: "Test suspension.",
    });

    const due = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "lifecycle-due-vacancy",
      status: "published_verified",
    });
    dueVacancyId = due.id;

    const lateGrace = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "lifecycle-late-grace-vacancy",
      status: "reconfirmation_required",
    });
    lateGraceVacancyId = lateGrace.id;

    const future = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "lifecycle-future-vacancy",
      status: "published_unverified",
    });
    futureVacancyId = future.id;

    const suspended = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "lifecycle-suspended-vacancy",
      status: "suspended",
    });
    suspendedVacancyId = suspended.id;

    const suspendedCompanyVacancy = await createVacancy({
      companyId: suspendedCompany.id,
      createdByUserId: employerId,
      slug: "lifecycle-suspended-company-vacancy",
      status: "published_verified",
    });
    suspendedCompanyVacancyId = suspendedCompanyVacancy.id;

    const legacy = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "lifecycle-legacy-vacancy",
      status: "confirmed",
    });
    legacyVacancyId = legacy.id;

    const expired = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "lifecycle-expired-vacancy",
      status: "expired",
    });
    expiredVacancyId = expired.id;

    await db
      .update(vacancies)
      .set({
        reconfirmDueAt: new Date(NOW.getTime() - DAY),
        lastConfirmedAt: new Date(NOW.getTime() - 31 * DAY),
      })
      .where(inArray(vacancies.id, [dueVacancyId, suspendedVacancyId]));
    await db
      .update(vacancies)
      .set({
        reconfirmDueAt: new Date(NOW.getTime() - 8 * DAY),
        lastConfirmedAt: new Date(NOW.getTime() - 38 * DAY),
      })
      .where(eq(vacancies.id, lateGraceVacancyId));
    await db
      .update(vacancies)
      .set({
        reconfirmDueAt: new Date(NOW.getTime() + 5 * DAY),
        lastConfirmedAt: new Date(NOW.getTime() - 25 * DAY),
      })
      .where(eq(vacancies.id, futureVacancyId));
    await db
      .update(vacancies)
      .set({
        reconfirmDueAt: new Date(NOW.getTime() - 20 * DAY),
        lastConfirmedAt: new Date(NOW.getTime() - 50 * DAY),
      })
      .where(eq(vacancies.id, suspendedCompanyVacancyId));
    await db
      .update(vacancies)
      .set({
        reconfirmDueAt: null,
        lastConfirmedAt: null,
      })
      .where(inArray(vacancies.id, [legacyVacancyId, expiredVacancyId]));

    await db.insert(savedVacancies).values([
      { userId: driverId, vacancyId: futureVacancyId },
      { userId: driverId, vacancyId: expiredVacancyId },
    ]);
  });

  afterAll(async () => {
    await truncateAll();
  });

  it("marks due vacancies, expires grace-ended vacancies and skips protected states", async () => {
    const result = await processVacancyLifecycle({ now: NOW });
    expect(result).toMatchObject({
      dryRun: false,
      scanned: 4,
      markedReconfirmationRequired: 2,
      expired: 1,
      skipped: 1,
    });

    const rows = await db
      .select({
        id: vacancies.id,
        status: vacancies.status,
        reconfirmDueAt: vacancies.reconfirmDueAt,
      })
      .from(vacancies);
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get(dueVacancyId)?.status).toBe("reconfirmation_required");
    expect(byId.get(lateGraceVacancyId)?.status).toBe("expired");
    expect(byId.get(futureVacancyId)?.status).toBe("published_unverified");
    expect(byId.get(suspendedVacancyId)?.status).toBe("suspended");
    expect(byId.get(suspendedCompanyVacancyId)?.status).toBe("published_verified");
    expect(byId.get(legacyVacancyId)?.status).toBe("reconfirmation_required");
    expect(byId.get(legacyVacancyId)?.reconfirmDueAt).toEqual(NOW);
    expect(byId.get(expiredVacancyId)?.status).toBe("expired");

    const audits = await db
      .select({ action: auditLogs.action, entityId: auditLogs.entityId })
      .from(auditLogs)
      .where(
        inArray(auditLogs.action, [
          "vacancy.reconfirmation_required",
          "vacancy.expired_by_lifecycle",
        ]),
      );
    expect(audits).toHaveLength(3);
    expect(
      audits.filter((row) => row.action === "vacancy.reconfirmation_required"),
    ).toHaveLength(2);
    expect(audits.find((row) => row.entityId === lateGraceVacancyId)?.action).toBe(
      "vacancy.expired_by_lifecycle",
    );
  });

  it("is idempotent when the same sweep runs again", async () => {
    const result = await processVacancyLifecycle({ now: NOW });
    expect(result).toMatchObject({
      markedReconfirmationRequired: 0,
      expired: 0,
    });

    const rows = await db
      .select({ id: vacancies.id, status: vacancies.status })
      .from(vacancies);
    expect(rows.find((row) => row.id === dueVacancyId)?.status).toBe(
      "reconfirmation_required",
    );
    expect(rows.find((row) => row.id === lateGraceVacancyId)?.status).toBe("expired");
    expect(rows.find((row) => row.id === futureVacancyId)?.status).toBe(
      "published_unverified",
    );

    const audits = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(
        inArray(auditLogs.action, [
          "vacancy.reconfirmation_required",
          "vacancy.expired_by_lifecycle",
        ]),
      );
    expect(audits).toHaveLength(3);
  });

  it("expires marked vacancies after the grace period and marks newly due ones", async () => {
    const later = new Date(NOW.getTime() + 8 * DAY);
    const result = await processVacancyLifecycle({ now: later });
    expect(result).toMatchObject({
      markedReconfirmationRequired: 1,
      expired: 2,
    });

    const rows = await db
      .select({ id: vacancies.id, status: vacancies.status })
      .from(vacancies);
    const byId = new Map(rows.map((row) => [row.id, row.status]));
    expect(byId.get(dueVacancyId)).toBe("expired");
    expect(byId.get(legacyVacancyId)).toBe("expired");
    expect(byId.get(futureVacancyId)).toBe("reconfirmation_required");
    expect(byId.get(suspendedCompanyVacancyId)).toBe("published_verified");
    expect(byId.get(suspendedVacancyId)).toBe("suspended");

    const repeat = await processVacancyLifecycle({ now: later });
    expect(repeat.markedReconfirmationRequired).toBe(0);
    expect(repeat.expired).toBe(0);
  });

  it("removes expired vacancies from the driver's saved list", async () => {
    const dashboard = await getDriverDashboard(driverId);
    const savedIds = dashboard.savedJobs.map((row) => row.vacancy.id);
    expect(savedIds).toEqual([futureVacancyId]);
    expect(savedIds).not.toContain(expiredVacancyId);
  });

  it("does not let an incomplete expired vacancy return to public view", () => {
    const incomplete = {
      title: "Incomplete",
      grossPayMin: null,
      licenceRequirements: [],
    };

    const resolution = resolveVacancyTransition({
      currentStatus: "expired",
      transition: "publish",
      draft: incomplete,
      companyVerified: true,
    });

    expect(resolution.ok).toBe(false);
    if (!resolution.ok) expect(resolution.error).toMatch(/Gross salary/);
  });
});

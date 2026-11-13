import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, vacancies } from "@/db/schema";
import { createCompany, createUser, createVacancy } from "../helpers/fixtures";
import {
  startTestServer,
  stopTestServer,
  TEST_HTTP_BASE,
} from "../helpers/http-server";
import { ensureTestDatabase, truncateAll } from "../helpers/test-db";

const SECRET = "lifecycle-http-test-secret";
const DAY = 24 * 60 * 60 * 1000;

describe("HTTP internal vacancy lifecycle route", () => {
  let dueVacancyId: string;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    process.env.VACANCY_LIFECYCLE_SECRET = SECRET;
    await startTestServer();

    const employerId = await createUser("employer", "lifecycle-route@test.local");
    const company = await createCompany({
      ownerUserId: employerId,
      slug: "lifecycle-route-company",
      legalName: "Lifecycle Route Company B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    const vacancy = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "lifecycle-route-vacancy",
      status: "published_verified",
    });
    dueVacancyId = vacancy.id;

    await db
      .update(vacancies)
      .set({
        reconfirmDueAt: new Date(Date.now() - DAY),
        lastConfirmedAt: new Date(Date.now() - 31 * DAY),
      })
      .where(eq(vacancies.id, dueVacancyId));
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
    delete process.env.VACANCY_LIFECYCLE_SECRET;
  });

  it("refuses the route without the configured bearer secret", async () => {
    const missing = await fetch(`${TEST_HTTP_BASE}/api/internal/vacancy-lifecycle`, {
      method: "POST",
    });
    expect(missing.status).toBe(401);

    const wrong = await fetch(`${TEST_HTTP_BASE}/api/internal/vacancy-lifecycle`, {
      method: "POST",
      headers: { authorization: "Bearer not-the-secret" },
    });
    expect(wrong.status).toBe(401);

    const [vacancy] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, dueVacancyId));
    expect(vacancy.status).toBe("published_verified");
  });

  it("runs the lifecycle and is idempotent on retry", async () => {
    const response = await fetch(`${TEST_HTTP_BASE}/api/internal/vacancy-lifecycle`, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      markedReconfirmationRequired: number;
      expired: number;
      dryRun: boolean;
    };
    expect(body.dryRun).toBe(false);
    expect(body.markedReconfirmationRequired).toBe(1);
    expect(body.expired).toBe(0);

    const [vacancy] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, dueVacancyId));
    expect(vacancy.status).toBe("reconfirmation_required");

    const audits = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, "vacancy.reconfirmation_required"),
          eq(auditLogs.entityId, dueVacancyId),
        ),
      );
    expect(audits).toHaveLength(1);

    const retry = await fetch(`${TEST_HTTP_BASE}/api/internal/vacancy-lifecycle`, {
      method: "POST",
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(retry.status).toBe(200);
    const retryBody = (await retry.json()) as {
      markedReconfirmationRequired: number;
      expired: number;
    };
    expect(retryBody.markedReconfirmationRequired).toBe(0);
    expect(retryBody.expired).toBe(0);
  });

  it("does not expose the lifecycle operation over GET", async () => {
    const response = await fetch(`${TEST_HTTP_BASE}/api/internal/vacancy-lifecycle`);
    expect(response.status).toBe(405);
  });
});

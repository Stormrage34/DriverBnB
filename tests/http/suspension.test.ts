import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, companies, vacancies } from "@/db/schema";
import {
  createCompany,
  createSessionCookie,
  createUser,
  createVacancy,
} from "../helpers/fixtures";
import {
  extractForm,
  httpGet,
  httpPostForm,
  startTestServer,
  stopTestServer,
  type CookieJar,
} from "../helpers/http-server";
import { ensureTestDatabase, truncateAll } from "../helpers/test-db";

describe("company suspension and restoration over HTTP", () => {
  let adminCookie: CookieJar;
  let employerCookie: CookieJar;
  let companyId: string;
  let liveId: string;
  let individuallySuspendedId: string;
  let invalidId: string;
  let validId: string;
  let publishForm: FormData;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();

    const admin = await createUser("admin", "admin-suspend@test.local");
    const employer = await createUser("employer", "employer-suspend@test.local");
    const company = await createCompany({
      ownerUserId: employer,
      slug: "suspended-company",
      legalName: "Suspended Company B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    companyId = company.id;

    liveId = (
      await createVacancy({
        companyId,
        createdByUserId: employer,
        slug: "suspend-live",
        status: "published_verified",
      })
    ).id;
    individuallySuspendedId = (
      await createVacancy({
        companyId,
        createdByUserId: employer,
        slug: "suspend-individual",
        status: "suspended",
        suspendedFromStatus: null,
      })
    ).id;
    invalidId = (
      await createVacancy({
        companyId,
        createdByUserId: employer,
        slug: "suspend-invalid",
        status: "published_verified",
        complete: false,
      })
    ).id;
    validId = (
      await createVacancy({
        companyId,
        createdByUserId: employer,
        slug: "suspend-valid",
        status: "published_verified",
      })
    ).id;

    adminCookie = new Map([["df_session", (await createSessionCookie(admin)).split("=")[1]]]);
    employerCookie = new Map([
      ["df_session", (await createSessionCookie(employer)).split("=")[1]],
    ]);

    const employerPage = await httpGet("/employer/vacancies", employerCookie);
    publishForm = extractForm(employerPage.body, "vacancyId", liveId);
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("requires an admin and a valid reason to suspend", async () => {
    const page = await httpGet("/admin/companies", adminCookie);
    expect(page.status).toBe(200);

    const shortReason = extractForm(page.body, "companyId", companyId);
    shortReason.set("outcome", "suspend");
    shortReason.set("reason", "short");
    await httpPostForm("/admin/companies", shortReason, adminCookie);
    let [company] = await db
      .select({ suspendedAt: companies.suspendedAt })
      .from(companies)
      .where(eq(companies.id, companyId));
    expect(company.suspendedAt).toBeNull();

    const employerAttempt = extractForm(page.body, "companyId", companyId);
    employerAttempt.set("outcome", "suspend");
    employerAttempt.set("reason", "Employer tries to suspend the company.");
    await httpPostForm("/admin/companies", employerAttempt, employerCookie);
    [company] = await db
      .select({ suspendedAt: companies.suspendedAt })
      .from(companies)
      .where(eq(companies.id, companyId));
    expect(company.suspendedAt).toBeNull();

    const valid = extractForm(page.body, "companyId", companyId);
    valid.set("outcome", "suspend");
    valid.set("reason", "Registry evidence could not be reconciled; investigation opened.");
    await httpPostForm("/admin/companies", valid, adminCookie);

    const [withReason] = await db
      .select({
        suspendedAt: companies.suspendedAt,
        reason: companies.suspensionReason,
      })
      .from(companies)
      .where(eq(companies.id, companyId));
    expect(withReason.suspendedAt).not.toBeNull();
    expect(withReason.reason).toContain("Registry evidence");
  });

  it("preserves individual vacancy suspensions and blocks employer publishing", async () => {
    const companyVacancies = await db
      .select()
      .from(vacancies)
      .where(eq(vacancies.companyId, companyId));
    const byId = new Map(companyVacancies.map((row) => [row.id, row]));

    expect(byId.get(liveId)?.status).toBe("suspended");
    expect(byId.get(liveId)?.suspendedFromStatus).toBe("published_verified");
    expect(byId.get(individuallySuspendedId)?.status).toBe("suspended");
    expect(byId.get(individuallySuspendedId)?.suspendedFromStatus).toBeNull();
    expect(byId.get(invalidId)?.suspendedFromStatus).toBe("published_verified");

    // Simulate an administrator suspending the already company-suspended vacancy.
    await db
      .update(vacancies)
      .set({ suspendedFromStatus: null, moderationNote: "Individual admin suspension." })
      .where(eq(vacancies.id, liveId));

    await httpPostForm("/employer/vacancies", publishForm, employerCookie);
    const [afterPublish] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, liveId));
    expect(afterPublish.status).toBe("suspended");
  });

  it("hides the company, its vacancies and reviews from every public path", async () => {
    for (const path of [
      "/companies/suspended-company",
      "/companies/suspended-company/reviews",
      "/jobs/suspend-live",
      "/jobs/suspend-invalid",
      "/jobs/suspend-valid",
    ]) {
      const response = await httpGet(path);
      expect(response.status, path).toBe(404);
      expect(response.body, path).not.toContain("Suspended Company");
    }

    const jobs = await httpGet("/jobs");
    expect(jobs.status).toBe(200);
    expect(jobs.body).not.toContain("Suspended Company");

    const companiesPage = await httpGet("/companies");
    expect(companiesPage.status).toBe(200);
    expect(companiesPage.body).not.toContain("Suspended Company");
  });

  it("does not let an employer restore a suspended company", async () => {
    const page = await httpGet("/admin/companies", adminCookie);
    const form = extractForm(page.body, "companyId", companyId);
    form.set("outcome", "restore");
    form.set("reason", "Employer attempts an unauthorized restoration.");
    await httpPostForm("/admin/companies", form, employerCookie);

    const [company] = await db
      .select({ suspendedAt: companies.suspendedAt })
      .from(companies)
      .where(eq(companies.id, companyId));
    expect(company.suspendedAt).not.toBeNull();
  });

  it("restores only company-suspended, publishable vacancies", async () => {
    const page = await httpGet("/admin/companies", adminCookie);
    const form = extractForm(page.body, "companyId", companyId);
    form.set("outcome", "restore");
    form.set("reason", "Investigation completed; controls confirmed and documented.");
    await httpPostForm("/admin/companies", form, adminCookie);

    const [company] = await db
      .select({ suspendedAt: companies.suspendedAt })
      .from(companies)
      .where(eq(companies.id, companyId));
    expect(company.suspendedAt).toBeNull();

    const rows = await db
      .select({ id: vacancies.id, status: vacancies.status, prior: vacancies.suspendedFromStatus })
      .from(vacancies)
      .where(eq(vacancies.companyId, companyId));
    const byId = new Map(rows.map((row) => [row.id, row]));

    // Individual admin suspension and the simulated suspension remain suspended.
    expect(byId.get(individuallySuspendedId)?.status).toBe("suspended");
    expect(byId.get(liveId)?.status).toBe("suspended");
    // Invalid vacancy is not republished.
    expect(byId.get(invalidId)?.status).toBe("draft");
    expect(byId.get(invalidId)?.prior).toBeNull();
    expect(byId.get(validId)?.status).toBe("published_verified");
    expect(byId.get(validId)?.prior).toBeNull();
    expect(rows).toHaveLength(4);

    const restoredVacancy = await httpGet("/jobs/suspend-valid");
    expect(restoredVacancy.status).toBe(200);

    const audit = await db
      .select({ action: auditLogs.action })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, "company"),
          eq(auditLogs.entityId, companyId),
          inArray(auditLogs.action, ["admin.company_suspended", "admin.company_restored"]),
        ),
      );
    expect(audit.map((row) => row.action)).toEqual(
      expect.arrayContaining(["admin.company_suspended", "admin.company_restored"]),
    );
  });
});

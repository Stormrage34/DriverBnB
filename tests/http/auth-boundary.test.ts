import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, vacancies } from "@/db/schema";
import {
  createCompany,
  createExpiredSessionCookie,
  createSessionCookie,
  createUser,
  createVacancy,
  createVerification,
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

describe("HTTP authorization boundary", () => {
  let adminCookie: CookieJar;
  let employerACookie: CookieJar;
  let employerBCookie: CookieJar;
  let driverCookie: CookieJar;
  let expiredCookie: CookieJar;
  let companyAId: string;
  let companyBId: string;
  let vacancyAId: string;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();

    const admin = await createUser("admin", "admin-http@test.local");
    const employerA = await createUser("employer", "employer-a-http@test.local");
    const employerB = await createUser("employer", "employer-b-http@test.local");
    const driver = await createUser("driver", "driver-http@test.local");

    const companyA = await createCompany({
      ownerUserId: employerA,
      slug: "http-company-a",
      legalName: "HTTP Company A B.V.",
      verificationStatus: "submitted",
      verificationVersion: 0,
    });
    const companyB = await createCompany({
      ownerUserId: employerB,
      slug: "http-company-b",
      legalName: "HTTP Company B B.V.",
      verificationStatus: "submitted",
      verificationVersion: 0,
    });
    companyAId = companyA.id;
    companyBId = companyB.id;

    const vacancyA = await createVacancy({
      companyId: companyA.id,
      createdByUserId: employerA,
      slug: "http-vacancy-a",
      status: "published_unverified",
    });
    vacancyAId = vacancyA.id;
    await createVerification({
      companyId: companyA.id,
      status: "submitted",
      withSnapshot: true,
      evidenceNotes: "HTTP EVIDENCE: registry extract available.",
    });
    await createVerification({
      companyId: companyB.id,
      status: "submitted",
      withSnapshot: true,
      evidenceNotes: "HTTP EVIDENCE B.",
    });

    adminCookie = new Map([["df_session", (await createSessionCookie(admin)).split("=")[1]]]);
    employerACookie = new Map([
      ["df_session", (await createSessionCookie(employerA)).split("=")[1]],
    ]);
    employerBCookie = new Map([
      ["df_session", (await createSessionCookie(employerB)).split("=")[1]],
    ]);
    driverCookie = new Map([["df_session", (await createSessionCookie(driver)).split("=")[1]]]);
    expiredCookie = new Map([
      ["df_session", (await createExpiredSessionCookie(admin)).split("=")[1]],
    ]);
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("redirects unauthenticated and wrong-role users away from protected pages", async () => {
    const anonymous = await httpGet("/employer");
    expect(anonymous.status).toBe(307);
    expect(anonymous.location).toContain("/login");

    const driver = await httpGet("/employer", driverCookie);
    expect(driver.status).toBe(307);
    expect(driver.location).toBe("/dashboard");

    const employer = await httpGet("/admin", employerACookie);
    expect(employer.status).toBe(307);
    expect(employer.location).toBe("/employer");

    const expired = await httpGet("/employer", expiredCookie);
    expect(expired.status).toBe(307);
    expect(expired.location).toContain("/login");

    const admin = await httpGet("/admin", adminCookie);
    expect(admin.status).toBe(200);
    expect(admin.body).toContain("Moderation overview");
  });

  it("does not expose the audit-bearing admin page to non-admins", async () => {
    const employer = await httpGet("/admin", employerACookie);
    expect(employer.status).toBe(307);
    expect(employer.body).not.toContain("Audit log");
    const admin = await httpGet("/admin", adminCookie);
    expect(admin.status).toBe(200);
    expect(admin.body.toLowerCase()).toContain("audit");
  });

  it("rejects verification decisions from an employer, driver and anonymous caller", async () => {
    const page = await httpGet("/admin/verifications", adminCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "companyId", companyAId);
    form.set("outcome", "identity_checked");
    form.set("notes", "Identity checked through the HTTP authorization test.");

    for (const jar of [employerACookie, driverCookie, new Map<string, string>()]) {
      const response = await httpPostForm("/admin/verifications", form, jar);
      expect([200, 303, 307]).toContain(response.status);
    }

    const [afterAttempts] = await db
      .select({ status: companies.verificationStatus, version: companies.verificationVersion })
      .from(companies)
      .where(eq(companies.id, companyAId));
    expect(afterAttempts).toEqual({ status: "submitted", version: 0 });

    const adminResponse = await httpPostForm("/admin/verifications", form, adminCookie);
    expect([200, 303]).toContain(adminResponse.status);
    const [afterAdmin] = await db
      .select({ status: companies.verificationStatus, version: companies.verificationVersion })
      .from(companies)
      .where(eq(companies.id, companyAId));
    expect(afterAdmin).toEqual({ status: "identity_checked", version: 1 });
  });

  it("rejects cross-company vacancy mutation", async () => {
    const aPage = await httpGet("/employer/vacancies", employerACookie);
    expect(aPage.status).toBe(200);
    const form = extractForm(aPage.body, "vacancyId", vacancyAId);
    form.set("vacancyId", vacancyAId);

    const response = await httpPostForm("/employer/vacancies", form, employerBCookie);
    expect([200, 303, 307]).toContain(response.status);

    const [vacancy] = await db
      .select({ status: vacancies.status, companyId: vacancies.companyId })
      .from(vacancies)
      .where(eq(vacancies.id, vacancyAId))
      .limit(1);
    expect(vacancy?.companyId).toBe(companyAId);
    expect(vacancy?.status).toBe("published_unverified");
    expect(companyBId).not.toBe(companyAId);
  });

  it("does not let a non-admin read the verification evidence queue", async () => {
    const employer = await httpGet("/admin/verifications", employerACookie);
    expect(employer.status).toBe(307);
    expect(employer.body).not.toContain("HTTP EVIDENCE");
  });
});

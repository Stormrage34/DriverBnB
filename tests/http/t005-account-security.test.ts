import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  companies,
  companyVerifications,
  driverReviews,
  enquiries,
  sessions,
  userTokens,
  users,
  vacancies,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { operatorVerifyUserEmail } from "@/lib/operator-verification";
import { issueUserToken } from "@/lib/user-tokens";
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

function jarFromCookie(cookie: string): CookieJar {
  const [name, value] = cookie.split("=");
  return new Map([[name, value]]);
}

describe("T-005 email verification, reset and enforcement", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("registers an unverified account, issues one hashed token and redirects to the confirmation page", async () => {
    const page = await httpGet("/register?role=driver");
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "displayName");
    form.set("displayName", "New Unverified Driver");
    form.set("email", "register-unverified@test.local");
    form.set("password", "CorrectHorseBattery1");
    form.set("confirmPassword", "CorrectHorseBattery1");
    form.set("country", "BG");
    form.set("acceptTerms", "on");

    const response = await httpPostForm("/register", form);
    expect(response.status).toBe(303);
    expect(response.location).toBe("/verify-email?sent=1");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, "register-unverified@test.local"));
    expect(user.emailVerifiedAt).toBeNull();

    const tokens = await db
      .select()
      .from(userTokens)
      .where(and(eq(userTokens.userId, user.id), isNull(userTokens.consumedAt)));
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const audits = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, user.id));
    const sent = audits.find((row) => row.action === "auth.verification_sent");
    expect(sent?.metadata).toMatchObject({ delivered: true, provider: "test" });

    const duplicateForm = extractForm(page.body, "displayName");
    duplicateForm.set("displayName", "Duplicate Attempt");
    duplicateForm.set("email", "register-unverified@test.local");
    duplicateForm.set("password", "CorrectHorseBattery1");
    duplicateForm.set("confirmPassword", "CorrectHorseBattery1");
    duplicateForm.set("country", "BG");
    duplicateForm.set("acceptTerms", "on");
    const duplicate = await httpPostForm("/register", duplicateForm);
    expect(duplicate.status).toBe(303);
    expect(duplicate.location).toBe("/verify-email?sent=1");
    expect(
      await db.select().from(users).where(eq(users.email, "register-unverified@test.local")),
    ).toHaveLength(1);
  });

  it("blocks an unverified driver from sending an enquiry, then allows it after token verification", async () => {
    const employerId = await createUser("employer", "gate-employer@test.local");
    const driverId = await createUser("driver", "gate-driver@test.local", {
      emailVerifiedAt: null,
    });
    const company = await createCompany({
      ownerUserId: employerId,
      slug: "gate-company",
      legalName: "Gate Company B.V.",
      verificationStatus: "unverified",
    });
    const vacancy = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "gate-vacancy",
      status: "published_unverified",
    });
    const driverCookie = jarFromCookie(await createSessionCookie(driverId));

    const page = await httpGet("/jobs/gate-vacancy", driverCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "vacancyId", vacancy.id);
    form.set(
      "message",
      "I am interested in this role and would like to ask about the rotation and pay.",
    );
    const blocked = await httpPostForm("/jobs/gate-vacancy", form, driverCookie);
    expect([200, 303]).toContain(blocked.status);
    expect(blocked.body).toContain("Confirm your email");
    expect(
      await db.select().from(enquiries).where(eq(enquiries.driverUserId, driverId)),
    ).toHaveLength(0);

    const issued = await issueUserToken(driverId, "email_verification");
    const verifyPage = await httpGet(`/verify-email?token=${encodeURIComponent(issued.token)}`, driverCookie);
    expect(verifyPage.status).toBe(200);
    const verifyForm = extractForm(verifyPage.body, "token", issued.token);
    const verified = await httpPostForm("/verify-email", verifyForm, driverCookie);
    expect([200, 307]).toContain(verified.status);
    if (verified.status === 307) expect(verified.location).toBe("/dashboard");

    const [stored] = await db.select().from(users).where(eq(users.id, driverId));
    expect(stored.emailVerifiedAt).toBeInstanceOf(Date);

    const allowed = await httpPostForm("/jobs/gate-vacancy", form, driverCookie);
    expect([200, 303]).toContain(allowed.status);
    expect(
      await db.select().from(enquiries).where(eq(enquiries.driverUserId, driverId)),
    ).toHaveLength(1);
  });

  it("blocks an unverified driver from submitting a review", async () => {
    const employerId = await createUser("employer", "gate-review-employer@test.local");
    const driverId = await createUser("driver", "gate-review-driver@test.local", {
      emailVerifiedAt: null,
    });
    const company = await createCompany({
      ownerUserId: employerId,
      slug: "gate-review-company",
      legalName: "Gate Review Company B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    const driverCookie = jarFromCookie(await createSessionCookie(driverId));

    const page = await httpGet("/dashboard/reviews/new", driverCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "companyId");
    form.set("companyId", company.id);
    form.set("jobTitle", "C+E driver");
    form.set("employmentStart", "2025-01");
    form.set("overallRating", "4");
    form.set("title", "A review attempt before confirming email");
    form.set(
      "body",
      "This review must not be stored while the driver account is unverified. It exists only to exercise the server-side verification gate.",
    );
    form.set("eligibilityAttested", "on");
    form.set("publicationConsent", "on");

    const response = await httpPostForm("/dashboard/reviews/new", form, driverCookie);
    expect([200, 303]).toContain(response.status);
    expect(response.body).toContain("Confirm your email");
    expect(
      await db.select().from(driverReviews).where(eq(driverReviews.driverUserId, driverId)),
    ).toHaveLength(0);
  });

  it("blocks an unverified employer from publishing and submitting verification evidence", async () => {
    const employerId = await createUser("employer", "gate-employer-publish@test.local", {
      emailVerifiedAt: null,
    });
    const company = await createCompany({
      ownerUserId: employerId,
      slug: "gate-employer-company",
      legalName: "Gate Employer Company B.V.",
      verificationStatus: "unverified",
    });
    const vacancy = await createVacancy({
      companyId: company.id,
      createdByUserId: employerId,
      slug: "gate-draft-vacancy",
      status: "draft",
    });
    const employerCookie = jarFromCookie(await createSessionCookie(employerId));

    const list = await httpGet("/employer/vacancies", employerCookie);
    expect(list.status).toBe(200);
    const publishForm = extractForm(list.body, "vacancyId", vacancy.id);
    publishForm.set("vacancyId", vacancy.id);
    const blockedPublish = await httpPostForm("/employer/vacancies", publishForm, employerCookie);
    expect([200, 303, 307]).toContain(blockedPublish.status);
    expect(blockedPublish.location ?? "").toContain("/verify-email?required=1");

    const [stillDraft] = await db.select().from(vacancies).where(eq(vacancies.id, vacancy.id));
    expect(stillDraft.status).toBe("draft");

    const verificationPage = await httpGet("/employer/verification", employerCookie);
    expect(verificationPage.status).toBe(200);
    const verificationForm = extractForm(verificationPage.body, "registrationNumber");
    verificationForm.set("registrationNumber", "NL-12345678");
    verificationForm.set("registeredAddress", "Havenweg 1, Rotterdam");
    verificationForm.set("contactPerson", "Test Contact");
    verificationForm.set("businessEmail", "contact@example.test");
    verificationForm.set("operatesOwnFleet", "yes");
    verificationForm.set("recruitsDirectly", "yes");
    verificationForm.set("contractingEntity", "Gate Employer Company B.V.");
    verificationForm.set(
      "evidenceNotes",
      "Chamber of commerce extract available for operator review.",
    );
    verificationForm.set("confirmTruth", "on");
    const blockedEvidence = await httpPostForm(
      "/employer/verification",
      verificationForm,
      employerCookie,
    );
    expect([200, 303]).toContain(blockedEvidence.status);
    expect(blockedEvidence.body).toContain("Confirm your email");

    const [companyAfter] = await db.select().from(companies).where(eq(companies.id, company.id));
    expect(companyAfter.verificationStatus).toBe("unverified");
    expect(
      await db
        .select()
        .from(companyVerifications)
        .where(eq(companyVerifications.companyId, company.id)),
    ).toHaveLength(0);

    const verified = await operatorVerifyUserEmail({
      email: "gate-employer-publish@test.local",
      operator: "Founder",
      reason: "Invite-only pilot; mailbox control confirmed out of band.",
      mode: "pilot",
    });
    expect(verified.ok).toBe(true);

    const allowedPublish = await httpPostForm("/employer/vacancies", publishForm, employerCookie);
    expect([200, 303, 307]).toContain(allowedPublish.status);
    const [published] = await db.select().from(vacancies).where(eq(vacancies.id, vacancy.id));
    expect(published.status).toMatch(/published|confirmed/);
  });

  it("resets a password, revokes every session and rejects a second use", async () => {
    const passwordHash = await hashPassword("OldPassword123");
    const userId = await createUser("driver", "reset-flow@test.local", {
      passwordHash,
      emailVerifiedAt: new Date(),
    });
    const primaryCookie = jarFromCookie(await createSessionCookie(userId));
    const secondaryCookie = jarFromCookie(await createSessionCookie(userId));

    const issued = await issueUserToken(userId, "password_reset");
    const page = await httpGet(`/reset-password?token=${encodeURIComponent(issued.token)}`, primaryCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "token", issued.token);
    form.set("password", "BrandNewPassword1");
    form.set("confirmPassword", "BrandNewPassword1");

    const response = await httpPostForm("/reset-password", form, primaryCookie);
    expect(response.status).toBe(303);
    expect(response.location).toBe("/login?reset=1");

    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toHaveLength(0);
    expect(await httpGet("/dashboard", primaryCookie)).toMatchObject({ status: 307 });
    expect(await httpGet("/dashboard", secondaryCookie)).toMatchObject({ status: 307 });

    const [stored] = await db.select().from(users).where(eq(users.id, userId));
    expect(await verifyPassword("BrandNewPassword1", stored.passwordHash)).toBe(true);
    expect(await verifyPassword("OldPassword123", stored.passwordHash)).toBe(false);

    const second = await httpPostForm("/reset-password", form, primaryCookie);
    expect(second.status).toBe(200);
    expect(second.body).toContain("invalid or has expired");
  });

  it("blocks an unverified admin from the admin area and allows the one-time bootstrap", async () => {
    const adminId = await createUser("admin", "gate-admin@test.local", {
      emailVerifiedAt: null,
    });
    const adminCookie = jarFromCookie(await createSessionCookie(adminId));

    const blocked = await httpGet("/admin", adminCookie);
    expect(blocked.status).toBe(307);
    expect(blocked.location).toBe("/verify-email?required=1");

    const bootstrap = await operatorVerifyUserEmail({
      email: "gate-admin@test.local",
      operator: "Founder",
      reason: "Mailbox control confirmed by out-of-band phone call.",
      mode: "admin_bootstrap",
    });
    expect(bootstrap.ok).toBe(true);

    const allowed = await httpGet("/admin", adminCookie);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toContain("Moderation overview");
  });

  it("sends identical generic responses for existing and unknown reset addresses", async () => {
    const existingId = await createUser("driver", "reset-generic@test.local", {
      emailVerifiedAt: new Date(),
    });

    const page = await httpGet("/forgot-password");
    const form = extractForm(page.body, "email");
    form.set("email", "reset-generic@test.local");
    const existing = await httpPostForm("/forgot-password", form, new Map());
    expect(existing.status).toBe(200);

    const unknownForm = extractForm(page.body, "email");
    unknownForm.set("email", "unknown-reset@test.local");
    const unknown = await httpPostForm("/forgot-password", unknownForm, new Map());
    expect(unknown.status).toBe(200);

    expect(existing.body).toContain("If that address belongs to an account");
    expect(unknown.body).toContain("If that address belongs to an account");
    expect(unknown.body).not.toContain("No account");
    expect(unknown.body).not.toContain("Account not found");
    expect(
      await db
        .select()
        .from(userTokens)
        .where(and(eq(userTokens.userId, existingId), eq(userTokens.purpose, "password_reset"))),
    ).toHaveLength(1);
  });

  it("serves CSP and security headers without enabling HSTS by default", async () => {
    const response = await fetch(`${process.env.TEST_HTTP_BASE ?? "http://127.0.0.1:3211"}/login`);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("strict-transport-security")).toBeNull();
  });
});

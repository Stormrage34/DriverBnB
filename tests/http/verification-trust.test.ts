import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, companyVerifications } from "@/db/schema";
import {
  createCompany,
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

const MODERATOR_NOTE = "MODERATOR-ONLY: registry extract and address checked.";
const EMPLOYER_EVIDENCE = "EMPLOYER EVIDENCE: KvK extract can be provided.";

describe("verification trust, provenance and identity confirmation over HTTP", () => {
  let adminCookie: CookieJar;
  let missingCookie: CookieJar;
  let systemCookie: CookieJar;
  let evidenceCookie: CookieJar;
  let profileCookie: CookieJar;
  let verifyCookie: CookieJar;
  let missingId: string;
  let systemId: string;
  let evidenceId: string;
  let legacyId: string;
  let profileId: string;
  let verifyId: string;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();

    const admin = await createUser("admin", "admin-verify-http@test.local");
    const missingOwner = await createUser("employer", "missing-owner@test.local");
    const systemOwner = await createUser("employer", "system-owner@test.local");
    const evidenceOwner = await createUser("employer", "evidence-owner@test.local");
    const legacyOwner = await createUser("employer", "legacy-owner@test.local");
    const profileOwner = await createUser("employer", "profile-owner@test.local");
    const verifyOwner = await createUser("employer", "verify-owner@test.local");

    const missing = await createCompany({
      ownerUserId: missingOwner,
      slug: "missing-snapshot",
      legalName: "Missing Snapshot B.V.",
      verificationStatus: "submitted",
      verificationVersion: 0,
    });
    missingId = missing.id;
    await createVerification({
      companyId: missing.id,
      status: "submitted",
      withSnapshot: false,
      evidenceNotes: "Legacy evidence text without a structured identity.",
    });

    const system = await createCompany({
      ownerUserId: systemOwner,
      slug: "system-record",
      legalName: "System Record B.V.",
      verificationStatus: "submitted",
      verificationVersion: 0,
    });
    systemId = system.id;
    await createVerification({
      companyId: system.id,
      status: "submitted",
      withSnapshot: true,
      source: "company_profile_update",
      evidenceNotes: "SYSTEM RECORD TEXT",
      decisionNotes: MODERATOR_NOTE,
    });

    const evidence = await createCompany({
      ownerUserId: evidenceOwner,
      slug: "employer-evidence",
      legalName: "Employer Evidence B.V.",
      verificationStatus: "submitted",
      verificationVersion: 0,
    });
    evidenceId = evidence.id;
    await createVerification({
      companyId: evidence.id,
      status: "submitted",
      withSnapshot: true,
      source: "employer_submission",
      evidenceNotes: EMPLOYER_EVIDENCE,
      decisionNotes: MODERATOR_NOTE,
    });

    const legacy = await createCompany({
      ownerUserId: legacyOwner,
      slug: "legacy-verified",
      legalName: "Legacy Verified B.V.",
      verificationStatus: "verified",
      verificationVersion: 0,
    });
    legacyId = legacy.id;
    await createVerification({
      companyId: legacy.id,
      status: "verified",
      withSnapshot: false,
      evidenceNotes: "Old record.",
    });
    await createVacancy({
      companyId: legacy.id,
      createdByUserId: legacyOwner,
      slug: "legacy-vacancy",
      status: "published_verified",
    });

    const profile = await createCompany({
      ownerUserId: profileOwner,
      slug: "profile-confirm",
      legalName: "Profile Confirm B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    profileId = profile.id;

    const verify = await createCompany({
      ownerUserId: verifyOwner,
      slug: "verify-confirm",
      legalName: "Verify Confirm B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    verifyId = verify.id;
    await createVerification({
      companyId: verify.id,
      status: "verified",
      withSnapshot: true,
      source: "employer_submission",
      evidenceNotes: "Original evidence for the confirmation test.",
    });

    adminCookie = new Map([["df_session", (await createSessionCookie(admin)).split("=")[1]]]);
    missingCookie = new Map([["df_session", (await createSessionCookie(missingOwner)).split("=")[1]]]);
    systemCookie = new Map([["df_session", (await createSessionCookie(systemOwner)).split("=")[1]]]);
    evidenceCookie = new Map([["df_session", (await createSessionCookie(evidenceOwner)).split("=")[1]]]);
    profileCookie = new Map([["df_session", (await createSessionCookie(profileOwner)).split("=")[1]]]);
    verifyCookie = new Map([["df_session", (await createSessionCookie(verifyOwner)).split("=")[1]]]);
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("blocks a legacy record without an identity snapshot and later advances after fresh evidence", async () => {
    const page = await httpGet("/admin/verifications", adminCookie);
    expect(page.status).toBe(200);
    const beforeRows = await db
      .select()
      .from(companyVerifications)
      .where(eq(companyVerifications.companyId, missingId));
    const form = extractForm(page.body, "companyId", missingId);
    form.set("outcome", "identity_checked");
    form.set("notes", "Attempting to advance without a snapshot must be blocked.");
    await httpPostForm("/admin/verifications", form, adminCookie);

    let [company] = await db
      .select({ status: companies.verificationStatus, version: companies.verificationVersion })
      .from(companies)
      .where(eq(companies.id, missingId));
    expect(company).toEqual({ status: "submitted", version: 0 });

    const afterRows = await db
      .select()
      .from(companyVerifications)
      .where(eq(companyVerifications.companyId, missingId));
    expect(afterRows).toHaveLength(beforeRows.length);
    expect(afterRows[0]?.submittedData).toEqual(beforeRows[0]?.submittedData);

    await createVerification({
      companyId: missingId,
      status: "submitted",
      withSnapshot: true,
      source: "employer_submission",
      evidenceNotes: "Fresh evidence with a structured identity snapshot.",
    });

    const refreshed = await httpGet("/admin/verifications", adminCookie);
    const freshForm = extractForm(refreshed.body, "companyId", missingId);
    freshForm.set("outcome", "identity_checked");
    freshForm.set("notes", "Fresh snapshot reviewed and matched against the registry.");
    await httpPostForm("/admin/verifications", freshForm, adminCookie);

    [company] = await db
      .select({ status: companies.verificationStatus, version: companies.verificationVersion })
      .from(companies)
      .where(eq(companies.id, missingId));
    expect(company).toEqual({ status: "identity_checked", version: 1 });
  });

  it("does not expose a legacy verified badge or let it pass verified filters", async () => {
    const companyPage = await httpGet("/companies/legacy-verified");
    expect(companyPage.status).toBe(200);
    expect(companyPage.body).toContain("Verification requires review");
    expect(companyPage.body).not.toContain("Verified employer");

    const jobs = await httpGet("/jobs?verified=1");
    expect(jobs.status).toBe(200);
    expect(jobs.body).not.toContain("Legacy Verified B.V.");
  });

  it("labels system records separately and never shows moderator notes to employers", async () => {
    const systemPage = await httpGet("/employer/verification", systemCookie);
    expect(systemPage.status).toBe(200);
    expect(systemPage.body).toContain("Profile-change record (system-generated)");
    expect(systemPage.body).not.toContain("Latest employer-submitted evidence");
    expect(systemPage.body).not.toContain(MODERATOR_NOTE);

    const evidencePage = await httpGet("/employer/verification", evidenceCookie);
    expect(evidencePage.status).toBe(200);
    expect(evidencePage.body).toContain("Latest employer-submitted evidence");
    expect(evidencePage.body).not.toContain(MODERATOR_NOTE);
  });

  it("shows moderator notes and employer evidence only in the admin queue", async () => {
    const adminPage = await httpGet("/admin/verifications", adminCookie);
    expect(adminPage.status).toBe(200);
    expect(adminPage.body).toContain("Employer-submitted evidence");
    expect(adminPage.body).toContain(EMPLOYER_EVIDENCE);
    expect(adminPage.body).toContain(MODERATOR_NOTE);

    const publicPage = await httpGet("/companies/employer-evidence");
    expect(publicPage.status).toBe(200);
    expect(publicPage.body).not.toContain(EMPLOYER_EVIDENCE);
    expect(publicPage.body).not.toContain(MODERATOR_NOTE);

    const employerPage = await httpGet("/employer/verification", evidenceCookie);
    expect(employerPage.body).not.toContain(MODERATOR_NOTE);
  });

  it("does not invalidate verification for an operational-only profile change", async () => {
    const page = await httpGet("/employer/company", profileCookie);
    const form = extractForm(page.body, "legalName");
    form.set("website", "https://profile-confirm.example");
    form.delete("confirmIdentityChange");
    await httpPostForm("/employer/company", form, profileCookie);

    const [company] = await db
      .select({ status: companies.verificationStatus, version: companies.verificationVersion })
      .from(companies)
      .where(eq(companies.id, profileId));
    expect(company).toEqual({ status: "verified", version: 1 });
  });

  it("requires explicit confirmation for a legal-identity change in the profile editor", async () => {
    const page = await httpGet("/employer/company", profileCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "legalName");
    form.set("legalName", "Profile Confirm Renamed B.V.");
    form.delete("confirmIdentityChange");
    await httpPostForm("/employer/company", form, profileCookie);

    let [company] = await db
      .select({ legalName: companies.legalName, status: companies.verificationStatus })
      .from(companies)
      .where(eq(companies.id, profileId));
    expect(company).toEqual({ legalName: "Profile Confirm B.V.", status: "verified" });

    form.set("confirmIdentityChange", "on");
    await httpPostForm("/employer/company", form, profileCookie);
    [company] = await db
      .select({ legalName: companies.legalName, status: companies.verificationStatus })
      .from(companies)
      .where(eq(companies.id, profileId));
    expect(company).toEqual({ legalName: "Profile Confirm Renamed B.V.", status: "unverified" });
  });

  it("requires explicit confirmation for an identity change in the verification form", async () => {
    const page = await httpGet("/employer/verification", verifyCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "registrationNumber");
    form.set("confirmTruth", "on");
    form.set("registrationNumber", "99999999");
    form.set("contactPerson", "Test Contact");
    form.set("evidenceNotes", "Updated registry extract for the confirmation test.");
    form.delete("confirmIdentityChange");
    await httpPostForm("/employer/verification", form, verifyCookie);

    let [company] = await db
      .select({ registrationNumber: companies.registrationNumber, status: companies.verificationStatus })
      .from(companies)
      .where(eq(companies.id, verifyId));
    expect(company).toEqual({ registrationNumber: "12345678", status: "verified" });

    form.set("confirmIdentityChange", "on");
    await httpPostForm("/employer/verification", form, verifyCookie);
    [company] = await db
      .select({ registrationNumber: companies.registrationNumber, status: companies.verificationStatus })
      .from(companies)
      .where(eq(companies.id, verifyId));
    expect(company).toEqual({ registrationNumber: "99999999", status: "submitted" });
  });
});

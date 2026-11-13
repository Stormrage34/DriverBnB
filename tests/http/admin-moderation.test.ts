import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  contentReports,
  driverReviews,
  sessions,
  users,
  vacancies,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getCompanyReviews } from "@/lib/queries";
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

const NOTES = "Reviewed the advert, the evidence and the recorded state before acting.";

function jarFrom(cookie: string): CookieJar {
  return new Map([["df_session", cookie.split("=")[1]]]);
}

async function latestAudit(action: string, entityId: string) {
  const [row] = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.action, action), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);
  return row ?? null;
}

async function loginAs(email: string, password: string, jar: CookieJar = new Map()) {
  const page = await httpGet("/login", jar);
  const form = extractForm(page.body, "email");
  form.set("email", email);
  form.set("password", password);
  return httpPostForm("/login", form, jar);
}

describe("HTTP admin surfaces and moderation transitions", () => {
  let adminCookie: CookieJar;
  let employerCookie: CookieJar;
  let driverCookie: CookieJar;
  let victimCookie: CookieJar;
  let adminId: string;
  let employerId: string;
  let driverId: string;
  let victimId: string;
  let companyId: string;
  let suspendedCompanyId: string;
  let liveVacancyId: string;
  let otherLiveVacancyId: string;
  let companySuspendedVacancyId: string;
  let incompleteVacancyId: string;
  let legacySuspendedVacancyId: string;
  let pendingReviewId: string;
  let publishedReviewId: string;
  let rejectedReviewId: string;
  let legacyUnderReviewId: string;
  let ambiguousUnderReviewId: string;
  let convertibleReviewId: string;
  let reportId: string;
  const victimEmail = "victim-http@test.local";
  const victimPassword = "Correct-Horse-9";

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();

    adminId = await createUser("admin", "admin-http-t003@test.local");
    employerId = await createUser("employer", "employer-http-t003@test.local");
    driverId = await createUser("driver", "driver-http-t003@test.local");
    victimId = await createUser("driver", victimEmail);
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(victimPassword) })
      .where(eq(users.id, victimId));

    const company = await createCompany({
      ownerUserId: employerId,
      slug: "t003-live-company",
      legalName: "T003 Live Company B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    companyId = company.id;

    const suspendedCompany = await createCompany({
      ownerUserId: employerId,
      slug: "t003-suspended-company",
      legalName: "T003 Suspended Company B.V.",
      suspendedAt: new Date(),
      suspensionReason: "Suspended for the T-003 HTTP test.",
    });
    suspendedCompanyId = suspendedCompany.id;

    const live = await createVacancy({
      companyId,
      createdByUserId: employerId,
      slug: "t003-live-vacancy",
      status: "published_verified",
    });
    liveVacancyId = live.id;

    const otherLive = await createVacancy({
      companyId,
      createdByUserId: employerId,
      slug: "t003-other-live-vacancy",
      status: "published_verified",
    });
    otherLiveVacancyId = otherLive.id;

    const companySuspended = await createVacancy({
      companyId: suspendedCompanyId,
      createdByUserId: employerId,
      slug: "t003-company-suspended-vacancy",
      status: "suspended",
      suspendedFromStatus: "published_unverified",
    });
    companySuspendedVacancyId = companySuspended.id;

    const incomplete = await createVacancy({
      companyId,
      createdByUserId: employerId,
      slug: "t003-incomplete-vacancy",
      status: "suspended",
      suspendedFromStatus: "published_verified",
      complete: false,
    });
    incompleteVacancyId = incomplete.id;

    const legacySuspended = await createVacancy({
      companyId,
      createdByUserId: employerId,
      slug: "t003-legacy-suspended-vacancy",
      status: "suspended",
    });
    legacySuspendedVacancyId = legacySuspended.id;

    const reviews = await db
      .insert(driverReviews)
      .values([
        {
          companyId,
          driverUserId: driverId,
          employmentStart: "2024-01-01",
          overallRating: 4,
          title: "Pending review for moderation",
          body: "A pending review used by the T-003 HTTP test.",
          status: "pending",
        },
        {
          companyId,
          driverUserId: driverId,
          employmentStart: "2024-02-01",
          overallRating: 3,
          title: "Published review for moderation",
          body: "A published review used by the T-003 HTTP test.",
          status: "published",
          publishedAt: new Date("2026-01-05T10:00:00Z"),
          moderatedAt: new Date("2026-01-06T10:00:00Z"),
        },
        {
          companyId,
          driverUserId: driverId,
          employmentStart: "2024-03-01",
          overallRating: 2,
          title: "Rejected review for moderation",
          body: "A rejected review used by the T-003 HTTP test.",
          status: "rejected",
          moderatedAt: new Date("2026-01-06T10:00:00Z"),
        },
        {
          companyId,
          driverUserId: driverId,
          employmentStart: "2024-04-01",
          overallRating: 5,
          title: "Legacy under review row",
          body: "An ambiguous legacy under-review row used by the T-003 HTTP test.",
          status: "under_review",
        },
        {
          companyId,
          driverUserId: driverId,
          employmentStart: "2024-05-01",
          overallRating: 4,
          title: "Moderated but unproven under-review row",
          body: "An under-review row with moderatedAt set but no recorded publication history.",
          status: "under_review",
          moderatedAt: new Date("2026-01-07T10:00:00Z"),
        },
        {
          companyId,
          driverUserId: driverId,
          employmentStart: "2024-06-01",
          overallRating: 4,
          title: "Convertible review for evidence flow",
          body: "A pending review used to prove the recorded pending-to-under-review flow.",
          status: "pending",
        },
      ])
      .returning({ id: driverReviews.id, status: driverReviews.status });
    pendingReviewId = reviews[0].id;
    publishedReviewId = reviews[1].id;
    rejectedReviewId = reviews[2].id;
    legacyUnderReviewId = reviews[3].id;
    ambiguousUnderReviewId = reviews[4].id;
    convertibleReviewId = reviews[5].id;

    const [report] = await db
      .insert(contentReports)
      .values({
        reporterUserId: driverId,
        targetType: "review",
        targetId: publishedReviewId,
        reason: "Test report",
        details: "Report used by the T-003 HTTP test.",
        status: "open",
      })
      .returning({ id: contentReports.id });
    reportId = report.id;

    adminCookie = jarFrom(await createSessionCookie(adminId));
    employerCookie = jarFrom(await createSessionCookie(employerId));
    driverCookie = jarFrom(await createSessionCookie(driverId));
    victimCookie = jarFrom(await createSessionCookie(victimId));
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("guards all five admin pages by role", async () => {
    const routes = [
      ["/admin/vacancies", "Vacancies"],
      ["/admin/reviews", "Reviews"],
      ["/admin/reports", "Reports"],
      ["/admin/users", "Users"],
      ["/admin/audit", "Audit log"],
    ] as const;

    for (const [route, marker] of routes) {
      const anonymous = await httpGet(route);
      expect(anonymous.status, `${route} anonymous`).toBe(307);
      expect(anonymous.location).toContain("/login");

      const driver = await httpGet(route, driverCookie);
      expect(driver.status, `${route} driver`).toBe(307);
      expect(driver.location).toBe("/dashboard");

      const employer = await httpGet(route, employerCookie);
      expect(employer.status, `${route} employer`).toBe(307);
      expect(employer.location).toBe("/employer");

      const admin = await httpGet(route, adminCookie);
      expect(admin.status, `${route} admin`).toBe(200);
      expect(admin.body).toContain(marker);
    }
  });

  it("suspends a live vacancy with an audited previous state and restores it", async () => {
    const page = await httpGet("/admin/vacancies?status=published_verified", adminCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "vacancyId", liveVacancyId);
    form.set("outcome", "suspend");
    form.set("notes", NOTES);

    const suspended = await httpPostForm("/admin/vacancies", form, adminCookie);
    expect([200, 303]).toContain(suspended.status);

    const [afterSuspend] = await db
      .select({ status: vacancies.status, prior: vacancies.suspendedFromStatus })
      .from(vacancies)
      .where(eq(vacancies.id, liveVacancyId));
    expect(afterSuspend.status).toBe("suspended");
    expect(afterSuspend.prior).toBeNull();

    const suspendAudit = await latestAudit("admin.vacancy_suspend", liveVacancyId);
    expect(suspendAudit?.actorUserId).toBe(adminId);
    expect(suspendAudit?.metadata).toMatchObject({
      previousStatus: "published_verified",
      nextStatus: "suspended",
    });

    const suspendedPage = await httpGet("/admin/vacancies?status=suspended", adminCookie);
    const restoreForm = extractForm(suspendedPage.body, "vacancyId", liveVacancyId);
    restoreForm.set("outcome", "restore");
    restoreForm.set("notes", NOTES);

    const restored = await httpPostForm("/admin/vacancies", restoreForm, adminCookie);
    expect([200, 303]).toContain(restored.status);

    const [afterRestore] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, liveVacancyId));
    expect(afterRestore.status).toBe("published_verified");

    const restoreAudit = await latestAudit("admin.vacancy_restore", liveVacancyId);
    expect(restoreAudit?.metadata).toMatchObject({
      previousStatus: "suspended",
      nextStatus: "published_verified",
      restoredFromStatus: "published_verified",
      resolvedFrom: "individual_suspension",
    });
  });

  it("refuses to restore a vacancy while its company is suspended", async () => {
    const page = await httpGet("/admin/vacancies?status=suspended", adminCookie);
    const form = extractForm(page.body, "vacancyId", companySuspendedVacancyId);
    form.set("outcome", "restore");
    form.set("notes", NOTES);

    const response = await httpPostForm("/admin/vacancies", form, adminCookie);
    expect(response.status).toBe(303);
    expect(response.location).toContain("error=company_suspended");

    const [vacancy] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, companySuspendedVacancyId));
    expect(vacancy.status).toBe("suspended");

    const audit = await latestAudit("admin.vacancy_moderation_blocked", companySuspendedVacancyId);
    expect(audit?.metadata).toMatchObject({ reason: "company_suspended" });
  });

  it("refuses to restore an incomplete or history-less suspension", async () => {
    const page = await httpGet("/admin/vacancies?status=suspended", adminCookie);
    const baseForm = extractForm(page.body, "vacancyId", companySuspendedVacancyId);

    const incompleteForm = new FormData();
    for (const [key, value] of baseForm.entries()) incompleteForm.append(key, String(value));
    incompleteForm.set("vacancyId", incompleteVacancyId);
    incompleteForm.set("outcome", "restore");
    incompleteForm.set("notes", NOTES);

    const incomplete = await httpPostForm("/admin/vacancies", incompleteForm, adminCookie);
    expect(incomplete.status).toBe(303);
    expect(incomplete.location).toContain("error=incomplete");
    const incompleteAudit = await latestAudit(
      "admin.vacancy_moderation_blocked",
      incompleteVacancyId,
    );
    expect(incompleteAudit?.metadata).toMatchObject({ reason: "incomplete" });

    const legacyForm = new FormData();
    for (const [key, value] of baseForm.entries()) legacyForm.append(key, String(value));
    legacyForm.set("vacancyId", legacySuspendedVacancyId);
    legacyForm.set("outcome", "restore");
    legacyForm.set("notes", NOTES);

    const legacy = await httpPostForm("/admin/vacancies", legacyForm, adminCookie);
    expect(legacy.status).toBe(303);
    expect(legacy.location).toContain("error=previous_status_unknown");
    const legacyAudit = await latestAudit(
      "admin.vacancy_moderation_blocked",
      legacySuspendedVacancyId,
    );
    expect(legacyAudit?.metadata).toMatchObject({ reason: "previous_status_unknown" });

    const rows = await db
      .select({ id: vacancies.id, status: vacancies.status })
      .from(vacancies);
    for (const id of [incompleteVacancyId, legacySuspendedVacancyId]) {
      expect(rows.find((row) => row.id === id)?.status).toBe("suspended");
    }
  });

  it("expires a live vacancy", async () => {
    const page = await httpGet("/admin/vacancies?status=published_verified", adminCookie);
    const form = extractForm(page.body, "vacancyId", otherLiveVacancyId);
    form.set("outcome", "expire");
    form.set("notes", NOTES);

    const response = await httpPostForm("/admin/vacancies", form, adminCookie);
    expect([200, 303]).toContain(response.status);

    const [vacancy] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, otherLiveVacancyId));
    expect(vacancy.status).toBe("expired");
    const audit = await latestAudit("admin.vacancy_expire", otherLiveVacancyId);
    expect(audit?.metadata).toMatchObject({
      previousStatus: "published_verified",
      nextStatus: "expired",
    });
  });

  it("rejects non-admin vacancy moderation without changing the row", async () => {
    const before = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, liveVacancyId));

    const page = await httpGet("/admin/vacancies", adminCookie);
    const form = extractForm(page.body, "vacancyId", liveVacancyId);
    form.set("outcome", "suspend");
    form.set("notes", NOTES);

    for (const jar of [employerCookie, driverCookie, new Map<string, string>()]) {
      const response = await httpPostForm("/admin/vacancies", form, jar);
      expect([200, 303, 307]).toContain(response.status);
    }

    const after = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, liveVacancyId));
    expect(after).toEqual(before);
  });

  it("publishes a pending review and records the transition", async () => {
    const page = await httpGet("/admin/reviews?status=pending", adminCookie);
    const form = extractForm(page.body, "reviewId", pendingReviewId);
    form.set("outcome", "publish");
    form.set("notes", NOTES);

    const response = await httpPostForm("/admin/reviews", form, adminCookie);
    expect([200, 303]).toContain(response.status);

    const [review] = await db
      .select({
        status: driverReviews.status,
        publishedAt: driverReviews.publishedAt,
      })
      .from(driverReviews)
      .where(eq(driverReviews.id, pendingReviewId));
    expect(review.status).toBe("published");
    expect(review.publishedAt).not.toBeNull();

    const audit = await latestAudit("admin.review_moderation", pendingReviewId);
    expect(audit?.metadata).toMatchObject({
      previousStatus: "pending",
      nextStatus: "published",
      outcome: "publish",
      firstPublication: true,
    });
  });

  it("does not accept moderatedAt as proof that a review was never published", async () => {
    const page = await httpGet("/admin/reviews?status=published", adminCookie);
    const baseForm = extractForm(page.body, "reviewId", publishedReviewId);

    const form = new FormData();
    for (const [key, value] of baseForm.entries()) form.append(key, String(value));
    form.set("reviewId", ambiguousUnderReviewId);
    form.set("outcome", "publish");
    form.set("notes", NOTES);

    const response = await httpPostForm("/admin/reviews", form, adminCookie);
    expect(response.status).toBe(303);
    expect(response.location).toContain("error=publication_history_unknown");

    const [review] = await db
      .select({ status: driverReviews.status, publishedAt: driverReviews.publishedAt })
      .from(driverReviews)
      .where(eq(driverReviews.id, ambiguousUnderReviewId));
    expect(review).toEqual({ status: "under_review", publishedAt: null });

    const audit = await latestAudit("admin.review_moderation_blocked", ambiguousUnderReviewId);
    expect(audit?.metadata).toMatchObject({
      reason: "publication_history_unknown",
      evidence: { enteredUnderReviewFromPending: false, everPublished: false },
    });
  });

  it("publishes a review after a recorded pending to under-review transition", async () => {
    const pendingPage = await httpGet("/admin/reviews?status=pending", adminCookie);
    const reviewForm = extractForm(pendingPage.body, "reviewId", convertibleReviewId);
    reviewForm.set("outcome", "under_review");
    reviewForm.set("notes", NOTES);

    const reviewed = await httpPostForm("/admin/reviews", reviewForm, adminCookie);
    expect([200, 303]).toContain(reviewed.status);

    const [afterReview] = await db
      .select({ status: driverReviews.status })
      .from(driverReviews)
      .where(eq(driverReviews.id, convertibleReviewId));
    expect(afterReview.status).toBe("under_review");

    const underReviewPage = await httpGet("/admin/reviews?status=under_review", adminCookie);
    const publishForm = extractForm(underReviewPage.body, "reviewId", convertibleReviewId);
    publishForm.set("outcome", "publish");
    publishForm.set("notes", NOTES);

    const published = await httpPostForm("/admin/reviews", publishForm, adminCookie);
    expect([200, 303]).toContain(published.status);

    const [afterPublish] = await db
      .select({ status: driverReviews.status, publishedAt: driverReviews.publishedAt })
      .from(driverReviews)
      .where(eq(driverReviews.id, convertibleReviewId));
    expect(afterPublish.status).toBe("published");
    expect(afterPublish.publishedAt).not.toBeNull();

    const audit = await latestAudit("admin.review_moderation", convertibleReviewId);
    expect(audit?.metadata).toMatchObject({
      previousStatus: "under_review",
      nextStatus: "published",
      firstPublication: true,
    });
  });

  it("reopens a published review without losing publication history", async () => {
    const [before] = await db
      .select({ publishedAt: driverReviews.publishedAt })
      .from(driverReviews)
      .where(eq(driverReviews.id, publishedReviewId));
    expect(before.publishedAt).not.toBeNull();

    const page = await httpGet("/admin/reviews?status=published", adminCookie);
    const reopenForm = extractForm(page.body, "reviewId", publishedReviewId);
    reopenForm.set("outcome", "under_review");
    reopenForm.set("notes", NOTES);

    const reopened = await httpPostForm("/admin/reviews", reopenForm, adminCookie);
    expect([200, 303]).toContain(reopened.status);

    const [duringReview] = await db
      .select({ status: driverReviews.status, publishedAt: driverReviews.publishedAt })
      .from(driverReviews)
      .where(eq(driverReviews.id, publishedReviewId));
    expect(duringReview.status).toBe("under_review");
    expect(duringReview.publishedAt).toEqual(before.publishedAt);

    const publicReviews = await getCompanyReviews(companyId);
    expect(publicReviews.some((row) => row.review.id === publishedReviewId)).toBe(false);

    const underReviewPage = await httpGet("/admin/reviews?status=under_review", adminCookie);
    const republishForm = extractForm(underReviewPage.body, "reviewId", publishedReviewId);
    republishForm.set("outcome", "publish");
    republishForm.set("notes", NOTES);

    const republished = await httpPostForm("/admin/reviews", republishForm, adminCookie);
    expect([200, 303]).toContain(republished.status);

    const [after] = await db
      .select({ status: driverReviews.status, publishedAt: driverReviews.publishedAt })
      .from(driverReviews)
      .where(eq(driverReviews.id, publishedReviewId));
    expect(after.status).toBe("published");
    expect(after.publishedAt).toEqual(before.publishedAt);
  });

  it("blocks reject for a previously published review", async () => {
    const page = await httpGet("/admin/reviews?status=published", adminCookie);
    const form = extractForm(page.body, "reviewId", publishedReviewId);
    form.set("outcome", "reject");
    form.set("notes", NOTES);

    const response = await httpPostForm("/admin/reviews", form, adminCookie);
    expect(response.status).toBe(303);
    expect(response.location).toContain("error=use_remove");

    const [review] = await db
      .select({ status: driverReviews.status })
      .from(driverReviews)
      .where(eq(driverReviews.id, publishedReviewId));
    expect(review.status).toBe("published");

    const audit = await latestAudit("admin.review_moderation_blocked", publishedReviewId);
    expect(audit?.metadata).toMatchObject({
      reason: "use_remove",
      previousStatus: "published",
      requestedOutcome: "reject",
    });
  });

  it("cannot republish a rejected review", async () => {
    const page = await httpGet("/admin/reviews?status=published", adminCookie);
    const baseForm = extractForm(page.body, "reviewId", publishedReviewId);

    const form = new FormData();
    for (const [key, value] of baseForm.entries()) form.append(key, String(value));
    form.set("reviewId", rejectedReviewId);
    form.set("outcome", "publish");
    form.set("notes", NOTES);

    const response = await httpPostForm("/admin/reviews", form, adminCookie);
    expect(response.status).toBe(303);
    expect(response.location).toContain("error=terminal_state");

    const [review] = await db
      .select({ status: driverReviews.status })
      .from(driverReviews)
      .where(eq(driverReviews.id, rejectedReviewId));
    expect(review.status).toBe("rejected");
  });

  it("fails closed for a legacy under-review row with no publication history", async () => {
    const page = await httpGet("/admin/reviews?status=published", adminCookie);
    const baseForm = extractForm(page.body, "reviewId", publishedReviewId);

    const form = new FormData();
    for (const [key, value] of baseForm.entries()) form.append(key, String(value));
    form.set("reviewId", legacyUnderReviewId);
    form.set("outcome", "publish");
    form.set("notes", NOTES);

    const response = await httpPostForm("/admin/reviews", form, adminCookie);
    expect(response.status).toBe(303);
    expect(response.location).toContain("error=publication_history_unknown");

    const [review] = await db
      .select({ status: driverReviews.status })
      .from(driverReviews)
      .where(eq(driverReviews.id, legacyUnderReviewId));
    expect(review.status).toBe("under_review");

    const audit = await latestAudit("admin.review_moderation_blocked", legacyUnderReviewId);
    expect(audit?.metadata).toMatchObject({ reason: "publication_history_unknown" });
  });

  it("resolves a report once and refuses to reopen it", async () => {
    const page = await httpGet("/admin/reports?status=open", adminCookie);
    const form = extractForm(page.body, "reportId", reportId);
    form.set("outcome", "resolved");
    form.set("notes", "Checked the reported review and recorded the outcome.");

    const resolved = await httpPostForm("/admin/reports", form, adminCookie);
    expect([200, 303]).toContain(resolved.status);

    const [report] = await db
      .select({ status: contentReports.status })
      .from(contentReports)
      .where(eq(contentReports.id, reportId));
    expect(report.status).toBe("resolved");

    const audit = await latestAudit("admin.report_resolved", reportId);
    expect(audit?.metadata).toMatchObject({
      previousStatus: "open",
      nextStatus: "resolved",
    });

    const reopenedForm = new FormData();
    for (const [key, value] of form.entries()) reopenedForm.append(key, String(value));
    reopenedForm.set("outcome", "investigating");
    reopenedForm.set("notes", "Attempt to reopen.");
    const reopened = await httpPostForm("/admin/reports", reopenedForm, adminCookie);
    expect(reopened.status).toBe(303);
    expect(reopened.location).toContain("error=terminal_state");

    const [unchanged] = await db
      .select({ status: contentReports.status })
      .from(contentReports)
      .where(eq(contentReports.id, reportId));
    expect(unchanged.status).toBe("resolved");
  });

  it("invalidates an existing session when a user is suspended", async () => {
    const before = await httpGet("/dashboard", victimCookie);
    expect(before.status).toBe(200);

    const page = await httpGet("/admin/users?q=victim-http", adminCookie);
    const form = extractForm(page.body, "userId", victimId);
    form.set("outcome", "suspend");
    form.set("reason", "Suspended during the T-003 HTTP test.");

    const suspended = await httpPostForm("/admin/users", form, adminCookie);
    expect([200, 303]).toContain(suspended.status);

    const [account] = await db
      .select({ isActive: users.isActive, reason: users.suspendedReason })
      .from(users)
      .where(eq(users.id, victimId));
    expect(account.isActive).toBe(false);
    expect(account.reason).toContain("T-003");

    const remainingSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, victimId));
    expect(remainingSessions).toHaveLength(0);

    const after = await httpGet("/dashboard", victimCookie);
    expect(after.status).toBe(307);
    expect(after.location).toContain("/login");

    const loginAttempt = await loginAs(victimEmail, victimPassword);
    expect(loginAttempt.body).toContain("suspended");

    const audit = await latestAudit("admin.user_suspend", victimId);
    expect(audit?.metadata).toMatchObject({
      previousActive: true,
      nextActive: false,
      sessionsInvalidated: true,
    });
  });

  it("restores the account and allows a new session", async () => {
    const page = await httpGet("/admin/users?q=victim-http", adminCookie);
    const form = extractForm(page.body, "userId", victimId);
    form.set("outcome", "restore");
    form.set("reason", "Suspension lifted after review.");

    const restored = await httpPostForm("/admin/users", form, adminCookie);
    expect([200, 303]).toContain(restored.status);

    const [account] = await db
      .select({ isActive: users.isActive, reason: users.suspendedReason })
      .from(users)
      .where(eq(users.id, victimId));
    expect(account.isActive).toBe(true);
    expect(account.reason).toBeNull();

    const loginJar: CookieJar = new Map();
    const login = await loginAs(victimEmail, victimPassword, loginJar);
    expect(login.status).toBe(303);
    expect(login.location).toBe("/dashboard");

    const dashboard = await httpGet("/dashboard", loginJar);
    expect(dashboard.status).toBe(200);
  });

  it("does not let an administrator suspend their own account", async () => {
    const page = await httpGet("/admin/users?q=victim-http", adminCookie);
    const baseForm = extractForm(page.body, "userId", victimId);

    const form = new FormData();
    for (const [key, value] of baseForm.entries()) form.append(key, String(value));
    form.set("userId", adminId);
    form.set("outcome", "suspend");
    form.set("reason", "Self suspension attempt.");

    const response = await httpPostForm("/admin/users", form, adminCookie);
    expect([200, 303, 307]).toContain(response.status);

    const [account] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, adminId));
    expect(account.isActive).toBe(true);
  });

  it("rejects non-admin review, report and user mutations", async () => {
    const reviewPage = await httpGet("/admin/reviews?status=published", adminCookie);
    const reviewForm = extractForm(reviewPage.body, "reviewId", publishedReviewId);
    reviewForm.set("outcome", "under_review");
    reviewForm.set("notes", NOTES);

    const [openReport] = await db
      .insert(contentReports)
      .values({
        reporterUserId: driverId,
        targetType: "review",
        targetId: publishedReviewId,
        reason: "Second test report",
        details: "Report used to test unauthorized report mutation.",
        status: "open",
      })
      .returning({ id: contentReports.id });
    const reportPage = await httpGet("/admin/reports?status=open", adminCookie);
    const reportForm = extractForm(reportPage.body, "reportId", openReport.id);
    reportForm.set("outcome", "dismissed");
    reportForm.set("notes", NOTES);

    const userPage = await httpGet("/admin/users?q=victim-http", adminCookie);
    const userForm = extractForm(userPage.body, "userId", victimId);
    userForm.set("outcome", "suspend");
    userForm.set("reason", "Unauthorized suspension attempt.");

    for (const jar of [employerCookie, driverCookie]) {
      await httpPostForm("/admin/reviews", reviewForm, jar);
      await httpPostForm("/admin/reports", reportForm, jar);
      await httpPostForm("/admin/users", userForm, jar);
    }

    const [review] = await db
      .select({ status: driverReviews.status })
      .from(driverReviews)
      .where(eq(driverReviews.id, publishedReviewId));
    expect(review.status).toBe("published");

    const [report] = await db
      .select({ status: contentReports.status, handledBy: contentReports.handledByUserId })
      .from(contentReports)
      .where(eq(contentReports.id, openReport.id));
    expect(report).toEqual({ status: "open", handledBy: null });

    const [account] = await db
      .select({ isActive: users.isActive, reason: users.suspendedReason })
      .from(users)
      .where(eq(users.id, victimId));
    expect(account).toEqual({ isActive: true, reason: null });
  });

  it("shows audit rows and the blocked decisions on the read-only audit page", async () => {
    const page = await httpGet("/admin/audit", adminCookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("admin.review_moderation");
    expect(page.body).toContain("admin.vacancy_moderation_blocked");
    expect(page.body).toContain("admin.user_suspend");
    expect(page.body).not.toContain("passwordHash");
  });

  it("counts mutations in the audit trail for every vacancy action", async () => {
    const rows = await db
      .select({ action: auditLogs.action, entityId: auditLogs.entityId })
      .from(auditLogs)
      .where(eq(auditLogs.entityId, liveVacancyId));
    expect(rows.map((row) => row.action)).toEqual(
      expect.arrayContaining(["admin.vacancy_suspend", "admin.vacancy_restore"]),
    );
    expect(suspendedCompanyId).toBeTruthy();
    expect(companyId).toBeTruthy();
  });
});

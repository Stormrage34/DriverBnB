import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  driverProfiles,
  driverReviews,
  enquiries,
  reviewResponses,
  users,
  vacancies,
} from "@/db/schema";
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

function jarFrom(cookie: string): CookieJar {
  return new Map([["df_session", cookie.split("=")[1]]]);
}

describe("HTTP permission matrix and tenant isolation", () => {
  let adminCookie: CookieJar;
  let driverACookie: CookieJar;
  let driverBCookie: CookieJar;
  let employerACookie: CookieJar;
  let employerBCookie: CookieJar;
  let suspendedCookie: CookieJar;
  let adminId: string;
  let driverAId: string;
  let driverBId: string;
  let employerAId: string;
  let employerBId: string;
  let suspendedDriverId: string;
  let companyAId: string;
  let companyBId: string;
  let draftVacancyAId: string;
  let publishedVacancyAId: string;
  let publishedVacancyBId: string;
  let reviewAId: string;
  let reviewBId: string;
  let enquiryAId: string;
  let enquiryBId: string;
  const driverAEmail = "matrix-driver-a@test.local";
  const driverBEmail = "matrix-driver-b@test.local";

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();

    adminId = await createUser("admin", "matrix-admin@test.local");
    driverAId = await createUser("driver", driverAEmail);
    driverBId = await createUser("driver", driverBEmail);
    employerAId = await createUser("employer", "matrix-employer-a@test.local");
    employerBId = await createUser("employer", "matrix-employer-b@test.local");
    suspendedDriverId = await createUser("driver", "matrix-suspended@test.local");
    await db
      .update(users)
      .set({ isActive: false, suspendedReason: "Suspended for the matrix test." })
      .where(eq(users.id, suspendedDriverId));

    await db.insert(driverProfiles).values([
      { userId: driverAId, firstName: "Driver Alpha" },
      { userId: driverBId, firstName: "Driver Beta" },
      { userId: suspendedDriverId, firstName: "Suspended Driver" },
    ]);

    const companyA = await createCompany({
      ownerUserId: employerAId,
      slug: "matrix-company-a",
      legalName: "Matrix Company Alpha B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    companyAId = companyA.id;
    const companyB = await createCompany({
      ownerUserId: employerBId,
      slug: "matrix-company-b",
      legalName: "Matrix Company Beta B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    companyBId = companyB.id;

    const draftA = await createVacancy({
      companyId: companyAId,
      createdByUserId: employerAId,
      slug: "matrix-draft-a",
      status: "draft",
    });
    draftVacancyAId = draftA.id;
    const publishedA = await createVacancy({
      companyId: companyAId,
      createdByUserId: employerAId,
      slug: "matrix-published-a",
      status: "published_verified",
    });
    publishedVacancyAId = publishedA.id;
    const publishedB = await createVacancy({
      companyId: companyBId,
      createdByUserId: employerBId,
      slug: "matrix-published-b",
      status: "published_verified",
    });
    publishedVacancyBId = publishedB.id;

    await createVerification({
      companyId: companyAId,
      status: "submitted",
      source: "employer_submission",
      withSnapshot: true,
      evidenceNotes: "ALPHA-EVIDENCE-ONLY",
    });
    await createVerification({
      companyId: companyBId,
      status: "submitted",
      source: "employer_submission",
      withSnapshot: true,
      evidenceNotes: "BETA-EVIDENCE-ONLY",
    });

    const reviews = await db
      .insert(driverReviews)
      .values([
        {
          companyId: companyAId,
          driverUserId: driverAId,
          employmentStart: "2024-01-01",
          overallRating: 4,
          title: "Alpha review title",
          body: "Review that belongs to company Alpha and must not leak to company Beta.",
          status: "published",
          publishedAt: new Date(),
        },
        {
          companyId: companyBId,
          driverUserId: driverBId,
          employmentStart: "2024-01-01",
          overallRating: 3,
          title: "Beta review title",
          body: "Review that belongs to company Beta and must not leak to company Alpha.",
          status: "published",
          publishedAt: new Date(),
        },
      ])
      .returning({ id: driverReviews.id });
    reviewAId = reviews[0].id;
    reviewBId = reviews[1].id;

    const enquiriesRows = await db
      .insert(enquiries)
      .values([
        {
          vacancyId: publishedVacancyAId,
          companyId: companyAId,
          driverUserId: driverAId,
          message: "Alpha enquiry message from driver A.",
          status: "sent",
        },
        {
          vacancyId: publishedVacancyBId,
          companyId: companyBId,
          driverUserId: driverBId,
          message: "Beta enquiry message from driver B.",
          status: "sent",
        },
      ])
      .returning({ id: enquiries.id });
    enquiryAId = enquiriesRows[0].id;
    enquiryBId = enquiriesRows[1].id;

    adminCookie = jarFrom(await createSessionCookie(adminId));
    driverACookie = jarFrom(await createSessionCookie(driverAId));
    driverBCookie = jarFrom(await createSessionCookie(driverBId));
    employerACookie = jarFrom(await createSessionCookie(employerAId));
    employerBCookie = jarFrom(await createSessionCookie(employerBId));
    suspendedCookie = jarFrom(await createSessionCookie(suspendedDriverId));
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("scopes driver workspace routes to drivers", async () => {
    for (const route of [
      "/dashboard",
      "/dashboard/applications",
      "/dashboard/saved",
      "/dashboard/reviews",
      "/dashboard/profile",
      "/dashboard/settings",
    ]) {
      const anonymous = await httpGet(route);
      expect(anonymous.status, `${route} anonymous`).toBe(307);
      expect(anonymous.location).toContain("/login");

      const driver = await httpGet(route, driverACookie);
      expect(driver.status, `${route} driver`).toBe(200);

      const employer = await httpGet(route, employerACookie);
      expect(employer.status, `${route} employer`).toBe(307);
      expect(employer.location).toBe("/employer");

      const admin = await httpGet(route, adminCookie);
      expect(admin.status, `${route} admin`).toBe(307);
      expect(admin.location).toBe("/admin");
    }
  });

  it("scopes employer workspace routes to employers", async () => {
    for (const route of ["/employer", "/employer/enquiries", "/employer/reviews", "/employer/company"]) {
      const anonymous = await httpGet(route);
      expect(anonymous.status, `${route} anonymous`).toBe(307);
      expect(anonymous.location).toContain("/login");

      const employer = await httpGet(route, employerACookie);
      expect(employer.status, `${route} employer`).toBe(200);

      const driver = await httpGet(route, driverACookie);
      expect(driver.status, `${route} driver`).toBe(307);
      expect(driver.location).toBe("/dashboard");

      const admin = await httpGet(route, adminCookie);
      expect(admin.status, `${route} admin`).toBe(307);
      expect(admin.location).toBe("/admin");
    }
  });

  it("returns only the requesting driver's export payload", async () => {
    const anonymous = await httpGet("/api/me/export");
    expect(anonymous.status).toBe(401);

    const exportA = await httpGet("/api/me/export", driverACookie);
    expect(exportA.status).toBe(200);
    const payloadA = JSON.parse(exportA.body) as {
      account: { email: string };
      enquiries: Array<{ message: string }>;
      reviews: Array<{ title: string }>;
    };
    expect(payloadA.account.email).toBe(driverAEmail);
    expect(exportA.body).toContain("Alpha enquiry message from driver A.");
    expect(exportA.body).not.toContain(driverBEmail);
    expect(exportA.body).not.toContain("Beta enquiry message from driver B.");
    expect(exportA.body).not.toContain("Beta review title");

    const exportB = await httpGet("/api/me/export", driverBCookie);
    expect(exportB.status).toBe(200);
    expect(exportB.body).not.toContain(driverAEmail);
    expect(exportB.body).not.toContain("Alpha enquiry message from driver A.");
    expect(exportB.body).not.toContain("Alpha review title");
  });

  it("returns only a company's own enquiries and reviews", async () => {
    const enquiriesA = await httpGet("/employer/enquiries", employerACookie);
    expect(enquiriesA.body).toContain("Alpha enquiry message from driver A.");
    expect(enquiriesA.body).not.toContain("Beta enquiry message from driver B.");

    const enquiriesB = await httpGet("/employer/enquiries", employerBCookie);
    expect(enquiriesB.body).toContain("Beta enquiry message from driver B.");
    expect(enquiriesB.body).not.toContain("Alpha enquiry message from driver A.");

    const reviewsA = await httpGet("/employer/reviews", employerACookie);
    expect(reviewsA.body).toContain("Alpha review title");
    expect(reviewsA.body).not.toContain("Beta review title");

    const reviewsB = await httpGet("/employer/reviews", employerBCookie);
    expect(reviewsB.body).toContain("Beta review title");
    expect(reviewsB.body).not.toContain("Alpha review title");
  });

  it("orders verification evidence to the owning employer only", async () => {
    const owner = await httpGet("/employer/verification", employerACookie);
    expect(owner.status).toBe(200);
    expect(owner.body).toContain("ALPHA-EVIDENCE-ONLY");
    expect(owner.body).not.toContain("BETA-EVIDENCE-ONLY");

    const other = await httpGet("/employer/verification", employerBCookie);
    expect(other.status).toBe(200);
    expect(other.body).toContain("BETA-EVIDENCE-ONLY");
    expect(other.body).not.toContain("ALPHA-EVIDENCE-ONLY");

    const driver = await httpGet("/employer/verification", driverACookie);
    expect(driver.status).toBe(307);
    expect(driver.body).not.toContain("ALPHA-EVIDENCE-ONLY");

    const anonymous = await httpGet("/employer/verification");
    expect(anonymous.status).toBe(307);
    expect(anonymous.body).not.toContain("ALPHA-EVIDENCE-ONLY");
  });

  it("stops employer B replying to employer A's review", async () => {
    const page = await httpGet("/employer/reviews", employerACookie);
    const form = extractForm(page.body, "reviewId", reviewAId);
    form.set("body", "Unauthorized cross-tenant reply attempt that must not be stored.");

    const response = await httpPostForm("/employer/reviews", form, employerBCookie);
    expect([200, 303]).toContain(response.status);

    const responses = await db
      .select({ id: reviewResponses.id })
      .from(reviewResponses)
      .where(eq(reviewResponses.reviewId, reviewAId));
    expect(responses).toHaveLength(0);
  });

  it("stops employer B marking employer A's enquiry as viewed", async () => {
    const page = await httpGet("/employer/enquiries", employerACookie);
    const form = extractForm(page.body, "enquiryId", enquiryAId);

    const response = await httpPostForm("/employer/enquiries", form, employerBCookie);
    expect([200, 303]).toContain(response.status);

    const [enquiry] = await db
      .select({ status: enquiries.status })
      .from(enquiries)
      .where(eq(enquiries.id, enquiryAId));
    expect(enquiry.status).toBe("sent");
  });

  it("stops employer B changing employer A's company profile", async () => {
    const page = await httpGet("/employer/company", employerACookie);
    const form = extractForm(page.body, "legalName");
    form.set("legalName", "Hijacked By Beta B.V.");
    form.set("confirmIdentityChange", "on");

    const response = await httpPostForm("/employer/company", form, employerBCookie);
    expect([200, 303]).toContain(response.status);

    const [companyA] = await db
      .select({ legalName: companies.legalName })
      .from(companies)
      .where(eq(companies.id, companyAId));
    expect(companyA.legalName).toBe("Matrix Company Alpha B.V.");
  });

  it("stops employer B, a driver and an anonymous caller publishing employer A's draft", async () => {
    const page = await httpGet("/employer/vacancies", employerACookie);
    const form = extractForm(page.body, "vacancyId", draftVacancyAId);

    for (const jar of [employerBCookie, driverACookie, new Map<string, string>()]) {
      const response = await httpPostForm("/employer/vacancies", form, jar);
      expect([200, 303, 307]).toContain(response.status);
    }

    const [vacancy] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, draftVacancyAId));
    expect(vacancy.status).toBe("draft");
  });

  it("keeps admin moderation and audit surfaces off employer and driver routes", async () => {
    for (const route of ["/admin/verifications", "/admin/reviews", "/admin/audit"]) {
      for (const jar of [employerACookie, driverACookie]) {
        const response = await httpGet(route, jar);
        expect(response.status).toBe(307);
        expect(response.body).not.toContain("ALPHA-EVIDENCE-ONLY");
        expect(response.body).not.toContain("admin.review_moderation");
      }
    }
  });

  it("denies a suspended account with a live session row", async () => {
    const page = await httpGet("/dashboard", suspendedCookie);
    expect(page.status).toBe(307);
    expect(page.location).toContain("/login");

    const profilePage = await httpGet("/dashboard/profile", driverACookie);
    const form = extractForm(profilePage.body, "firstName");
    form.set("firstName", "Hijacked Suspended Driver");

    const attempt = await httpPostForm("/dashboard/profile", form, suspendedCookie);
    expect([200, 303, 307]).toContain(attempt.status);

    const [profile] = await db
      .select({ firstName: driverProfiles.firstName })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverAId));
    expect(profile.firstName).toBe("Driver Alpha");
  });
});

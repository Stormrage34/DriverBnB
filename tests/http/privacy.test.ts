import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  driverProfiles,
  driverReviews,
  enquiries,
  savedCompanies,
  savedVacancies,
  vacancies,
} from "@/db/schema";
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

function jarFrom(cookie: string): CookieJar {
  return new Map([["df_session", cookie.split("=")[1]]]);
}

describe("HTTP privacy boundaries", () => {
  let driverCookie: CookieJar;
  let phoneLessDriverCookie: CookieJar;
  let employerCookie: CookieJar;
  let driverId: string;
  let phoneLessDriverId: string;
  let employerId: string;
  let companyId: string;
  let suspendedCompanyId: string;
  let legacySuspendedCompanyId: string;
  let vacancyId: string;
  let suspendedVacancyId: string;
  const accountEmail = "account-address-must-stay-private@test.local";
  const sharedEmail = "shared-contact@test.local";

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
    await startTestServer();

    driverId = await createUser("driver", accountEmail);
    phoneLessDriverId = await createUser("driver", "phone-less-driver@test.local");
    employerId = await createUser("employer", "privacy-employer@test.local");

    await db.insert(driverProfiles).values([
      {
        userId: driverId,
        firstName: "Privacy Driver",
        phone: "+31612345678",
        contactEmail: sharedEmail,
      },
      {
        userId: phoneLessDriverId,
        firstName: "Phone Less Driver",
        phone: null,
      },
    ]);

    const company = await createCompany({
      ownerUserId: employerId,
      slug: "privacy-active-company",
      legalName: "Privacy Active Company B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    companyId = company.id;

    const suspendedCompany = await createCompany({
      ownerUserId: employerId,
      slug: "privacy-suspended-company",
      legalName: "Privacy Suspended Company B.V.",
      suspendedAt: new Date(),
      suspensionReason: "Suspended for the privacy HTTP test.",
    });
    suspendedCompanyId = suspendedCompany.id;

    const legacySuspendedCompany = await createCompany({
      ownerUserId: employerId,
      slug: "privacy-legacy-suspended-company",
      legalName: "Privacy Legacy Suspended Company B.V.",
      verificationStatus: "suspended",
    });
    legacySuspendedCompanyId = legacySuspendedCompany.id;

    const vacancy = await createVacancy({
      companyId,
      createdByUserId: employerId,
      slug: "privacy-active-vacancy",
      status: "published_verified",
    });
    vacancyId = vacancy.id;

    const suspendedVacancy = await createVacancy({
      companyId: suspendedCompanyId,
      createdByUserId: employerId,
      slug: "privacy-suspended-vacancy",
      status: "published_verified",
    });
    suspendedVacancyId = suspendedVacancy.id;

    await db.insert(savedCompanies).values([
      { userId: driverId, companyId },
      { userId: driverId, companyId: suspendedCompanyId },
      { userId: driverId, companyId: legacySuspendedCompanyId },
    ]);
    await db.insert(savedVacancies).values([
      { userId: driverId, vacancyId },
      { userId: driverId, vacancyId: suspendedVacancyId },
    ]);

    await db.insert(enquiries).values([
      {
        vacancyId,
        companyId,
        driverUserId: driverId,
        message: "Enquiry where the driver shared contact details explicitly.",
        sharedEmail,
        sharedPhone: "+31612345678",
      },
      {
        vacancyId,
        companyId,
        driverUserId: driverId,
        message: "Enquiry where the driver shared nothing at all.",
      },
    ]);

    driverCookie = jarFrom(await createSessionCookie(driverId));
    phoneLessDriverCookie = jarFrom(await createSessionCookie(phoneLessDriverId));
    employerCookie = jarFrom(await createSessionCookie(employerId));
  });

  afterAll(async () => {
    await stopTestServer();
    await truncateAll();
  });

  it("shows the employer only contact details explicitly shared per enquiry", async () => {
    const page = await httpGet("/employer/enquiries", employerCookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain(sharedEmail);
    expect(page.body).toContain("+31612345678");
    expect(page.body).toContain("Driver did not share email");
    expect(page.body).toContain("Driver did not share phone");
    expect(page.body).not.toContain(accountEmail);
  });

  it("hides suspended companies and their vacancies from the saved lists", async () => {
    const page = await httpGet("/dashboard/saved", driverCookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Privacy Active Company B.V.");
    expect(page.body).toContain("/jobs/privacy-active-vacancy");
    expect(page.body).not.toContain("Privacy Suspended Company B.V.");
    expect(page.body).not.toContain("Privacy Legacy Suspended Company B.V.");
    expect(page.body).not.toContain("privacy-suspended-vacancy");
  });

  it("hides the phone-sharing option when no phone is stored", async () => {
    const withPhone = await httpGet("/jobs/privacy-active-vacancy", driverCookie);
    expect(withPhone.body).toContain("Share my phone number");
    expect(withPhone.body).toContain(sharedEmail);

    const withoutPhone = await httpGet("/jobs/privacy-active-vacancy", phoneLessDriverCookie);
    expect(withoutPhone.body).toContain("Share my email address");
    expect(withoutPhone.body).not.toContain("Share my phone number");
    expect(withoutPhone.body).toContain("phone-less-driver@test.local");
  });

  it("stores only the contact details the driver actually has when sharing", async () => {
    const page = await httpGet("/jobs/privacy-active-vacancy", phoneLessDriverCookie);
    const form = extractForm(page.body, "vacancyId", vacancyId);
    form.set(
      "message",
      "I am interested in this role and would like to ask about the rotation and pay.",
    );
    form.set("shareEmail", "on");
    form.set("sharePhone", "on");

    const response = await httpPostForm("/jobs/privacy-active-vacancy", form, phoneLessDriverCookie);
    expect([200, 303]).toContain(response.status);

    const rows = await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.driverUserId, phoneLessDriverId));
    expect(rows).toHaveLength(1);
    expect(rows[0].sharedEmail).toBe("phone-less-driver@test.local");
    expect(rows[0].sharedPhone).toBeNull();
  });

  it("does not advertise employer search or contact requests", async () => {
    const page = await httpGet("/dashboard/profile", driverCookie);
    expect(page.status).toBe(200);
    expect(page.body).toContain("Your profile is private");
    expect(page.body).not.toContain("Allow employers to find my profile");
    expect(page.body).not.toContain("Employers may request contact");
  });

  it("ignores forged privacy flags and keeps the profile private", async () => {
    const page = await httpGet("/dashboard/profile", driverCookie);
    const form = extractForm(page.body, "firstName");
    form.set("firstName", "Privacy Driver");
    form.set("profileVisibility", "employers_on_request");
    form.set("isSearchable", "on");

    const response = await httpPostForm("/dashboard/profile", form, driverCookie);
    expect([200, 303]).toContain(response.status);

    const [profile] = await db
      .select({
        visibility: driverProfiles.profileVisibility,
        searchable: driverProfiles.isSearchable,
      })
      .from(driverProfiles)
      .where(eq(driverProfiles.userId, driverId));
    expect(profile).toEqual({ visibility: "private", searchable: false });
  });

  it("refuses a review for a company suspended via suspendedAt", async () => {
    const page = await httpGet("/dashboard/reviews/new", driverCookie);
    expect(page.status).toBe(200);
    const form = extractForm(page.body, "companyId");
    form.set("companyId", suspendedCompanyId);
    form.set("jobTitle", "Suspended company review attempt");
    form.set("employmentStart", "2025-01");
    form.set("overallRating", "4");
    form.set("title", "Attempted review of a suspended company");
    form.set(
      "body",
      "This review must never be stored because the company is suspended and hidden from drivers. It exists only to test the server-side suspension check.",
    );
    form.set("eligibilityAttested", "on");
    form.set("publicationConsent", "on");

    const response = await httpPostForm("/dashboard/reviews/new", form, driverCookie);
    expect([200, 303]).toContain(response.status);
    expect(response.body).toContain("suspended");

    const rows = await db
      .select({ id: driverReviews.id })
      .from(driverReviews)
      .where(eq(driverReviews.companyId, suspendedCompanyId));
    expect(rows).toHaveLength(0);
  });

  it("refuses a review for a legacy-suspended company", async () => {
    const page = await httpGet("/dashboard/reviews/new", driverCookie);
    const form = extractForm(page.body, "companyId");
    form.set("companyId", legacySuspendedCompanyId);
    form.set("employmentStart", "2025-02");
    form.set("overallRating", "3");
    form.set("title", "Attempted review of a legacy suspended company");
    form.set(
      "body",
      "This review must never be stored because the company is legacy-suspended. It exists only to test the central suspension helper.",
    );
    form.set("eligibilityAttested", "on");
    form.set("publicationConsent", "on");

    const response = await httpPostForm("/dashboard/reviews/new", form, driverCookie);
    expect([200, 303]).toContain(response.status);
    expect(response.body).toContain("suspended");

    const rows = await db
      .select({ id: driverReviews.id })
      .from(driverReviews)
      .where(eq(driverReviews.companyId, legacySuspendedCompanyId));
    expect(rows).toHaveLength(0);

    const [suspendedCompany] = await db
      .select({ suspendedAt: companies.suspendedAt })
      .from(companies)
      .where(eq(companies.id, suspendedCompanyId));
    expect(suspendedCompany.suspendedAt).not.toBeNull();
    const [vacancy] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(and(eq(vacancies.id, suspendedVacancyId), eq(vacancies.companyId, suspendedCompanyId)));
    expect(vacancy.status).toBe("published_verified");
    expect(companyId).toBeTruthy();
  });
});

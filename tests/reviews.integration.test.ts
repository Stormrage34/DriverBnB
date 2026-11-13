import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { companies, driverReviews, users } from "@/db/schema";
import { getCompanyReviews, getEmployerReviews } from "@/lib/queries";
import { ensureTestDatabase, truncateAll } from "./helpers/test-db";

/**
 * Regression test for KI-003: employers must see published reviews only.
 * Pending and removed reviews are moderation material, not employer-facing content.
 */
describe("employer review visibility", () => {
  let companyId: string;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();

    const [driver] = await db
      .insert(users)
      .values({
        email: "driver@test.local",
        passwordHash: "test-only",
        displayName: "Test Driver",
        role: "driver",
      })
      .returning({ id: users.id });

    const [employer] = await db
      .insert(users)
      .values({
        email: "employer@test.local",
        passwordHash: "test-only",
        displayName: "Test Employer",
        role: "employer",
      })
      .returning({ id: users.id });

    const [company] = await db
      .insert(companies)
      .values({
        ownerUserId: employer.id,
        slug: "demo-test-transport",
        legalName: "Demo Test Transport B.V.",
        country: "NL",
        companyType: "direct_employer",
        isDemoSeed: true,
      })
      .returning({ id: companies.id });
    companyId = company.id;

    await db.insert(driverReviews).values([
      {
        companyId,
        driverUserId: driver.id,
        employmentStart: "2025-01-01",
        overallRating: 4,
        title: "Published experience",
        body: "Published review body used by the regression test.",
        status: "published",
        eligibilityAttested: true,
        publishedAt: new Date(),
      },
      {
        companyId,
        driverUserId: driver.id,
        employmentStart: "2024-01-01",
        overallRating: 2,
        title: "Pending experience",
        body: "Pending review body that must not reach the employer.",
        status: "pending",
        eligibilityAttested: true,
      },
      {
        companyId,
        driverUserId: driver.id,
        employmentStart: "2023-01-01",
        overallRating: 1,
        title: "Removed experience",
        body: "Removed review body that must not reach the employer.",
        status: "removed",
        eligibilityAttested: true,
      },
    ]);
  });

  afterAll(async () => {
    await truncateAll();
  });

  it("returns only published reviews to the employer", async () => {
    const rows = await getEmployerReviews(companyId);
    expect(rows).toHaveLength(1);
    expect(rows[0].review.status).toBe("published");
    expect(rows[0].review.title).toBe("Published experience");
  });

  it("returns only published reviews to the public", async () => {
    const rows = await getCompanyReviews(companyId);
    expect(rows).toHaveLength(1);
    expect(rows[0].review.status).toBe("published");
  });
});

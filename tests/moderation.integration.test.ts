import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  companies,
  companyVerifications,
  driverReviews,
  reviewResponses,
  users,
} from "@/db/schema";
import {
  getCompanyReviews,
  getPendingReviewResponses,
  getPendingVerifications,
} from "@/lib/queries";
import { ensureTestDatabase, truncateAll } from "./helpers/test-db";

const MODERATOR_NOTE = "MODERATOR-ONLY: registry extract checked, address matches.";
const EMPLOYER_EVIDENCE = "EMPLOYER EVIDENCE: KvK extract and transport licence attached on request.";

describe("moderation data separation — H3 and H4", () => {
  let companyId: string;
  let reviewId: string;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();

    const [driver] = await db
      .insert(users)
      .values({
        email: "driver-moderation@test.local",
        passwordHash: "test-only",
        displayName: "Moderation Driver",
        role: "driver",
      })
      .returning({ id: users.id });

    const [employer] = await db
      .insert(users)
      .values({
        email: "employer-moderation@test.local",
        passwordHash: "test-only",
        displayName: "Moderation Employer",
        role: "employer",
      })
      .returning({ id: users.id });

    const [company] = await db
      .insert(companies)
      .values({
        ownerUserId: employer.id,
        slug: "demo-verification-evidence",
        legalName: "Demo Verification Evidence B.V.",
        country: "NL",
        companyType: "direct_employer",
        verificationStatus: "submitted",
        verificationNotes: MODERATOR_NOTE,
        isDemoSeed: true,
      })
      .returning({ id: companies.id });
    companyId = company.id;

    await db.insert(companyVerifications).values({
      companyId,
      submittedByUserId: employer.id,
      submittedData: { registrationNumber: "12345678", country: "NL" },
      evidenceNotes: EMPLOYER_EVIDENCE,
      status: "submitted",
    });

    const [review] = await db
      .insert(driverReviews)
      .values({
        companyId,
        driverUserId: driver.id,
        employmentStart: "2025-01-01",
        overallRating: 4,
        title: "Review under moderation",
        body: "Published review used to test reply moderation.",
        status: "published",
        eligibilityAttested: true,
        publishedAt: new Date(),
      })
      .returning({ id: driverReviews.id });
    reviewId = review.id;

    await db.insert(reviewResponses).values([
      {
        reviewId,
        companyId,
        authorUserId: employer.id,
        body: "Pending employer reply that must stay private until approved.",
        status: "pending",
      },
      {
        reviewId,
        companyId,
        authorUserId: employer.id,
        body: "Published employer reply that may appear on the public profile.",
        status: "published",
      },
    ]);
  });

  afterAll(async () => {
    await truncateAll();
  });

  it("returns the employer's evidence separately from moderator notes", async () => {
    const rows = await getPendingVerifications();
    expect(rows).toHaveLength(1);
    expect(rows[0].submission?.evidenceNotes).toBe(EMPLOYER_EVIDENCE);
    expect(rows[0].company.verificationNotes).toBe(MODERATOR_NOTE);
    expect(rows[0].submission?.evidenceNotes).not.toBe(rows[0].company.verificationNotes);
  });

  it("excludes pending employer replies from the public company profile", async () => {
    const reviews = await getCompanyReviews(companyId);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].responses).toHaveLength(1);
    expect(reviews[0].responses[0].status).toBe("published");
    expect(reviews[0].responses[0].body).toContain("Published employer reply");
  });

  it("returns only pending replies to the moderation queue", async () => {
    const pending = await getPendingReviewResponses();
    expect(pending).toHaveLength(1);
    expect(pending[0].response.status).toBe("pending");
    expect(pending[0].response.body).toContain("Pending employer reply");
    expect(pending[0].review.id).toBe(reviewId);
    expect(pending[0].company.id).toBe(companyId);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, companyVerifications, users, vacancies } from "@/db/schema";
import {
  getAdminStats,
  getPendingVerifications,
  listCompanies,
  searchVacancies,
} from "@/lib/queries";
import {
  buildIdentitySnapshot,
  isFullyVerified,
  readIdentitySnapshot,
} from "@/lib/verification";
import { identityHash } from "@/lib/verification-hash";
import { ensureTestDatabase, truncateAll } from "./helpers/test-db";

describe("verification query and filter consistency", () => {
  let verifiedCompanyId: string;
  let roleCheckedDirectId: string;
  let roleCheckedAgencyId: string;

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();

    const [employer] = await db
      .insert(users)
      .values({
        email: "verification-owner@test.local",
        passwordHash: "test-only",
        displayName: "Verification Owner",
        role: "employer",
      })
      .returning({ id: users.id });

    const base = {
      ownerUserId: employer.id,
      country: "NL",
      sectors: ["Reefer"],
      registrationNumber: "12345678",
      registeredAddress: "Havenweg 1, Rotterdam",
      contractingEntity: "Demo Transport B.V.",
      operatesOwnFleet: true,
      recruitsDirectly: true,
      isDemoSeed: true,
    };

    const inserted = await db
      .insert(companies)
      .values([
        {
          ...base,
          slug: "demo-verified",
          legalName: "Demo Verified B.V.",
          tradingName: "Demo Verified",
          companyType: "direct_employer",
          verificationStatus: "verified",
          verificationVersion: 1,
          verifiedAt: new Date(),
          lastVerifiedAt: new Date(),
        },
        {
          ...base,
          slug: "demo-role-checked-direct",
          legalName: "Demo Role Checked Direct B.V.",
          tradingName: "Demo Role Checked Direct",
          companyType: "direct_employer",
          verificationStatus: "direct_employer_checked",
        },
        {
          ...base,
          slug: "demo-role-checked-agency",
          legalName: "Demo Role Checked Agency B.V.",
          tradingName: "Demo Role Checked Agency",
          companyType: "recruitment_agency",
          recruitsDirectly: false,
          verificationStatus: "direct_employer_checked",
        },
        {
          ...base,
          slug: "demo-legacy-verified",
          legalName: "Demo Legacy Verified B.V.",
          tradingName: "Demo Legacy Verified",
          companyType: "direct_employer",
          verificationStatus: "verified",
          verificationVersion: 0,
          verifiedAt: new Date(),
        },
      ])
      .returning({
        id: companies.id,
        slug: companies.slug,
        legalName: companies.legalName,
        tradingName: companies.tradingName,
        country: companies.country,
        registrationNumber: companies.registrationNumber,
        registeredAddress: companies.registeredAddress,
        contractingEntity: companies.contractingEntity,
        companyType: companies.companyType,
        recruitsDirectly: companies.recruitsDirectly,
      });

    const bySlug = new Map(inserted.map((row) => [row.slug, row]));
    verifiedCompanyId = bySlug.get("demo-verified")!.id;
    roleCheckedDirectId = bySlug.get("demo-role-checked-direct")!.id;
    roleCheckedAgencyId = bySlug.get("demo-role-checked-agency")!.id;

    await db.insert(vacancies).values(
      inserted.map((company, index) => ({
        companyId: company.id,
        createdByUserId: employer.id,
        slug: `demo-vacancy-${index + 1}`,
        title: `Demo C+E driver ${index + 1}`,
        country: "NL",
        city: "Rotterdam",
        contractingEntity: company.contractingEntity ?? "Demo Transport B.V.",
        transportCategory: "reefer" as const,
        status: "published_verified" as const,
        infoScore: 80,
        publishedAt: new Date(),
        lastConfirmedAt: new Date(),
      })),
    );

    const [verifiedCompany] = inserted.filter((row) => row.slug === "demo-verified");
    await db.insert(companyVerifications).values({
      companyId: verifiedCompany.id,
      submittedByUserId: employer.id,
      status: "verified",
      decision: "approved",
      evidenceNotes: "Registry extract reviewed.",
      submittedData: {
        identity: buildIdentitySnapshot(verifiedCompany),
        identityHash: identityHash(buildIdentitySnapshot(verifiedCompany)),
        reviewedIdentity: buildIdentitySnapshot(verifiedCompany),
        identityChanges: [],
      },
    });
  });

  afterAll(async () => {
    await truncateAll();
  });

  it("includes direct_employer_checked in the moderator queue", async () => {
    const pending = await getPendingVerifications();
    const ids = pending.map((row) => row.company.id);
    expect(ids).toContain(roleCheckedDirectId);
    expect(ids).toContain(roleCheckedAgencyId);
    expect(ids).not.toContain(verifiedCompanyId);
  });

  it("counts direct_employer_checked as pending, not verified", async () => {
    const stats = await getAdminStats();
    expect(stats.companies.verified).toBe(1);
    expect(stats.companies.pending).toBe(2);
  });

  it("excludes direct_employer_checked and legacy verified from the fully verified job filter", async () => {
    const result = await searchVacancies({ verifiedOnly: true });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.company.id).toBe(verifiedCompanyId);
    expect(
      result.rows.every((row) =>
        isFullyVerified(row.company.verificationStatus, row.company.verificationVersion),
      ),
    ).toBe(true);
  });

  it("keeps direct-employer filtering independent from verification", async () => {
    const result = await searchVacancies({ directOnly: true });
    const ids = result.rows.map((row) => row.company.id);
    expect(ids).toContain(verifiedCompanyId);
    expect(ids).toContain(roleCheckedDirectId);
    expect(ids).not.toContain(roleCheckedAgencyId);
  });

  it("excludes direct_employer_checked from the fully verified company list", async () => {
    const result = await listCompanies({ verifiedOnly: true });
    expect(result.rows.map((row) => row.company.id)).toEqual([verifiedCompanyId]);
  });

  it("round-trips the reviewed identity snapshot", async () => {
    const [row] = await db
      .select()
      .from(companyVerifications)
      .where(eq(companyVerifications.companyId, verifiedCompanyId));
    const data = row?.submittedData ?? {};
    const identity = readIdentitySnapshot(
      (data as Record<string, unknown>).reviewedIdentity,
    );
    expect(identity).not.toBeNull();
    expect(identity?.legalName).toBe("Demo Verified B.V.");
    expect(identityHash(identity!)).toBe(
      (data as Record<string, unknown>).identityHash,
    );
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  auditLogs,
  companies,
  driverProfiles,
  enquiries,
  savedCompanies,
  savedVacancies,
  users,
  vacancies,
} from "@/db/schema";
import {
  ADMIN_PAGE_SIZE,
  adminPage,
  listAdminAuditLogs,
  listAdminVacancies,
  listAdminUsers,
} from "@/lib/admin-queries";
import { getDriverDashboard, getEmployerEnquiries, getSavedCompanies } from "@/lib/queries";
import { createCompany, createUser, createVacancy } from "./helpers/fixtures";
import { ensureTestDatabase, truncateAll } from "./helpers/test-db";

describe("admin queries and privacy boundaries", () => {
  let driverId: string;
  let employerId: string;
  let adminId: string;
  let activeCompanyId: string;
  let suspendedCompanyId: string;
  let legacySuspendedCompanyId: string;
  let activeVacancyId: string;
  let suspendedVacancyId: string;
  let legacyVacancyId: string;
  const driverAccountEmail = "driver-private-account@test.local";
  const sharedEmail = "driver-shared@test.local";

  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();

    driverId = await createUser("driver", driverAccountEmail);
    employerId = await createUser("employer", "employer-admin-queries@test.local");
    adminId = await createUser("admin", "admin-admin-queries@test.local");

    await db.insert(driverProfiles).values({
      userId: driverId,
      firstName: "Privacy",
      phone: "+31600000000",
      contactEmail: sharedEmail,
    });

    const activeCompany = await createCompany({
      ownerUserId: employerId,
      slug: "queries-active-company",
      legalName: "Queries Active B.V.",
      verificationStatus: "verified",
      verificationVersion: 1,
    });
    activeCompanyId = activeCompany.id;

    const suspendedCompany = await createCompany({
      ownerUserId: employerId,
      slug: "queries-suspended-company",
      legalName: "Queries Suspended B.V.",
      suspendedAt: new Date(),
      suspensionReason: "Test suspension reason.",
    });
    suspendedCompanyId = suspendedCompany.id;

    const legacyCompany = await createCompany({
      ownerUserId: employerId,
      slug: "queries-legacy-suspended-company",
      legalName: "Queries Legacy Suspended B.V.",
      verificationStatus: "suspended",
    });
    legacySuspendedCompanyId = legacyCompany.id;

    const activeVacancy = await createVacancy({
      companyId: activeCompanyId,
      createdByUserId: employerId,
      slug: "queries-active-vacancy",
      status: "published_verified",
    });
    activeVacancyId = activeVacancy.id;

    const suspendedVacancy = await createVacancy({
      companyId: suspendedCompanyId,
      createdByUserId: employerId,
      slug: "queries-suspended-vacancy",
      status: "published_unverified",
    });
    suspendedVacancyId = suspendedVacancy.id;

    const legacyVacancy = await createVacancy({
      companyId: legacySuspendedCompanyId,
      createdByUserId: employerId,
      slug: "queries-legacy-vacancy",
      status: "published_unverified",
    });
    legacyVacancyId = legacyVacancy.id;

    await db.insert(savedVacancies).values([
      { userId: driverId, vacancyId: activeVacancyId },
      { userId: driverId, vacancyId: suspendedVacancyId },
      { userId: driverId, vacancyId: legacyVacancyId },
    ]);
    await db.insert(savedCompanies).values([
      { userId: driverId, companyId: activeCompanyId },
      { userId: driverId, companyId: suspendedCompanyId },
      { userId: driverId, companyId: legacySuspendedCompanyId },
    ]);

    await db.insert(enquiries).values([
      {
        vacancyId: activeVacancyId,
        companyId: activeCompanyId,
        driverUserId: driverId,
        message: "Enquiry with contact details explicitly shared for this message.",
        sharedEmail,
        sharedPhone: "+31600000000",
      },
      {
        vacancyId: activeVacancyId,
        companyId: activeCompanyId,
        driverUserId: driverId,
        message: "Enquiry without any contact details shared at all.",
      },
    ]);

    await db.insert(auditLogs).values({
      actorUserId: adminId,
      action: "admin.test_action",
      entityType: "user",
      entityId: driverId,
      metadata: { note: "audit metadata" },
      ipAddress: "127.0.0.1",
    });

    // Enough accounts to exercise bounded pagination.
    await db.insert(users).values(
      Array.from({ length: 25 }, (_, index) => ({
        email: `bulk-user-${index}@test.local`,
        passwordHash: "bulk-test-only",
        displayName: `Bulk User ${index}`,
        role: "driver" as const,
      })),
    );
  });

  afterAll(async () => {
    await truncateAll();
  });

  it("never returns authentication secrets from listAdminUsers", async () => {
    const result = await listAdminUsers({ q: driverAccountEmail });
    expect(result.total).toBe(1);
    const row = result.rows[0];
    expect(Object.keys(row).sort()).toEqual(
      [
        "createdAt",
        "displayName",
        "email",
        "emailVerifiedAt",
        "id",
        "isActive",
        "lastLoginAt",
        "role",
        "suspendedReason",
        "updatedAt",
      ].sort(),
    );
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(JSON.stringify(result)).not.toContain("test-only");
  });

  it("filters users by role and suspension state", async () => {
    const drivers = await listAdminUsers({ role: "driver", q: "Bulk User" });
    expect(drivers.total).toBe(25);
    expect(drivers.rows.every((row) => row.role === "driver")).toBe(true);

    await db.update(users).set({ isActive: false, suspendedReason: "Suspended in test." }).where(eq(users.id, driverId));
    const suspended = await listAdminUsers({ state: "suspended" });
    expect(suspended.total).toBe(1);
    expect(suspended.rows[0].id).toBe(driverId);

    const active = await listAdminUsers({ state: "active" });
    expect(active.rows.some((row) => row.id === driverId)).toBe(false);

    await db.update(users).set({ isActive: true, suspendedReason: null }).where(eq(users.id, driverId));
  });

  it("paginates admin lists with a fixed bounded page size", async () => {
    const first = await listAdminUsers({ page: adminPage("1") });
    const second = await listAdminUsers({ page: adminPage("2") });
    expect(first.pageSize).toBe(ADMIN_PAGE_SIZE);
    expect(first.rows).toHaveLength(ADMIN_PAGE_SIZE);
    expect(second.rows.length).toBeGreaterThan(0);
    expect(second.page).toBe(2);
    expect(first.total).toBe(second.total);
    expect(first.rows[0].id).not.toBe(second.rows[0].id);

    expect(adminPage("999999")).toBe(500);
    expect(adminPage("-4")).toBe(1);
    expect(adminPage("not-a-number")).toBe(1);
  });

  it("filters vacancies by validated status", async () => {
    const suspended = await listAdminVacancies({ status: "published_unverified" });
    expect(suspended.rows.map((row) => row.vacancy.id).sort()).toEqual(
      [suspendedVacancyId, legacyVacancyId].sort(),
    );

    const all = await listAdminVacancies({ status: "not-a-status" });
    expect(all.total).toBe(3);
  });

  it("does not expose the driver's account email in the employer enquiry payload", async () => {
    const rows = await getEmployerEnquiries(activeCompanyId);
    expect(rows).toHaveLength(2);
    expect(rows[0]).not.toHaveProperty("driverEmail");
    expect(JSON.stringify(rows)).not.toContain(driverAccountEmail);

    const shared = rows.find((row) => row.enquiry.sharedEmail !== null);
    const unshared = rows.find((row) => row.enquiry.sharedEmail === null);
    expect(shared?.enquiry.sharedEmail).toBe(sharedEmail);
    expect(shared?.enquiry.sharedPhone).toBe("+31600000000");
    expect(unshared?.enquiry.sharedPhone).toBeNull();
  });

  it("hides suspended companies and their vacancies from saved lists", async () => {
    const saved = await getSavedCompanies(driverId);
    expect(saved.map((row) => row.company.id)).toEqual([activeCompanyId]);

    const dashboard = await getDriverDashboard(driverId);
    expect(dashboard.savedJobs.map((row) => row.vacancy.id)).toEqual([activeVacancyId]);
    expect(JSON.stringify(dashboard.savedJobs)).not.toContain("Queries Suspended B.V.");
    expect(activeCompanyId).toBeTruthy();
  });

  it("returns audit rows with safe actor fields only", async () => {
    const result = await listAdminAuditLogs({ entity: "user" });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].log.action).toBe("admin.test_action");
    expect(Object.keys(result.rows[0].actor ?? {}).sort()).toEqual(["displayName", "email", "id"]);
    expect(JSON.stringify(result)).not.toContain("passwordHash");
  });

  it("keeps suspended company rows in the database while hiding them", async () => {
    const [row] = await db
      .select({ status: companies.verificationStatus, suspendedAt: companies.suspendedAt })
      .from(companies)
      .where(eq(companies.id, suspendedCompanyId));
    expect(row.status).toBe("unverified");
    expect(row.suspendedAt).not.toBeNull();

    const [legacyRow] = await db
      .select({ status: companies.verificationStatus })
      .from(companies)
      .where(eq(companies.id, legacySuspendedCompanyId));
    expect(legacyRow.status).toBe("suspended");

    const [vacancy] = await db
      .select({ status: vacancies.status })
      .from(vacancies)
      .where(eq(vacancies.id, activeVacancyId));
    expect(vacancy.status).toBe("published_verified");
  });
});

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companies,
  companyVerifications,
  sessions,
  users,
  vacancies,
} from "@/db/schema";
import { buildIdentitySnapshot } from "@/lib/verification";
import { identityHash } from "@/lib/verification-hash";
import { sessionToken } from "./http-server";

export async function createUser(
  role: "driver" | "employer" | "admin",
  email: string,
  options: { emailVerifiedAt?: Date | null; displayName?: string; passwordHash?: string } = {},
): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: options.passwordHash ?? "test-only",
      displayName: options.displayName ?? `Test ${role}`,
      role,
      emailVerifiedAt:
        options.emailVerifiedAt === undefined ? new Date() : options.emailVerifiedAt,
    })
    .returning({ id: users.id });
  return user.id;
}

export async function createSessionCookie(userId: string): Promise<string> {
  const { token, tokenHash } = sessionToken(userId);
  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    ipAddress: "127.0.0.1",
    userAgent: "vitest-http",
  });
  return `df_session=${token}`;
}

export async function createExpiredSessionCookie(userId: string): Promise<string> {
  const { token, tokenHash } = sessionToken(userId);
  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() - 60 * 1000),
    ipAddress: "127.0.0.1",
    userAgent: "vitest-http",
  });
  return `df_session=${token}`;
}

export async function createCompany(input: {
  ownerUserId: string | null;
  slug: string;
  legalName?: string;
  companyType?: "direct_employer" | "recruitment_agency" | "subcontractor" | "intermediary";
  verificationStatus?: "unverified" | "submitted" | "identity_checked" | "direct_employer_checked" | "verified" | "suspended";
  verificationVersion?: number;
  suspendedAt?: Date | null;
  suspensionReason?: string | null;
}) {
  const [company] = await db
    .insert(companies)
    .values({
      ownerUserId: input.ownerUserId,
      slug: input.slug,
      legalName: input.legalName ?? input.slug,
      tradingName: input.legalName ?? input.slug,
      country: "NL",
      registrationNumber: "12345678",
      registeredAddress: "Havenweg 1, Rotterdam",
      businessEmail: "hr@example.test",
      sectors: ["Reefer"],
      operatesOwnFleet: true,
      recruitsDirectly: true,
      companyType: input.companyType ?? "direct_employer",
      contractingEntity: input.legalName ?? input.slug,
      verificationStatus: input.verificationStatus ?? "unverified",
      verificationVersion: input.verificationVersion ?? 0,
      suspendedAt: input.suspendedAt ?? null,
      suspensionReason: input.suspensionReason ?? null,
      isDemoSeed: true,
    })
    .returning();
  return company;
}

export async function createVerification(input: {
  companyId: string;
  status: "submitted" | "identity_checked" | "direct_employer_checked" | "verified" | "unverified" | "suspended";
  source?: "employer_submission" | "company_profile_update";
  withSnapshot?: boolean;
  evidenceNotes?: string;
  decisionNotes?: string | null;
}) {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, input.companyId))
    .limit(1);
  if (!company) throw new Error("Company not found for verification fixture.");

  const identity = buildIdentitySnapshot(company);
  const submittedData = input.withSnapshot === false
    ? {}
    : {
        identity,
        identityHash: identityHash(identity),
        reviewedIdentity: input.status === "submitted" ? undefined : identity,
        ...(input.source ? { source: input.source } : {}),
      };

  await db.insert(companyVerifications).values({
    companyId: input.companyId,
    submittedByUserId: company.ownerUserId,
    submittedData,
    evidenceNotes: input.evidenceNotes ?? "Test evidence.",
    status: input.status,
    decisionNotes: input.decisionNotes ?? null,
  });
}

export async function createVacancy(input: {
  companyId: string;
  createdByUserId: string | null;
  slug: string;
  status: "draft" | "published_unverified" | "published_verified" | "confirmed" | "reconfirmation_required" | "expired" | "suspended";
  complete?: boolean;
  suspendedFromStatus?: "published_unverified" | "published_verified" | "confirmed" | "reconfirmation_required" | null;
}) {
  const [vacancy] = await db
    .insert(vacancies)
    .values({
      companyId: input.companyId,
      createdByUserId: input.createdByUserId,
      slug: input.slug,
      title: "Test C+E driver",
      country: "NL",
      city: "Rotterdam",
      contractingEntity: "Test Transport B.V.",
      transportCategory: "reefer",
      licenceRequirements: ["CE"],
      grossPayMin: 3000,
      grossPayMax: 3500,
      payStructure: "Gross monthly, 40h week",
      workingPattern: "International, 4 weeks on",
      rotation: "4 weeks on / 1 week home",
      homeTime: "One week per rotation",
      weeklyRest: "Hotel or depot accommodation",
      accommodation: "provided_free",
      applicationMethod: "platform_message",
      status: input.status,
      suspendedFromStatus: input.suspendedFromStatus ?? null,
      ...(input.complete === false
        ? {
            grossPayMin: null,
            payStructure: null,
            rotation: null,
            homeTime: null,
            weeklyRest: null,
            accommodation: "not_disclosed" as const,
            licenceRequirements: [],
          }
        : {}),
      publishedAt: new Date(),
      lastConfirmedAt: new Date(),
    })
    .returning();
  return vacancy;
}

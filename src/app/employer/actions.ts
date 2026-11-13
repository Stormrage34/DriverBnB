"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  companies,
  companyVerifications,
  driverReviews,
  enquiries,
  reviewResponses,
  vacancies,
  vacancyReconfirmations,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { RECONFIRM_AFTER_DAYS } from "@/lib/constants";
import { companyProfileSchema, responseSchema, vacancySchema, verificationSubmitSchema } from "@/lib/validation";
import { computeInfoScore, resolveVacancySave, resolveVacancyTransition } from "@/lib/vacancy";
import { canEmployerReplyToReview, INITIAL_RESPONSE_STATUS } from "@/lib/reviews";
import { isCompanySuspended, SUSPENDED_COMPANY_ERROR } from "@/lib/company-suspension";
import {
  buildIdentitySnapshot,
  buildOperationalValues,
  diffIdentityValues,
  diffOperationalValues,
  hasTrustedVerification,
  isFullyVerified,
  readIdentitySnapshot,
  resolveProfileUpdateStatus,
  resolveSubmissionStatus,
  requiresIdentityConfirmation,
  roleCheckLabel,
} from "@/lib/verification";
import { identityHash } from "@/lib/verification-hash";
import { slugify } from "@/lib/utils";

export type EmployerActionState = { error?: string; success?: string } | null;

const VERIFY_EMAIL_ERROR =
  "Confirm your email before publishing vacancies or submitting verification evidence. Open the link sent to your registered address, or request a new one from the confirmation page.";

async function employerContext() {
  const user = await getCurrentUser();
  if (!user || user.role !== "employer") return null;
  const [company] = await db.select().from(companies).where(eq(companies.ownerUserId, user.id)).limit(1);
  if (!company) return null;
  return { user, company };
}

function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAllowances(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, amount, note] = line.split("|").map((part) => part.trim());
      const parsedAmount = amount ? Number(amount.replace(/[^0-9.-]/g, "")) : NaN;
      return {
        label: label || "Allowance",
        amount: Number.isFinite(parsedAmount) ? parsedAmount : null,
        currency: "EUR",
        note: note || undefined,
      };
    });
}

function revalidateEmployerSurfaces() {
  revalidatePath("/employer");
  revalidatePath("/employer/vacancies");
  revalidatePath("/jobs");
  revalidatePath("/companies");
}

export async function submitVerificationAction(
  _prev: EmployerActionState,
  formData: FormData,
): Promise<EmployerActionState> {
  const ctx = await employerContext();
  if (!ctx) return { error: "Sign in with an employer account." };
  const { user, company } = ctx;
  if (!user.emailVerifiedAt) return { error: VERIFY_EMAIL_ERROR };
  if (isCompanySuspended(company)) return { error: SUSPENDED_COMPANY_ERROR };

  const parsed = verificationSubmitSchema.safeParse({
    registrationNumber: formData.get("registrationNumber"),
    registeredAddress: formData.get("registeredAddress"),
    contactPerson: formData.get("contactPerson"),
    businessEmail: formData.get("businessEmail"),
    website: formData.get("website") ?? "",
    operatesOwnFleet: formData.get("operatesOwnFleet"),
    recruitsDirectly: formData.get("recruitsDirectly"),
    contractingEntity: formData.get("contractingEntity"),
    evidenceNotes: formData.get("evidenceNotes"),
    confirmTruth: formData.get("confirmTruth"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const currentIdentity = buildIdentitySnapshot(company);
  const nextIdentity = {
    ...currentIdentity,
    registrationNumber: parsed.data.registrationNumber,
    registeredAddress: parsed.data.registeredAddress,
    contractingEntity: parsed.data.contractingEntity,
    recruitsDirectly: parsed.data.recruitsDirectly === "yes",
  };
  const identityDiff = diffIdentityValues(currentIdentity, nextIdentity);
  const confirmIdentityChange = formData.get("confirmIdentityChange") === "on";
  if (
    requiresIdentityConfirmation(company.verificationStatus, identityDiff) &&
    !confirmIdentityChange
  ) {
    return {
      error: `Changing ${identityDiff.changes
        .map((change) => change.label)
        .join(", ")} will change verified identity and requires explicit confirmation.`,
    };
  }

  const operationalDiff = diffOperationalValues(buildOperationalValues(company), {
    operatesOwnFleet: parsed.data.operatesOwnFleet === "yes",
    fleetSize: company.fleetSize,
    sectors: company.sectors,
    website: parsed.data.website || null,
    businessEmail: parsed.data.businessEmail,
    phone: company.phone,
    contactPerson: parsed.data.contactPerson,
    description: company.description,
  });

  const resolution = resolveSubmissionStatus(
    company.verificationStatus,
    identityDiff,
    company.verificationVersion,
  );
  if (!resolution.ok) return { error: resolution.error };
  const nextStatus = resolution.nextStatus;
  const nextVersion =
    hasTrustedVerification(company.verificationVersion) &&
    (nextStatus === "identity_checked" ||
      nextStatus === "direct_employer_checked" ||
      nextStatus === "verified")
      ? company.verificationVersion
      : 0;

  const [lastSubmission] = await db
    .select({ submittedData: companyVerifications.submittedData })
    .from(companyVerifications)
    .where(eq(companyVerifications.companyId, company.id))
    .orderBy(desc(companyVerifications.createdAt))
    .limit(1);

  const lastData = (lastSubmission?.submittedData ?? {}) as Record<string, unknown>;
  const previousReviewed = readIdentitySnapshot(lastData.reviewedIdentity ?? lastData.identity);
  const identityChanges = diffIdentityValues(
    previousReviewed ?? currentIdentity,
    nextIdentity,
  ).changes;

  await db.transaction(async (tx) => {
    await tx
      .update(companies)
      .set({
        registrationNumber: parsed.data.registrationNumber,
        registeredAddress: parsed.data.registeredAddress,
        contactPerson: parsed.data.contactPerson,
        businessEmail: parsed.data.businessEmail,
        website: parsed.data.website || null,
        operatesOwnFleet: parsed.data.operatesOwnFleet === "yes",
        recruitsDirectly: parsed.data.recruitsDirectly === "yes",
        contractingEntity: parsed.data.contractingEntity,
        verificationStatus: nextStatus,
        verificationVersion: nextVersion,
        verifiedAt: isFullyVerified(nextStatus, nextVersion)
          ? (company.verifiedAt ?? new Date())
          : null,
        lastVerifiedAt: isFullyVerified(nextStatus, nextVersion)
          ? (company.lastVerifiedAt ?? new Date())
          : null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id));

    if (!isFullyVerified(nextStatus, nextVersion)) {
      await tx
        .update(vacancies)
        .set({ status: "published_unverified", updatedAt: new Date() })
        .where(
          and(
            eq(vacancies.companyId, company.id),
            eq(vacancies.status, "published_verified"),
          ),
        );
    }

    await tx.insert(companyVerifications).values({
      companyId: company.id,
      submittedByUserId: user.id,
      submittedData: {
        identity: nextIdentity,
        identityHash: identityHash(nextIdentity),
        identityChanges,
        operationalChanges: operationalDiff.changes,
        resubmission: company.verificationStatus !== "unverified",
        source: "employer_submission",
        identityChangeConfirmed: confirmIdentityChange,
        submittedAt: new Date().toISOString(),
      },
      evidenceNotes: parsed.data.evidenceNotes,
      status: nextStatus,
    });
  });

  await writeAudit({
    actorUserId: user.id,
    action: "company.verification_submitted",
    entityType: "company",
    entityId: company.id,
    metadata: {
      previousStatus: company.verificationStatus,
      nextStatus,
      identity: nextIdentity,
      identityHash: identityHash(nextIdentity),
      identityChanges,
      operationalChanges: operationalDiff.changes,
      reviewFlag: operationalDiff.material,
      identityChangeConfirmed: confirmIdentityChange,
      verificationVersion: nextVersion,
    },
  });

  revalidatePath("/employer/verification");
  revalidatePath("/employer");
  revalidatePath("/employer/vacancies");
  revalidatePath("/companies");
  revalidatePath(`/companies/${company.slug}`);
  revalidatePath("/companies/[slug]", "page");
  revalidatePath("/jobs");
  revalidatePath("/jobs/[slug]", "page");
  revalidatePath("/dashboard/saved");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/verifications");

  if (identityDiff.legalIdentityChanged) {
    return {
      success:
        "Evidence submitted. Because legal identity changed, completed verification checks were reset. A moderator will review the new evidence.",
    };
  }
  if (identityDiff.classificationChanged) {
    return {
      success: `Evidence submitted. The ${roleCheckLabel(
        nextIdentity.companyType,
      ).toLowerCase()} check was reset; identity verification was preserved.`,
    };
  }
  if (nextStatus === "verified") {
    return {
      success:
        "Evidence updated. Completed verification was preserved and remains visible on your profile.",
    };
  }
  return {
    success:
      "Verification submitted. A moderator reviews the evidence and records a decision. You can keep publishing — unverified vacancies are labelled until checks are complete.",
  };
}

export async function updateCompanyAction(
  _prev: EmployerActionState,
  formData: FormData,
): Promise<EmployerActionState> {
  const ctx = await employerContext();
  if (!ctx) return { error: "Sign in with an employer account." };
  const { user, company } = ctx;
  if (isCompanySuspended(company)) return { error: SUSPENDED_COMPANY_ERROR };

  const parsed = companyProfileSchema.safeParse({
    legalName: formData.get("legalName"),
    tradingName: formData.get("tradingName") ?? "",
    country: formData.get("country"),
    registrationNumber: formData.get("registrationNumber"),
    registeredAddress: formData.get("registeredAddress") ?? "",
    website: formData.get("website") ?? "",
    businessEmail: formData.get("businessEmail") ?? "",
    phone: formData.get("phone") ?? "",
    contactPerson: formData.get("contactPerson") ?? "",
    sectors: formData.get("sectors") ?? "",
    fleetSize: formData.get("fleetSize") || undefined,
    operatesOwnFleet: formData.get("operatesOwnFleet") === "on",
    recruitsDirectly: formData.get("recruitsDirectly") === "on",
    companyType: formData.get("companyType"),
    contractingEntity: formData.get("contractingEntity") ?? "",
    description: formData.get("description") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const data = parsed.data;
  const confirmIdentityChange = formData.get("confirmIdentityChange") === "on";

  const currentIdentity = buildIdentitySnapshot(company);
  const nextIdentity = {
    legalName: data.legalName,
    tradingName: data.tradingName || data.legalName,
    country: data.country.toUpperCase(),
    registrationNumber: data.registrationNumber,
    registeredAddress: data.registeredAddress || null,
    contractingEntity: data.contractingEntity || data.legalName,
    companyType: data.companyType,
    recruitsDirectly: Boolean(data.recruitsDirectly),
  };
  const identityDiff = diffIdentityValues(currentIdentity, nextIdentity);
  const operationalDiff = diffOperationalValues(buildOperationalValues(company), {
    operatesOwnFleet: Boolean(data.operatesOwnFleet),
    fleetSize: data.fleetSize ?? null,
    sectors: splitList(data.sectors),
    website: data.website || null,
    businessEmail: data.businessEmail || null,
    phone: data.phone || null,
    contactPerson: data.contactPerson || null,
    description: data.description || null,
  });

  if (
    requiresIdentityConfirmation(company.verificationStatus, identityDiff) &&
    !confirmIdentityChange
  ) {
    return {
      error: `Changing ${identityDiff.changes
        .map((change) => change.label)
        .join(", ")} will remove your verified badge and require re-verification. Tick the confirmation box to continue.`,
    };
  }

  const resolution = resolveProfileUpdateStatus(
    company.verificationStatus,
    identityDiff,
    company.verificationVersion,
  );
  if (!resolution.ok) return { error: resolution.error };
  const nextStatus = resolution.nextStatus;
  const nextVersion =
    nextStatus === company.verificationStatus
      ? company.verificationVersion
      : nextStatus === "identity_checked" &&
          hasTrustedVerification(company.verificationVersion)
        ? company.verificationVersion
        : 0;

  const [lastVerification] = await db
    .select({ submittedData: companyVerifications.submittedData })
    .from(companyVerifications)
    .where(eq(companyVerifications.companyId, company.id))
    .orderBy(desc(companyVerifications.createdAt))
    .limit(1);
  const lastData = (lastVerification?.submittedData ?? {}) as Record<string, unknown>;
  const lastReviewed = readIdentitySnapshot(lastData.reviewedIdentity ?? lastData.identity);
  const reviewIdentityChanges = diffIdentityValues(
    lastReviewed ?? currentIdentity,
    nextIdentity,
  ).changes;

  await db.transaction(async (tx) => {
    await tx
      .update(companies)
      .set({
        legalName: data.legalName,
        tradingName: data.tradingName || data.legalName,
        country: data.country.toUpperCase(),
        registrationNumber: data.registrationNumber,
        registeredAddress: data.registeredAddress || null,
        website: data.website || null,
        businessEmail: data.businessEmail || null,
        phone: data.phone || null,
        contactPerson: data.contactPerson || null,
        sectors: splitList(data.sectors),
        fleetSize: data.fleetSize ?? null,
        operatesOwnFleet: Boolean(data.operatesOwnFleet),
        recruitsDirectly: Boolean(data.recruitsDirectly),
        companyType: data.companyType,
        contractingEntity: data.contractingEntity || data.legalName,
        description: data.description || null,
        verificationStatus: nextStatus,
        verificationVersion: nextVersion,
        verifiedAt: isFullyVerified(nextStatus, nextVersion)
          ? (company.verifiedAt ?? new Date())
          : null,
        lastVerifiedAt: isFullyVerified(nextStatus, nextVersion)
          ? (company.lastVerifiedAt ?? new Date())
          : null,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, company.id));

    if (!isFullyVerified(nextStatus, nextVersion)) {
      await tx
        .update(vacancies)
        .set({ status: "published_unverified", updatedAt: new Date() })
        .where(
          and(
            eq(vacancies.companyId, company.id),
            eq(vacancies.status, "published_verified"),
          ),
        );
    }

    if (identityDiff.hasChanges) {
      await tx.insert(companyVerifications).values({
        companyId: company.id,
        submittedByUserId: user.id,
        submittedData: {
          identity: nextIdentity,
          identityHash: identityHash(nextIdentity),
          reviewedIdentity: lastReviewed ?? currentIdentity,
          identityChanges: reviewIdentityChanges,
          operationalChanges: operationalDiff.changes,
          source: "company_profile_update",
          identityChangeConfirmed: confirmIdentityChange,
          submittedAt: new Date().toISOString(),
        },
        evidenceNotes:
          "Company profile changed; verification status was recalculated. Review the changed identity fields and the previous values.",
        status: nextStatus,
      });
    }
  });

  await writeAudit({
    actorUserId: user.id,
    action: identityDiff.hasChanges
      ? "company.identity_changed"
      : operationalDiff.changed
        ? "company.operational_change"
        : "company.profile_updated",
    entityType: "company",
    entityId: company.id,
    metadata: {
      companyName: company.legalName,
      previousStatus: company.verificationStatus,
      nextStatus,
      verificationVersion: nextVersion,
      identityChangeConfirmed: confirmIdentityChange,
      before: currentIdentity,
      after: nextIdentity,
      identityChanges: reviewIdentityChanges,
      operationalChanges: operationalDiff.changes,
      reviewFlag: operationalDiff.material,
    },
  });

  revalidatePath("/employer/company");
  revalidatePath("/employer");
  revalidatePath("/employer/verification");
  revalidatePath("/employer/vacancies");
  revalidatePath("/companies");
  revalidatePath(`/companies/${company.slug}`);
  revalidatePath("/companies/[slug]", "page");
  revalidatePath("/jobs");
  revalidatePath("/jobs/[slug]", "page");
  revalidatePath("/dashboard/saved");
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/verifications");

  if (nextStatus !== company.verificationStatus) {
    return {
      success: `Company profile saved. Verification status is now "${nextStatus.replaceAll(
        "_",
        " ",
      )}"; the ${roleCheckLabel(nextIdentity.companyType).toLowerCase()} must be re-checked.`,
    };
  }
  if (operationalDiff.material) {
    return {
      success:
        "Company profile saved. Material operational changes were recorded and flagged for moderator review.",
    };
  }
  return { success: "Company profile saved." };
}

export async function saveVacancyAction(
  _prev: EmployerActionState,
  formData: FormData,
): Promise<EmployerActionState> {
  const ctx = await employerContext();
  if (!ctx) return { error: "Sign in with an employer account." };
  const { user, company } = ctx;
  if (isCompanySuspended(company)) return { error: SUSPENDED_COMPANY_ERROR };

  const parsed = vacancySchema.safeParse({
    title: formData.get("title"),
    city: formData.get("city") ?? "",
    country: formData.get("country"),
    contractingEntity: formData.get("contractingEntity"),
    transportCategory: formData.get("transportCategory"),
    licenceRequirements: formData.get("licenceRequirements") ?? "",
    experienceRequirements: formData.get("experienceRequirements") ?? "",
    contractType: formData.get("contractType"),
    grossPayMin: formData.get("grossPayMin") ?? "",
    grossPayMax: formData.get("grossPayMax") ?? "",
    currency: "EUR",
    payPeriod: formData.get("payPeriod"),
    payStructure: formData.get("payStructure") ?? "",
    allowances: formData.get("allowances") ?? "",
    workingPattern: formData.get("workingPattern") ?? "",
    rotation: formData.get("rotation") ?? "",
    homeTime: formData.get("homeTime") ?? "",
    loadingUnloading: formData.get("loadingUnloading"),
    accommodation: formData.get("accommodation"),
    accommodationDetails: formData.get("accommodationDetails") ?? "",
    weeklyRest: formData.get("weeklyRest") ?? "",
    vehicleType: formData.get("vehicleType") ?? "",
    equipment: formData.get("equipment") ?? "",
    operatingCountries: formData.get("operatingCountries") ?? "",
    languagesRequired: formData.get("languagesRequired") ?? "",
    trainingProvided: formData.get("trainingProvided") ?? "",
    benefits: formData.get("benefits") ?? "",
    applicationMethod: formData.get("applicationMethod"),
    applicationUrl: formData.get("applicationUrl") ?? "",
    applicationEmail: formData.get("applicationEmail") ?? "",
    contactName: formData.get("contactName") ?? "",
    intendToPublish: formData.get("intendToPublish") === "on",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const data = parsed.data;
  const vacancyId = z.string().uuid().safeParse(formData.get("vacancyId"));
  const licenceRequirements = splitList(data.licenceRequirements);
  const allowances = parseAllowances(data.allowances);

  const draft = {
    title: data.title,
    country: data.country,
    contractingEntity: data.contractingEntity,
    transportCategory: data.transportCategory,
    licenceRequirements,
    experienceRequirements: data.experienceRequirements || null,
    contractType: data.contractType,
    grossPayMin: data.grossPayMin,
    grossPayMax: data.grossPayMax,
    currency: data.currency,
    payPeriod: data.payPeriod,
    payStructure: data.payStructure || null,
    allowances,
    workingPattern: data.workingPattern || null,
    rotation: data.rotation || null,
    homeTime: data.homeTime || null,
    loadingUnloading: data.loadingUnloading,
    accommodation: data.accommodation,
    accommodationDetails: data.accommodationDetails || null,
    weeklyRest: data.weeklyRest || null,
    vehicleType: data.vehicleType || null,
    equipment: data.equipment || null,
    operatingCountries: splitList(data.operatingCountries),
    languagesRequired: splitList(data.languagesRequired),
    trainingProvided: data.trainingProvided || null,
    benefits: data.benefits || null,
    applicationMethod: data.applicationMethod,
    applicationUrl: data.applicationUrl || null,
    applicationEmail: data.applicationEmail || null,
    contactName: data.contactName || null,
  } as const;

  const wantsPublish = data.intendToPublish === true;
  if (wantsPublish && !user.emailVerifiedAt) return { error: VERIFY_EMAIL_ERROR };
  const infoScore = computeInfoScore(draft);
  const companyVerified = isFullyVerified(company.verificationStatus, company.verificationVersion);

  let targetId: string | null = null;
  let existingStatus: string | null = null;

  if (vacancyId.success) {
    const [existing] = await db
      .select({ id: vacancies.id, status: vacancies.status })
      .from(vacancies)
      .where(and(eq(vacancies.id, vacancyId.data), eq(vacancies.companyId, company.id)))
      .limit(1);
    if (!existing) return { error: "Vacancy not found for your company." };
    targetId = existing.id;
    existingStatus = existing.status;
  }

  const resolution = resolveVacancySave({
    existingStatus,
    wantsPublish,
    companyVerified,
    draft,
  });
  if (!resolution.ok) return { error: resolution.error };
  const nextStatus = resolution.nextStatus;

  if (vacancyId.success && targetId) {
    const publishingNow = wantsPublish && existingStatus !== "confirmed";
    const firstPublication = existingStatus === "draft" || existingStatus === "expired";

    await db
      .update(vacancies)
      .set({
        ...draft,
        status: nextStatus,
        infoScore,
        updatedAt: new Date(),
        ...(publishingNow
          ? {
              lastConfirmedAt: new Date(),
              reconfirmDueAt: new Date(Date.now() + RECONFIRM_AFTER_DAYS * 24 * 60 * 60 * 1000),
              ...(firstPublication ? { publishedAt: new Date() } : {}),
            }
          : {}),
      })
      .where(eq(vacancies.id, targetId));
  } else {
    const baseSlug = slugify(`${data.title}-${data.city || company.country}`) || "vacancy";
    const [inserted] = await db
      .insert(vacancies)
      .values({
        ...draft,
        companyId: company.id,
        createdByUserId: user.id,
        slug: `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`,
        infoScore,
        status: nextStatus,
        publishedAt: wantsPublish ? new Date() : null,
        lastConfirmedAt: wantsPublish ? new Date() : null,
        reconfirmDueAt: wantsPublish
          ? new Date(Date.now() + RECONFIRM_AFTER_DAYS * 24 * 60 * 60 * 1000)
          : null,
      })
      .returning({ id: vacancies.id });
    targetId = inserted.id;
  }

  await writeAudit({
    actorUserId: user.id,
    action: vacancyId.success ? "vacancy.updated" : "vacancy.created",
    entityType: "vacancy",
    entityId: targetId,
    metadata: { published: wantsPublish, status: nextStatus, infoScore },
  });

  revalidateEmployerSurfaces();
  revalidatePath("/employer/enquiries");
  redirect("/employer/vacancies");
}

export async function publishVacancyAction(formData: FormData): Promise<void> {
  const ctx = await employerContext();
  if (!ctx) redirect("/login");
  const { user, company } = ctx;
  if (!user.emailVerifiedAt) redirect("/verify-email?required=1");
  if (isCompanySuspended(company)) return;

  const vacancyId = z.string().uuid().safeParse(formData.get("vacancyId"));
  if (!vacancyId.success) return;

  const [vacancy] = await db
    .select()
    .from(vacancies)
    .where(and(eq(vacancies.id, vacancyId.data), eq(vacancies.companyId, company.id)))
    .limit(1);
  if (!vacancy) return;

  const companyVerified = isFullyVerified(company.verificationStatus, company.verificationVersion);

  const transition = resolveVacancyTransition({
    currentStatus: vacancy.status,
    transition: "publish",
    draft: vacancy,
    companyVerified,
  });
  if (!transition.ok) {
    redirect(`/employer/vacancies/${vacancy.id}/edit?error=transition`);
  }

  await db
    .update(vacancies)
    .set({
      status: transition.nextStatus,
      infoScore: computeInfoScore(vacancy),
      publishedAt: vacancy.publishedAt ?? new Date(),
      lastConfirmedAt: new Date(),
      reconfirmDueAt: new Date(Date.now() + RECONFIRM_AFTER_DAYS * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(vacancies.id, vacancy.id));

  await writeAudit({
    actorUserId: user.id,
    action: "vacancy.published",
    entityType: "vacancy",
    entityId: vacancy.id,
    metadata: { verifiedCompany: companyVerified },
  });

  revalidateEmployerSurfaces();
  revalidatePath(`/jobs/${vacancy.slug}`);
}

export async function reconfirmVacancyAction(formData: FormData): Promise<void> {
  const ctx = await employerContext();
  if (!ctx) redirect("/login");
  const { user, company } = ctx;
  if (isCompanySuspended(company)) return;

  const vacancyId = z.string().uuid().safeParse(formData.get("vacancyId"));
  if (!vacancyId.success) return;

  const [vacancy] = await db
    .select()
    .from(vacancies)
    .where(and(eq(vacancies.id, vacancyId.data), eq(vacancies.companyId, company.id)))
    .limit(1);
  if (!vacancy) return;

  const companyVerified = isFullyVerified(company.verificationStatus, company.verificationVersion);

  const transition = resolveVacancyTransition({
    currentStatus: vacancy.status,
    transition: "reconfirm",
    draft: vacancy,
    companyVerified,
  });
  if (!transition.ok) {
    redirect(`/employer/vacancies/${vacancy.id}/edit?error=transition`);
  }

  await db.transaction(async (tx) => {
    await tx.insert(vacancyReconfirmations).values({
      vacancyId: vacancy.id,
      confirmedByUserId: user.id,
      note: "Employer reconfirmed vacancy is open",
    });
    await tx
      .update(vacancies)
      .set({
        status: transition.nextStatus,
        lastConfirmedAt: new Date(),
        reconfirmDueAt: new Date(Date.now() + RECONFIRM_AFTER_DAYS * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(vacancies.id, vacancy.id));
  });

  await writeAudit({
    actorUserId: user.id,
    action: "vacancy.reconfirmed",
    entityType: "vacancy",
    entityId: vacancy.id,
  });

  revalidateEmployerSurfaces();
  revalidatePath(`/jobs/${vacancy.slug}`);
}

export async function expireVacancyAction(formData: FormData): Promise<void> {
  const ctx = await employerContext();
  if (!ctx) redirect("/login");
  const { user, company } = ctx;
  if (isCompanySuspended(company)) return;

  const vacancyId = z.string().uuid().safeParse(formData.get("vacancyId"));
  if (!vacancyId.success) return;

  const [vacancy] = await db
    .select({ id: vacancies.id, slug: vacancies.slug })
    .from(vacancies)
    .where(and(eq(vacancies.id, vacancyId.data), eq(vacancies.companyId, company.id)))
    .limit(1);
  if (!vacancy) return;

  await db
    .update(vacancies)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(vacancies.id, vacancy.id));

  await writeAudit({
    actorUserId: user.id,
    action: "vacancy.expired",
    entityType: "vacancy",
    entityId: vacancy.id,
  });

  revalidateEmployerSurfaces();
  revalidatePath(`/jobs/${vacancy.slug}`);
}

export async function respondToReviewAction(
  _prev: EmployerActionState,
  formData: FormData,
): Promise<EmployerActionState> {
  const ctx = await employerContext();
  if (!ctx) return { error: "Sign in with an employer account." };
  const { user, company } = ctx;

  const parsed = responseSchema.safeParse({
    reviewId: formData.get("reviewId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your response." };
  }

  const [review] = await db
    .select({
      id: driverReviews.id,
      companyId: driverReviews.companyId,
      status: driverReviews.status,
    })
    .from(driverReviews)
    .where(and(eq(driverReviews.id, parsed.data.reviewId), eq(driverReviews.companyId, company.id)))
    .limit(1);
  if (!review) return { error: "Review not found for your company." };
  if (!canEmployerReplyToReview(review.status)) {
    return {
      error: "You can reply only to a published review. This review is still in moderation.",
    };
  }

  const [existing] = await db
    .select({ id: reviewResponses.id })
    .from(reviewResponses)
    .where(eq(reviewResponses.reviewId, review.id))
    .limit(1);
  if (existing) return { error: "You have already responded to this review." };

  await db.insert(reviewResponses).values({
    reviewId: review.id,
    companyId: company.id,
    authorUserId: user.id,
    body: parsed.data.body,
    status: INITIAL_RESPONSE_STATUS,
  });

  await writeAudit({
    actorUserId: user.id,
    action: "review.responded",
    entityType: "review",
    entityId: review.id,
  });

  revalidatePath("/employer/reviews");
  revalidatePath("/admin");
  revalidatePath(`/companies/${company.slug}`);
  return {
    success:
      "Response submitted for moderation. It appears publicly once a moderator approves it.",
  };
}

export async function markEnquiryViewedAction(formData: FormData): Promise<void> {
  const ctx = await employerContext();
  if (!ctx) redirect("/login");
  const { company } = ctx;
  const enquiryId = z.string().uuid().safeParse(formData.get("enquiryId"));
  if (!enquiryId.success) return;

  await db
    .update(enquiries)
    .set({ status: "viewed", employerViewedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(enquiries.id, enquiryId.data), eq(enquiries.companyId, company.id)));

  revalidatePath("/employer/enquiries");
  revalidatePath("/employer");
}

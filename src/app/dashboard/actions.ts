"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  companies,
  contentReports,
  driverProfiles,
  driverReviews,
  enquiries,
  savedCompanies,
  savedVacancies,
  sessions,
  users,
  vacancies,
} from "@/db/schema";
import { getCurrentUser, hashPassword, verifyPassword, currentSessionTokenHash } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  driverProfileSchema,
  enquirySchema,
  passwordChangeSchema,
  reportSchema,
  reviewSchema,
} from "@/lib/validation";
import { ACTIVE_VACANCY_STATUSES } from "@/lib/queries";
import { isCompanySuspended } from "@/lib/company-suspension";

export type ActionState = { error?: string; success?: string } | null;

const VERIFY_EMAIL_ERROR =
  "Confirm your email before using this feature. Open the link sent to your registered address, or request a new one from the confirmation page.";

async function driverOnly() {
  const user = await getCurrentUser();
  if (!user || user.role !== "driver") return null;
  return user;
}

function splitList(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export async function toggleSavedVacancyAction(formData: FormData): Promise<void> {
  const user = await driverOnly();
  if (!user) redirect("/login");
  const vacancyId = z.string().uuid().safeParse(formData.get("vacancyId"));
  if (!vacancyId.success) return;

  const [existing] = await db
    .select({ id: savedVacancies.id })
    .from(savedVacancies)
    .where(and(eq(savedVacancies.userId, user.id), eq(savedVacancies.vacancyId, vacancyId.data)))
    .limit(1);

  if (existing) {
    await db.delete(savedVacancies).where(eq(savedVacancies.id, existing.id));
  } else {
    await db.insert(savedVacancies).values({ userId: user.id, vacancyId: vacancyId.data });
  }

  const [vacancy] = await db
    .select({ slug: vacancies.slug })
    .from(vacancies)
    .where(eq(vacancies.id, vacancyId.data))
    .limit(1);
  revalidatePath("/dashboard/saved");
  if (vacancy) revalidatePath(`/jobs/${vacancy.slug}`);
}

export async function toggleSavedCompanyAction(formData: FormData): Promise<void> {
  const user = await driverOnly();
  if (!user) redirect("/login");
  const companyId = z.string().uuid().safeParse(formData.get("companyId"));
  if (!companyId.success) return;

  const [existing] = await db
    .select({ id: savedCompanies.id })
    .from(savedCompanies)
    .where(and(eq(savedCompanies.userId, user.id), eq(savedCompanies.companyId, companyId.data)))
    .limit(1);

  if (existing) {
    await db.delete(savedCompanies).where(eq(savedCompanies.id, existing.id));
  } else {
    await db.insert(savedCompanies).values({ userId: user.id, companyId: companyId.data });
  }
  revalidatePath("/dashboard/saved");
  revalidatePath("/dashboard");
}

export async function sendEnquiryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await driverOnly();
  if (!user) return { error: "Sign in as a driver to send an enquiry." };
  if (!user.emailVerifiedAt) return { error: VERIFY_EMAIL_ERROR };

  if (!checkRateLimit(`enquiry:${user.id}`, 10, 60 * 60 * 1000).allowed) {
    return { error: "You have sent several enquiries recently. Please try again later." };
  }

  const parsed = enquirySchema.safeParse({
    vacancyId: formData.get("vacancyId"),
    message: formData.get("message"),
    shareEmail: formData.get("shareEmail") === "on",
    sharePhone: formData.get("sharePhone") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [row] = await db
    .select({ vacancy: vacancies, company: companies })
    .from(vacancies)
    .innerJoin(companies, eq(vacancies.companyId, companies.id))
    .where(eq(vacancies.id, parsed.data.vacancyId))
    .limit(1);

  if (!row) return { error: "This vacancy no longer exists." };
  if (!ACTIVE_VACANCY_STATUSES.includes(row.vacancy.status as (typeof ACTIVE_VACANCY_STATUSES)[number])) {
    return { error: "This vacancy is no longer accepting enquiries." };
  }

  const [profile] = await db
    .select()
    .from(driverProfiles)
    .where(eq(driverProfiles.userId, user.id))
    .limit(1);

  await db.insert(enquiries).values({
    vacancyId: row.vacancy.id,
    companyId: row.company.id,
    driverUserId: user.id,
    method: "platform_message",
    message: parsed.data.message,
    sharedEmail: parsed.data.shareEmail ? profile?.contactEmail ?? user.email : null,
    sharedPhone: parsed.data.sharePhone ? profile?.phone ?? null : null,
  });

  await writeAudit({
    actorUserId: user.id,
    action: "enquiry.sent",
    entityType: "vacancy",
    entityId: row.vacancy.id,
    metadata: { companyId: row.company.id, sharedEmail: Boolean(parsed.data.shareEmail) },
  });

  revalidatePath("/dashboard/applications");
  return {
    success:
      "Enquiry sent. The employer sees your message and only the contact details you chose to share.",
  };
}

export async function submitReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await driverOnly();
  if (!user) return { error: "Sign in as a driver to review an employer." };
  if (!user.emailVerifiedAt) return { error: VERIFY_EMAIL_ERROR };

  if (!checkRateLimit(`review:${user.id}`, 5, 24 * 60 * 60 * 1000).allowed) {
    return { error: "You have submitted several reviews today. Please try again tomorrow." };
  }

  const raw = {
    companyId: formData.get("companyId"),
    jobTitle: formData.get("jobTitle") ?? "",
    employmentStart: formData.get("employmentStart"),
    employmentEnd: formData.get("employmentEnd") ?? "",
    overallRating: formData.get("overallRating"),
    paymentReliability: formData.get("paymentReliability") || undefined,
    advertAccuracy: formData.get("advertAccuracy") || undefined,
    dispatchManagement: formData.get("dispatchManagement") || undefined,
    equipment: formData.get("equipment") || undefined,
    homeTime: formData.get("homeTime") || undefined,
    accommodation: formData.get("accommodation") || undefined,
    deductions: formData.get("deductions") || undefined,
    workingConditions: formData.get("workingConditions") || undefined,
    title: formData.get("title"),
    body: formData.get("body"),
    eligibilityAttested: formData.get("eligibilityAttested"),
    publicationConsent: formData.get("publicationConsent"),
  };

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [company] = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      status: companies.verificationStatus,
      suspendedAt: companies.suspendedAt,
    })
    .from(companies)
    .where(eq(companies.id, parsed.data.companyId))
    .limit(1);
  if (!company) return { error: "Company not found." };
  if (isCompanySuspended({ suspendedAt: company.suspendedAt, verificationStatus: company.status })) {
    return { error: "This company is suspended and cannot be reviewed." };
  }

  const [duplicate] = await db
    .select({ id: driverReviews.id })
    .from(driverReviews)
    .where(
      and(
        eq(driverReviews.companyId, parsed.data.companyId),
        eq(driverReviews.driverUserId, user.id),
        eq(driverReviews.employmentStart, parsed.data.employmentStart),
      ),
    )
    .limit(1);
  if (duplicate) {
    return { error: "You already reviewed this employment period. Contact support to correct it." };
  }

  const rating = (value: number | undefined) => (value && value > 0 ? value : null);

  try {
    await db.insert(driverReviews).values({
      companyId: parsed.data.companyId,
      driverUserId: user.id,
      jobTitle: parsed.data.jobTitle || null,
      employmentStart: parsed.data.employmentStart,
      employmentEnd: parsed.data.employmentEnd,
      overallRating: parsed.data.overallRating,
      paymentReliability: rating(parsed.data.paymentReliability),
      advertAccuracy: rating(parsed.data.advertAccuracy),
      dispatchManagement: rating(parsed.data.dispatchManagement),
      equipment: rating(parsed.data.equipment),
      homeTime: rating(parsed.data.homeTime),
      accommodation: rating(parsed.data.accommodation),
      deductions: rating(parsed.data.deductions),
      workingConditions: rating(parsed.data.workingConditions),
      title: parsed.data.title,
      body: parsed.data.body,
      status: "pending",
      eligibilityAttested: true,
    });
  } catch {
    return { error: "This review could not be saved — you may already have reviewed this period." };
  }

  await writeAudit({
    actorUserId: user.id,
    action: "review.submitted",
    entityType: "company",
    entityId: company.id,
    metadata: { rating: parsed.data.overallRating },
  });

  revalidatePath(`/companies/${company.slug}`);
  revalidatePath("/dashboard/reviews");
  return {
    success:
      "Review submitted for moderation. We check eligibility and evidence, then publish — you will see it under My reviews.",
  };
}

export async function updateDriverProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await driverOnly();
  if (!user) return { error: "Sign in to update your profile." };

  const parsed = driverProfileSchema.safeParse({
    firstName: formData.get("firstName") ?? "",
    countryOfResidence: formData.get("countryOfResidence") ?? "",
    languages: formData.get("languages") ?? "",
    licenceCategories: formData.get("licenceCategories") ?? "",
    code95: formData.get("code95") === "on",
    adrQualified: formData.get("adrQualified") === "on",
    adrClasses: formData.get("adrClasses") ?? "",
    yearsExperience: formData.get("yearsExperience") || undefined,
    transportExperience: formData.get("transportExperience") ?? "",
    preferredCategories: formData.get("preferredCategories") ?? "",
    preferredCountries: formData.get("preferredCountries") ?? "",
    preferredRotation: formData.get("preferredRotation") ?? "",
    availability: formData.get("availability") ?? "",
    phone: formData.get("phone") ?? "",
    contactEmail: formData.get("contactEmail") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const data = parsed.data;
  await db
    .update(driverProfiles)
    .set({
      firstName: data.firstName || null,
      countryOfResidence: data.countryOfResidence || null,
      languages: splitList(data.languages),
      licenceCategories: splitList(data.licenceCategories),
      code95: Boolean(data.code95),
      adrQualified: Boolean(data.adrQualified),
      adrClasses: splitList(data.adrClasses),
      yearsExperience: data.yearsExperience ?? null,
      transportExperience: data.transportExperience || null,
      preferredCategories: splitList(data.preferredCategories),
      preferredCountries: splitList(data.preferredCountries),
      preferredRotation: data.preferredRotation || null,
      availability: data.availability || null,
      phone: data.phone || null,
      contactEmail: data.contactEmail || null,
      // Employer search and contact requests do not exist in this release, so
      // the stored privacy flags are forced to their private values rather than
      // advertising functionality the application cannot deliver.
      profileVisibility: "private",
      isSearchable: false,
      updatedAt: new Date(),
    })
    .where(eq(driverProfiles.userId, user.id));

  await writeAudit({
    actorUserId: user.id,
    action: "profile.updated",
    entityType: "driver_profile",
    entityId: user.id,
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard");
  return { success: "Profile saved. Your contact details remain private unless you share them." };
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to change your password." };

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const [record] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!record) return { error: "Account not found." };

  if (!(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return { error: "Your current password is incorrect." };
  }

  const currentTokenHash = await currentSessionTokenHash();
  const revokedSessions = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash: await hashPassword(parsed.data.newPassword), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    // Keep the current session (the user just proved the new credential) and
    // revoke every other session issued to this account.
    const removed = await tx
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, user.id),
          currentTokenHash ? ne(sessions.tokenHash, currentTokenHash) : undefined,
        ),
      )
      .returning({ id: sessions.id });

    return removed.length;
  });

  await writeAudit({
    actorUserId: user.id,
    action: "auth.password_changed",
    entityType: "user",
    entityId: user.id,
    metadata: { sessionsRevoked: revokedSessions, currentSessionRetained: Boolean(currentTokenHash) },
  });
  return {
    success:
      revokedSessions > 0
        ? `Password updated. ${revokedSessions} other session${revokedSessions === 1 ? "" : "s"} signed out.`
        : "Password updated. No other sessions were active.",
  };
}

export async function deleteAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DELETE") return { error: 'Type DELETE in the confirmation field.' };

  const [record] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!record || !(await verifyPassword(password, record.passwordHash))) {
    return { error: "Password is incorrect." };
  }

  if (user.role === "employer") {
    const [company] = await db.select().from(companies).where(eq(companies.ownerUserId, user.id)).limit(1);
    if (company) {
      return {
        error:
          "Employer accounts cannot be deleted while a company profile is attached. Contact support to transfer or close the company first.",
      };
    }
  }

  await writeAudit({
    actorUserId: user.id,
    action: "account.deleted",
    entityType: "user",
    entityId: user.id,
    metadata: { role: user.role },
  });
  await db.delete(users).where(eq(users.id, user.id));
  redirect("/?deleted=1");
}

export async function reportContentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  const parsed = reportSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    reason: formData.get("reason"),
    details: formData.get("details") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Choose a reason and try again." };
  }

  const key = user ? `report:${user.id}` : "report:anon";
  if (!checkRateLimit(key, 5, 24 * 60 * 60 * 1000).allowed) {
    return { error: "Too many reports submitted. Please try again tomorrow." };
  }

  await db.insert(contentReports).values({
    reporterUserId: user?.id ?? null,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  await writeAudit({
    actorUserId: user?.id ?? null,
    action: "report.created",
    entityType: parsed.data.targetType,
    entityId: parsed.data.targetId,
    metadata: { reason: parsed.data.reason },
  });

  return { success: "Report received. A moderator will review it — you do not need to do anything else." };
}

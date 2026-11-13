"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  auditLogs,
  companies,
  companyVerifications,
  contentReports,
  driverReviews,
  reviewResponses,
  sessions,
  users,
  vacancies,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import {
  buildIdentitySnapshot,
  isFullyVerified,
  readIdentitySnapshot,
  resolveVerificationTransition,
  type VerificationOutcome,
} from "@/lib/verification";
import { identityHash } from "@/lib/verification-hash";
import { isCompanySuspended, resolveVacancyRestoration } from "@/lib/company-suspension";
import { checkPublishable, LIVE_VACANCY_STATUSES } from "@/lib/vacancy";
import { resolveReviewModerationTransition, readReviewPublicationEvidence } from "@/lib/reviews";
import {
  getRecordedVacancyPreviousStatus,
} from "@/lib/admin-queries";
import { resolveVacancyModerationTransition } from "@/lib/vacancy-moderation";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" || !user.emailVerifiedAt) return null;
  return user;
}

const decisionSchema = z.object({
  companyId: z.string().uuid(),
  outcome: z.enum(["identity_checked", "direct_employer_checked", "verified", "needs_information", "rejected"]),
  notes: z.string().trim().min(10, "Record your reasoning").max(2000),
});

export async function decideVerificationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const parsed = decisionSchema.safeParse({
    companyId: formData.get("companyId"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) redirect("/admin/verifications?error=invalid");
  const { companyId, outcome, notes } = parsed.data;

  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) redirect("/admin/verifications?error=not_found");
  if (isCompanySuspended(company)) {
    await writeAudit({
      actorUserId: admin.id,
      action: "admin.verification_decision_blocked",
      entityType: "company",
      entityId: companyId,
      metadata: {
        reason: "company_suspended",
        previousStatus: company.verificationStatus,
        requestedOutcome: outcome,
      },
    });
    redirect("/admin/verifications?error=suspended");
  }

  const transition = resolveVerificationTransition({
    currentStatus: company.verificationStatus,
    outcome: outcome as VerificationOutcome,
  });
  if (!transition.ok) {
    await writeAudit({
      actorUserId: admin.id,
      action: "admin.verification_decision_blocked",
      entityType: "company",
      entityId: companyId,
      metadata: {
        reason: "invalid_transition",
        previousStatus: company.verificationStatus,
        requestedOutcome: outcome,
      },
    });
    redirect("/admin/verifications?error=transition");
  }

  const [latest] = await db
    .select()
    .from(companyVerifications)
    .where(eq(companyVerifications.companyId, companyId))
    .orderBy(desc(companyVerifications.createdAt))
    .limit(1);

  const latestData = (latest?.submittedData ?? {}) as Record<string, unknown>;
  const submittedIdentity = readIdentitySnapshot(
    latestData.identity ?? latestData.reviewedIdentity,
  );
  const currentIdentity = buildIdentitySnapshot(company);
  const identityMatches =
    submittedIdentity !== null &&
    identityHash(submittedIdentity) === identityHash(currentIdentity);
  const isAdvance =
    outcome === "identity_checked" ||
    outcome === "direct_employer_checked" ||
    outcome === "verified";

  if (isAdvance && !identityMatches) {
    await writeAudit({
      actorUserId: admin.id,
      action: "admin.verification_decision_blocked",
      entityType: "company",
      entityId: companyId,
      metadata: {
        reason: "identity_mismatch",
        previousStatus: company.verificationStatus,
        requestedOutcome: outcome,
        submittedIdentity,
        currentIdentity,
      },
    });
    redirect("/admin/verifications?error=identity_mismatch");
  }

  const now = new Date();
  const nextStatus = transition.nextStatus;
  const nextVersion = isAdvance
    ? 1
    : transition.decision === "rejected"
      ? 0
      : company.verificationVersion;
  const nextFullyVerified = isFullyVerified(nextStatus, nextVersion);

  await db.transaction(async (tx) => {
    await tx
      .update(companies)
      .set({
        verificationStatus: nextStatus,
        verificationVersion: nextVersion,
        verifiedAt: nextFullyVerified ? now : null,
        lastVerifiedAt: nextFullyVerified ? now : null,
        verificationNotes: notes,
        updatedAt: now,
      })
      .where(eq(companies.id, companyId));

    const reviewedData = {
      ...latestData,
      reviewedIdentity: currentIdentity,
      identityHash: identityHash(currentIdentity),
      reviewedAt: now.toISOString(),
      reviewedByUserId: admin.id,
    };

    if (latest) {
      await tx
        .update(companyVerifications)
        .set({
          status: nextStatus,
          decision: transition.decision,
          reviewerId: admin.id,
          reviewedAt: now,
          decisionNotes: notes,
          submittedData: reviewedData,
        })
        .where(eq(companyVerifications.id, latest.id));
    } else {
      await tx.insert(companyVerifications).values({
        companyId,
        status: nextStatus,
        decision: transition.decision,
        reviewerId: admin.id,
        reviewedAt: now,
        decisionNotes: notes,
        evidenceNotes: "Decision recorded without a prior online submission.",
        submittedData: reviewedData,
      });
    }

    // The final trusted badge, and only that badge, promotes live vacancies.
    if (nextFullyVerified) {
      await tx
        .update(vacancies)
        .set({ status: "published_verified", updatedAt: now })
        .where(
          and(
            eq(vacancies.companyId, companyId),
            eq(vacancies.status, "published_unverified"),
          ),
        );
    } else {
      await tx
        .update(vacancies)
        .set({ status: "published_unverified", updatedAt: now })
        .where(
          and(
            eq(vacancies.companyId, companyId),
            eq(vacancies.status, "published_verified"),
          ),
        );
    }
  });

  await writeAudit({
    actorUserId: admin.id,
    action: "admin.verification_decision",
    entityType: "company",
    entityId: companyId,
    metadata: {
      previousStatus: company.verificationStatus,
      nextStatus,
      verificationVersion: nextVersion,
      outcome,
      decision: transition.decision,
      notes,
      identity: currentIdentity,
      identityHash: identityHash(currentIdentity),
      identityMatches,
    },
  });

  revalidatePath("/admin/verifications");
  revalidatePath("/admin");
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
}

const reviewModerationSchema = z.object({
  reviewId: z.string().uuid(),
  outcome: z.enum(["publish", "reject", "remove", "under_review"]),
  notes: z.string().trim().min(10, "Record your reasoning").max(2000),
});

export async function moderateReviewAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const parsed = reviewModerationSchema.safeParse({
    reviewId: formData.get("reviewId"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return;

  const [review] = await db
    .select()
    .from(driverReviews)
    .where(eq(driverReviews.id, parsed.data.reviewId))
    .limit(1);
  if (!review) return;

  // `moderatedAt` alone is not proof that a review was never published. Only
  // recorded transitions can establish publication history.
  const moderationEvents = await db
    .select({ metadata: auditLogs.metadata })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.action, "admin.review_moderation"),
        eq(auditLogs.entityType, "review"),
        eq(auditLogs.entityId, review.id),
      ),
    );

  const evidence = readReviewPublicationEvidence(moderationEvents);

  const transition = resolveReviewModerationTransition(
    {
      status: review.status,
      publishedAt: review.publishedAt,
      moderatedAt: review.moderatedAt,
      evidence,
    },
    parsed.data.outcome,
  );

  if (!transition.ok) {
    await writeAudit({
      actorUserId: admin.id,
      action: "admin.review_moderation_blocked",
      entityType: "review",
      entityId: review.id,
      metadata: {
        reason: transition.reason,
        previousStatus: review.status,
        requestedOutcome: parsed.data.outcome,
        publishedAt: review.publishedAt?.toISOString() ?? null,
        moderatedAt: review.moderatedAt?.toISOString() ?? null,
        evidence,
        notes: parsed.data.notes,
      },
    });
    revalidatePath("/admin/reviews");
    revalidatePath("/admin");
    redirect(`/admin/reviews?error=${transition.reason}`);
  }

  const now = new Date();
  await db
    .update(driverReviews)
    .set({
      status: transition.nextStatus,
      moderationNotes: parsed.data.notes,
      moderatedByUserId: admin.id,
      moderatedAt: now,
      publishedAt:
        transition.nextStatus === "published" ? (review.publishedAt ?? now) : review.publishedAt,
      updatedAt: now,
    })
    .where(eq(driverReviews.id, review.id));

  await writeAudit({
    actorUserId: admin.id,
    action: "admin.review_moderation",
    entityType: "review",
    entityId: review.id,
    metadata: {
      previousStatus: review.status,
      nextStatus: transition.nextStatus,
      outcome: parsed.data.outcome,
      firstPublication: transition.firstPublication,
      publishedAt: review.publishedAt?.toISOString() ?? null,
      notes: parsed.data.notes,
    },
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  revalidatePath("/companies/[slug]", "page");
  revalidatePath("/dashboard/reviews");

  const [company] = await db
    .select({ slug: companies.slug })
    .from(companies)
    .where(eq(companies.id, review.companyId))
    .limit(1);
  if (company) {
    revalidatePath(`/companies/${company.slug}`);
    revalidatePath(`/companies/${company.slug}/reviews`);
  }
}

const responseModerationSchema = z.object({
  responseId: z.string().uuid(),
  outcome: z.enum(["publish", "reject"]),
  notes: z.string().trim().min(10, "Record your reasoning").max(2000),
});

export async function moderateResponseAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const parsed = responseModerationSchema.safeParse({
    responseId: formData.get("responseId"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return;

  const [response] = await db
    .select()
    .from(reviewResponses)
    .where(eq(reviewResponses.id, parsed.data.responseId))
    .limit(1);
  if (!response || response.status !== "pending") return;

  await db
    .update(reviewResponses)
    .set({
      status: parsed.data.outcome === "publish" ? "published" : "rejected",
      updatedAt: new Date(),
    })
    .where(eq(reviewResponses.id, response.id));

  await writeAudit({
    actorUserId: admin.id,
    action: `admin.review_response_${parsed.data.outcome}`,
    entityType: "review_response",
    entityId: response.id,
    metadata: {
      previousStatus: response.status,
      nextStatus: parsed.data.outcome === "publish" ? "published" : "rejected",
      notes: parsed.data.notes,
      reviewId: response.reviewId,
    },
  });

  const [company] = await db
    .select({ slug: companies.slug })
    .from(companies)
    .where(eq(companies.id, response.companyId))
    .limit(1);

  revalidatePath("/admin");
  revalidatePath("/employer/reviews");
  if (company) {
    revalidatePath(`/companies/${company.slug}`);
    revalidatePath(`/companies/${company.slug}/reviews`);
  }
}

const companySuspensionSchema = z.object({
  companyId: z.string().uuid(),
  outcome: z.enum(["suspend", "restore"]),
  reason: z
    .string()
    .trim()
    .min(10, "Record a reason of at least 10 characters")
    .max(1000, "Keep the reason under 1,000 characters"),
});

export async function setCompanySuspensionAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const parsed = companySuspensionSchema.safeParse({
    companyId: formData.get("companyId"),
    outcome: formData.get("outcome"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return;

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, parsed.data.companyId))
    .limit(1);
  if (!company) return;

  if (parsed.data.outcome === "suspend") {
    if (isCompanySuspended(company)) return;

    const liveVacancies = await db
      .select({ id: vacancies.id, status: vacancies.status })
      .from(vacancies)
      .where(
        and(
          eq(vacancies.companyId, company.id),
          inArray(vacancies.status, [...LIVE_VACANCY_STATUSES]),
        ),
      );

    await db.transaction(async (tx) => {
      await tx
        .update(companies)
        .set({
          suspendedAt: new Date(),
          suspensionReason: parsed.data.reason,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, company.id));

      if (liveVacancies.length > 0) {
        await tx
          .update(vacancies)
          .set({
            suspendedFromStatus: sql`${vacancies.status}`,
            status: "suspended",
            updatedAt: new Date(),
          })
          .where(inArray(vacancies.id, liveVacancies.map((row) => row.id)));
      }
    });

    await writeAudit({
      actorUserId: admin.id,
      action: "admin.company_suspended",
      entityType: "company",
      entityId: company.id,
      metadata: {
        reason: parsed.data.reason,
        previousVerificationStatus: company.verificationStatus,
        suspendedVacancies: liveVacancies.length,
        vacancyIds: liveVacancies.map((row) => row.id),
      },
    });
  } else {
    if (!isCompanySuspended(company)) return;

    const suspendedVacancies = await db
      .select()
      .from(vacancies)
      .where(
        and(
          eq(vacancies.companyId, company.id),
          eq(vacancies.status, "suspended"),
          isNotNull(vacancies.suspendedFromStatus),
        ),
      );

    const nextCompanyStatus =
      company.verificationStatus === "suspended" ? "unverified" : company.verificationStatus;
    const nextVersion = nextCompanyStatus === "verified" ? company.verificationVersion : 0;
    const restored: Array<{ id: string; from: string; to: string }> = [];

    for (const vacancy of suspendedVacancies) {
      const publishable = checkPublishable(vacancy).ok;
      const nextStatus = resolveVacancyRestoration({
        currentStatus: vacancy.status,
        previousStatus: vacancy.suspendedFromStatus,
        publishable,
        companyStatus: nextCompanyStatus,
        companyVerificationVersion: nextVersion,
      });
      restored.push({ id: vacancy.id, from: vacancy.status, to: nextStatus });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(companies)
        .set({
          suspendedAt: null,
          suspensionReason: null,
          verificationStatus: nextCompanyStatus,
          verificationVersion: nextVersion,
          verifiedAt: nextCompanyStatus === "verified" ? company.verifiedAt : null,
          lastVerifiedAt: nextCompanyStatus === "verified" ? company.lastVerifiedAt : null,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, company.id));

      for (const item of restored) {
        await tx
          .update(vacancies)
          .set({
            status: item.to as typeof vacancies.status.enumValues[number],
            suspendedFromStatus: null,
            updatedAt: new Date(),
          })
          .where(eq(vacancies.id, item.id));
      }
    });

    await writeAudit({
      actorUserId: admin.id,
      action: "admin.company_restored",
      entityType: "company",
      entityId: company.id,
      metadata: {
        reason: parsed.data.reason,
        previousVerificationStatus: company.verificationStatus,
        nextVerificationStatus: nextCompanyStatus,
        restoredVacancies: restored.length,
        vacancies: restored,
        legacySuspensionDowngraded: company.verificationStatus === "suspended",
      },
    });
  }

  revalidatePath("/admin/companies");
  revalidatePath("/admin");
  revalidatePath("/admin/verifications");
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
}

export async function setVacancyModerationAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const schema = z.object({
    vacancyId: z.string().uuid(),
    outcome: z.enum(["suspend", "restore", "expire"]),
    notes: z.string().trim().max(2000).optional(),
  });
  const parsed = schema.safeParse({
    vacancyId: formData.get("vacancyId"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return;

  const [vacancy] = await db
    .select()
    .from(vacancies)
    .where(eq(vacancies.id, parsed.data.vacancyId))
    .limit(1);
  if (!vacancy) return;

  const [company] = await db
    .select({
      verificationStatus: companies.verificationStatus,
      verificationVersion: companies.verificationVersion,
      suspendedAt: companies.suspendedAt,
    })
    .from(companies)
    .where(eq(companies.id, vacancy.companyId))
    .limit(1);

  // Individual suspensions leave suspended_from_status null so a company
  // restoration cannot revive them; the prior state comes from the audit trail.
  const recordedPreviousStatus = await getRecordedVacancyPreviousStatus(vacancy.id);

  const context = {
    currentStatus: vacancy.status,
    suspendedFromStatus: vacancy.suspendedFromStatus,
    recordedPreviousStatus,
    companySuspended: company ? isCompanySuspended(company) : false,
    companyVerificationStatus: company?.verificationStatus ?? "unverified",
    companyVerificationVersion: company?.verificationVersion ?? 0,
    publishability: checkPublishable(vacancy),
    reconfirmationOverdue: vacancy.reconfirmDueAt
      ? vacancy.reconfirmDueAt.getTime() < Date.now()
      : false,
  };

  const transition = resolveVacancyModerationTransition(context, parsed.data.outcome);

  if (!transition.ok) {
    await writeAudit({
      actorUserId: admin.id,
      action: "admin.vacancy_moderation_blocked",
      entityType: "vacancy",
      entityId: vacancy.id,
      metadata: {
        reason: transition.reason,
        requestedOutcome: parsed.data.outcome,
        previousStatus: vacancy.status,
        suspendedFromStatus: vacancy.suspendedFromStatus,
        recordedPreviousStatus,
        companySuspended: context.companySuspended,
        missing: transition.missing ?? [],
        notes: parsed.data.notes ?? "",
      },
    });
    revalidatePath("/admin/vacancies");
    revalidatePath("/admin");
    redirect(`/admin/vacancies?error=${transition.reason}`);
  }

  await db
    .update(vacancies)
    .set({
      status: transition.nextStatus,
      suspendedFromStatus: null,
      moderationNote: parsed.data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(vacancies.id, vacancy.id));

  await writeAudit({
    actorUserId: admin.id,
    action: `admin.vacancy_${parsed.data.outcome}`,
    entityType: "vacancy",
    entityId: vacancy.id,
    metadata: {
      requestedOutcome: parsed.data.outcome,
      previousStatus: vacancy.status,
      nextStatus: transition.nextStatus,
      restoredFromStatus: parsed.data.outcome === "restore" ? transition.previousStatus : null,
      resolvedFrom: vacancy.suspendedFromStatus ? "company_suspension" : recordedPreviousStatus ? "individual_suspension" : "current_status",
      companyId: vacancy.companyId,
      notes: parsed.data.notes ?? "",
    },
  });

  revalidatePath("/admin/vacancies");
  revalidatePath("/admin");
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${vacancy.slug}`);
  revalidatePath("/companies/[slug]", "page");
  revalidatePath("/");
}

export async function resolveReportAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const schema = z.object({
    reportId: z.string().uuid(),
    outcome: z.enum(["resolved", "dismissed", "investigating"]),
    notes: z.string().trim().max(2000).optional(),
  });
  const parsed = schema.safeParse({
    reportId: formData.get("reportId"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) return;

  const [report] = await db
    .select({ id: contentReports.id, status: contentReports.status })
    .from(contentReports)
    .where(eq(contentReports.id, parsed.data.reportId))
    .limit(1);
  if (!report) return;

  if (report.status === "resolved" || report.status === "dismissed") {
    await writeAudit({
      actorUserId: admin.id,
      action: "admin.report_moderation_blocked",
      entityType: "report",
      entityId: report.id,
      metadata: {
        reason: "terminal_state",
        previousStatus: report.status,
        requestedOutcome: parsed.data.outcome,
        notes: parsed.data.notes ?? "",
      },
    });
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    redirect("/admin/reports?error=terminal_state");
  }

  await db
    .update(contentReports)
    .set({
      status: parsed.data.outcome,
      resolutionNotes: parsed.data.notes || null,
      handledByUserId: admin.id,
      handledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contentReports.id, report.id));

  await writeAudit({
    actorUserId: admin.id,
    action: `admin.report_${parsed.data.outcome}`,
    entityType: "report",
    entityId: report.id,
    metadata: {
      previousStatus: report.status,
      nextStatus: parsed.data.outcome,
      notes: parsed.data.notes ?? "",
    },
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function setUserActiveAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  if (!admin) return;

  const schema = z.object({
    userId: z.string().uuid(),
    outcome: z.enum(["suspend", "restore"]),
    reason: z.string().trim().max(500).optional(),
  });
  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    outcome: formData.get("outcome"),
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) return;
  if (parsed.data.userId === admin.id) return;

  const [target] = await db
    .select({ id: users.id, isActive: users.isActive, suspendedReason: users.suspendedReason })
    .from(users)
    .where(eq(users.id, parsed.data.userId))
    .limit(1);
  if (!target) return;

  const suspend = parsed.data.outcome === "suspend";
  const nextReason = suspend
    ? parsed.data.reason || "Suspended by administrator"
    : null;

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        isActive: !suspend,
        suspendedReason: nextReason,
        updatedAt: new Date(),
      })
      .where(eq(users.id, target.id));

    // A suspension must not leave previously issued sessions usable. The
    // session lookup already rejects inactive users; deleting the rows removes
    // the credential itself.
    if (suspend) {
      await tx.delete(sessions).where(eq(sessions.userId, target.id));
    }
  });

  await writeAudit({
    actorUserId: admin.id,
    action: `admin.user_${parsed.data.outcome}`,
    entityType: "user",
    entityId: target.id,
    metadata: {
      reason: parsed.data.reason ?? "",
      previousActive: target.isActive,
      previousSuspendedReason: target.suspendedReason,
      nextActive: !suspend,
      sessionsInvalidated: suspend,
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

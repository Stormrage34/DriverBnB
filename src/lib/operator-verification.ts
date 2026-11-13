import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/db/schema";

export type OperatorVerificationMode = "admin_bootstrap" | "pilot";

export type OperatorVerificationInput = {
  email: string;
  operator: string;
  reason: string;
  mode: OperatorVerificationMode;
};

export type OperatorVerificationResult =
  | { ok: true; userId: string; email: string; role: string }
  | { ok: false; error: string };

/**
 * Controlled operator verification for the existing administrator bootstrap and
 * the invite-only pilot cohort. This is intentionally not a server action and
 * must never be exposed over HTTP. Callers must have independently confirmed
 * control of the mailbox; the audit record names the operator and reason.
 */
export async function operatorVerifyUserEmail(
  input: OperatorVerificationInput,
): Promise<OperatorVerificationResult> {
  const email = input.email.trim().toLowerCase();
  const operator = input.operator.trim();
  const reason = input.reason.trim();

  if (!email || !email.includes("@")) return { ok: false, error: "A valid target email is required." };
  if (operator.length < 2) return { ok: false, error: "Operator identity is required." };
  if (reason.length < 20) {
    return { ok: false, error: "Record a reason of at least 20 characters." };
  }

  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) return { ok: false as const, error: "No account exists for that exact email address." };
    if (user.emailVerifiedAt) {
      return { ok: false as const, error: "That account is already email-verified." };
    }
    if (input.mode === "admin_bootstrap" && user.role !== "admin") {
      return {
        ok: false as const,
        error: "Admin bootstrap only targets an existing account with the administrator role.",
      };
    }
    if (input.mode === "pilot" && user.role === "admin") {
      return {
        ok: false as const,
        error: "Administrator accounts must use the admin bootstrap procedure, not pilot verification.",
      };
    }

    const now = new Date();
    await tx
      .update(users)
      .set({ emailVerifiedAt: now, updatedAt: now })
      .where(eq(users.id, user.id));

    await tx.insert(auditLogs).values({
      actorUserId: null,
      action: "user.email_verified_operator",
      entityType: "user",
      entityId: user.id,
      metadata: {
        method: input.mode,
        actor: "operator_cli",
        operator,
        reason,
        targetEmail: user.email,
        targetRole: user.role,
        verifiedAt: now.toISOString(),
      },
      ipAddress: "operator-cli",
    });

    return { ok: true as const, userId: user.id, email: user.email, role: user.role };
  });
}

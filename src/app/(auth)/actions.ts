"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, companySubscriptions, contactMessages, driverProfiles, users } from "@/db/schema";
import {
  createSession,
  createUser,
  destroySession,
  findUserByEmail,
  hashPassword,
  requestContext,
  verifyPassword,
} from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import {
  emailVerificationSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  registerDriverSchema,
  registerEmployerSchema,
  resendVerificationSchema,
} from "@/lib/validation";
import { slugify, uniqueSlug } from "@/lib/utils";
import { safeNextPath, HOME_BY_ROLE } from "@/lib/guards";
import { issueUserToken, resetPasswordWithToken, verifyEmailWithToken } from "@/lib/user-tokens";
import { passwordResetEmail, sendAccountEmail, verificationEmail } from "@/lib/email";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: string;
} | null;

function flatten(error: unknown): Record<string, string[]> {
  // Zod v4 exposes flatten(); keep the shape stable for form rendering.
  const err = error as { flatten?: () => { fieldErrors: Record<string, string[] | undefined> } };
  const fieldErrors = err.flatten?.().fieldErrors ?? {};
  const cleaned: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fieldErrors)) {
    if (value && value.length) cleaned[key] = value;
  }
  return cleaned;
}

async function sendVerificationEmailFor(
  userId: string,
  email: string,
  displayName: string,
): Promise<void> {
  try {
    const issued = await issueUserToken(userId, "email_verification");
    const delivery = await sendAccountEmail(
      verificationEmail({ email, displayName }, issued.token),
    );
    await writeAudit({
      actorUserId: userId,
      action: "auth.verification_sent",
      entityType: "user",
      entityId: userId,
      metadata: { delivered: delivery.delivered, provider: delivery.provider, source: "registration" },
    });
  } catch {
    // Registration remains valid; the user can request a new link.
  }
}

function verificationRedirect(formData: FormData): string {
  const next = safeNextPath(formData.get("next"));
  return `/verify-email?sent=1${next ? `&next=${encodeURIComponent(next)}` : ""}`;
}

export async function registerDriverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ip } = await requestContext();
  const limit = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return { error: "Too many registration attempts. Try again later." };

  const parsed = registerDriverSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    country: formData.get("country") ?? "",
    acceptTerms: formData.get("acceptTerms"),
  });

  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    // Generic anti-enumeration response. Do not disclose that the address is
    // already registered, and never create a second account.
    if (!existing.emailVerifiedAt && existing.isActive && !existing.suspendedReason) {
      await sendVerificationEmailFor(existing.id, existing.email, existing.displayName);
    }
    redirect(verificationRedirect(formData));
  }

  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      const passwordHash = await hashPassword(parsed.data.password);
      const [user] = await tx
        .insert(users)
        .values({
          email: parsed.data.email,
          passwordHash,
          displayName: parsed.data.displayName,
          role: "driver",
        })
        .returning({ id: users.id });

      await tx.insert(driverProfiles).values({
        userId: user.id,
        firstName: parsed.data.displayName.split(" ")[0] ?? null,
        countryOfResidence: parsed.data.country || null,
      });
      return user.id;
    });
  } catch {
    return { error: "We could not create your account. Please try again." };
  }

  await createSession(userId);
  await writeAudit({ actorUserId: userId, action: "auth.register", entityType: "user", entityId: userId });
  await sendVerificationEmailFor(userId, parsed.data.email, parsed.data.displayName);
  redirect(verificationRedirect(formData));
}

export async function registerEmployerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ip } = await requestContext();
  const limit = checkRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return { error: "Too many registration attempts. Try again later." };

  const parsed = registerEmployerSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    companyLegalName: formData.get("companyLegalName"),
    companyCountry: formData.get("companyCountry"),
    companyRegistrationNumber: formData.get("companyRegistrationNumber"),
    companyType: formData.get("companyType"),
    companyWebsite: formData.get("companyWebsite") ?? "",
    acceptTerms: formData.get("acceptTerms"),
  });

  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const existing = await findUserByEmail(parsed.data.email);
  if (existing) {
    // Generic anti-enumeration response; never create a second account.
    if (!existing.emailVerifiedAt && existing.isActive && !existing.suspendedReason) {
      await sendVerificationEmailFor(existing.id, existing.email, existing.displayName);
    }
    redirect(verificationRedirect(formData));
  }

  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      const passwordHash = await hashPassword(parsed.data.password);
      const [user] = await tx
        .insert(users)
        .values({
          email: parsed.data.email,
          passwordHash,
          displayName: parsed.data.displayName,
          role: "employer",
        })
        .returning({ id: users.id });

      const baseSlug = slugify(parsed.data.companyLegalName) || "company";
      const [company] = await tx
        .insert(companies)
        .values({
          ownerUserId: user.id,
          slug: `${baseSlug}-${uniqueSlug("").slice(-5)}`.replace(/-+$/, ""),
          legalName: parsed.data.companyLegalName,
          tradingName: parsed.data.companyLegalName,
          country: parsed.data.companyCountry.toUpperCase(),
          registrationNumber: parsed.data.companyRegistrationNumber,
          website: parsed.data.companyWebsite || null,
          businessEmail: parsed.data.email,
          companyType: parsed.data.companyType,
          contractingEntity: parsed.data.companyLegalName,
          verificationStatus: "unverified",
        })
        .returning({ id: companies.id });

      await tx.insert(companySubscriptions).values({ companyId: company.id, plan: "basic" });
      return user.id;
    });
  } catch {
    return { error: "We could not create your employer account. Please try again." };
  }

  await createSession(userId);
  await writeAudit({ actorUserId: userId, action: "auth.register_employer", entityType: "user", entityId: userId });
  await sendVerificationEmailFor(userId, parsed.data.email, parsed.data.displayName);
  redirect(verificationRedirect(formData));
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ip } = await requestContext();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: flatten(parsed.error) };

  const limit = checkRateLimit(`login:${ip}:${parsed.data.email}`, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { error: `Too many sign-in attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.` };
  }

  const user = await findUserByEmail(parsed.data.email);
  const generic = { error: "Email or password is incorrect." };
  if (!user) return generic;
  if (!user.isActive || user.suspendedReason) {
    return { error: "This account is suspended. Contact support@drivercompass.eu." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return generic;

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  await writeAudit({ actorUserId: user.id, action: "auth.login", entityType: "user", entityId: user.id });

  const next = safeNextPath(formData.get("next"));
  redirect(next ?? HOME_BY_ROLE[user.role]);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function contactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { ip } = await requestContext();
  if (!checkRateLimit(`contact:${ip}`, 4, 60 * 60 * 1000).allowed) {
    return { error: "Too many messages sent. Please try again later." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (name.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || subject.length < 3 || message.length < 20) {
    return { error: "Please complete every field (message at least 20 characters)." };
  }

  await db.insert(contactMessages).values({ name, email, subject, message });
  return { success: "Thank you — your message has been recorded. We reply within two working days." };
}

const GENERIC_VERIFICATION_SENT =
  "If that address belongs to an unverified account, a confirmation link will be sent when email delivery is configured. If no message arrives, contact the pilot team.";
const GENERIC_RESET_SENT =
  "If that address belongs to an account, a reset link will be sent when email delivery is configured. If no message arrives, contact the pilot team.";

export async function resendVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resendVerificationSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { success: GENERIC_VERIFICATION_SENT };

  const { ip } = await requestContext();
  if (!checkRateLimit(`resend-verification:${ip}:${parsed.data.email}`, 3, 15 * 60 * 1000).allowed) {
    return { success: GENERIC_VERIFICATION_SENT };
  }

  const user = await findUserByEmail(parsed.data.email);
  if (user && user.isActive && !user.suspendedReason && !user.emailVerifiedAt) {
    try {
      const issued = await issueUserToken(user.id, "email_verification");
      const delivery = await sendAccountEmail(
        verificationEmail({ email: user.email, displayName: user.displayName }, issued.token),
      );
      await writeAudit({
        actorUserId: user.id,
        action: "auth.verification_sent",
        entityType: "user",
        entityId: user.id,
        metadata: { delivered: delivery.delivered, provider: delivery.provider, source: "resend" },
      });
    } catch {
      // Generic response regardless of delivery outcome.
    }
  }

  return { success: GENERIC_VERIFICATION_SENT };
}

export async function verifyEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ip } = await requestContext();
  if (!checkRateLimit(`verify-email:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return { error: "Too many confirmation attempts. Try again later." };
  }
  const parsed = emailVerificationSchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) {
    return { error: "This confirmation link is invalid or has expired." };
  }

  const verified = await verifyEmailWithToken(parsed.data.token);
  if (!verified) {
    return { error: "This confirmation link is invalid or has expired." };
  }

  await writeAudit({
    actorUserId: verified.userId,
    action: "auth.email_verified",
    entityType: "user",
    entityId: verified.userId,
    metadata: { method: "email_token" },
  });

  return { success: "Email confirmed. You can now use the verified account features." };
}

export async function requestPasswordResetAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { success: GENERIC_RESET_SENT };

  const { ip } = await requestContext();
  if (!checkRateLimit(`password-reset:${ip}:${parsed.data.email}`, 3, 15 * 60 * 1000).allowed) {
    return { success: GENERIC_RESET_SENT };
  }

  const user = await findUserByEmail(parsed.data.email);
  if (user && user.isActive && !user.suspendedReason) {
    try {
      const issued = await issueUserToken(user.id, "password_reset");
      const delivery = await sendAccountEmail(
        passwordResetEmail({ email: user.email, displayName: user.displayName }, issued.token),
      );
      await writeAudit({
        actorUserId: null,
        action: "auth.password_reset_requested",
        entityType: "user",
        entityId: user.id,
        metadata: { delivered: delivery.delivered, provider: delivery.provider },
      });
    } catch {
      // Generic response regardless of delivery outcome.
    }
  }

  return { success: GENERIC_RESET_SENT };
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ip } = await requestContext();
  if (!checkRateLimit(`reset-password:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return { error: "Too many reset attempts. Try again later." };
  }
  const parsed = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const reset = await resetPasswordWithToken(parsed.data.token, passwordHash);
  if (!reset) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  await writeAudit({
    actorUserId: reset.userId,
    action: "auth.password_reset",
    entityType: "user",
    entityId: reset.userId,
    metadata: { sessionsRevoked: reset.revokedSessions, method: "email_token" },
  });

  redirect("/login?reset=1");
}

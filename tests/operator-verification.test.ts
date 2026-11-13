import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/db/schema";
import { operatorVerifyUserEmail } from "@/lib/operator-verification";
import { createUser } from "./helpers/fixtures";
import { ensureTestDatabase, truncateAll } from "./helpers/test-db";

describe("operator email verification", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
  });

  it("bootstraps the exact administrator and records operator attribution", async () => {
    const adminId = await createUser("admin", "bootstrap-admin@test.local", {
      emailVerifiedAt: null,
    });
    const result = await operatorVerifyUserEmail({
      email: "BOOTSTRAP-ADMIN@test.local",
      operator: "Founder",
      reason: "Mailbox control confirmed by out-of-band phone call.",
      mode: "admin_bootstrap",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.userId).toBe(adminId);

    const [user] = await db.select().from(users).where(eq(users.id, adminId));
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);

    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, adminId))
      .limit(1);
    expect(audit.actorUserId).toBeNull();
    expect(audit.action).toBe("user.email_verified_operator");
    expect(audit.metadata).toMatchObject({
      method: "admin_bootstrap",
      actor: "operator_cli",
      operator: "Founder",
      targetEmail: "bootstrap-admin@test.local",
      targetRole: "admin",
    });
  });

  it("refuses non-admin bootstrap, admin pilot, duplicate verification and unknown accounts", async () => {
    const driverId = await createUser("driver", "pilot-driver@test.local", {
      emailVerifiedAt: null,
    });
    const adminId = await createUser("admin", "pilot-admin@test.local", {
      emailVerifiedAt: null,
    });

    const nonAdmin = await operatorVerifyUserEmail({
      email: "pilot-driver@test.local",
      operator: "Founder",
      reason: "Mailbox control confirmed by out-of-band phone call.",
      mode: "admin_bootstrap",
    });
    expect(nonAdmin.ok).toBe(false);

    const adminPilot = await operatorVerifyUserEmail({
      email: "pilot-admin@test.local",
      operator: "Founder",
      reason: "Mailbox control confirmed by out-of-band phone call.",
      mode: "pilot",
    });
    expect(adminPilot.ok).toBe(false);

    const allowed = await operatorVerifyUserEmail({
      email: "pilot-driver@test.local",
      operator: "Founder",
      reason: "Invite-only pilot; mailbox control confirmed out of band.",
      mode: "pilot",
    });
    expect(allowed.ok).toBe(true);

    const duplicate = await operatorVerifyUserEmail({
      email: "pilot-driver@test.local",
      operator: "Founder",
      reason: "Second attempt should not rewrite the audit trail.",
      mode: "pilot",
    });
    expect(duplicate.ok).toBe(false);

    const missing = await operatorVerifyUserEmail({
      email: "nobody@test.local",
      operator: "Founder",
      reason: "Mailbox control confirmed by out-of-band phone call.",
      mode: "pilot",
    });
    expect(missing.ok).toBe(false);

    const stillUnverified = await db.select().from(users).where(eq(users.id, adminId));
    expect(stillUnverified[0].emailVerifiedAt).toBeNull();
    const driver = await db.select().from(users).where(eq(users.id, driverId));
    expect(driver[0].emailVerifiedAt).toBeInstanceOf(Date);
  });
});

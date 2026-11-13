import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, sessions, userTokens, users } from "@/db/schema";
import {
  cleanupUserTokens,
  consumeUserToken,
  issueUserToken,
  resetPasswordWithToken,
  verifyEmailWithToken,
} from "@/lib/user-tokens";
import { hashToken } from "@/lib/token-hash";
import { ensureTestDatabase, truncateAll } from "./helpers/test-db";

describe("user account tokens", () => {
  beforeAll(async () => {
    await ensureTestDatabase();
    await truncateAll();
  });

  afterAll(async () => {
    await truncateAll();
  });

  it("stores only a hash, with the intended expiry and a single live token", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "token-owner@test.local", passwordHash: "x", displayName: "Token Owner" })
      .returning({ id: users.id });

    const first = await issueUserToken(user.id, "email_verification");
    expect(first.token.length).toBeGreaterThan(30);
    expect(first.token).not.toMatch(/[^A-Za-z0-9_-]/);
    expect(first.expiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(first.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 1000);

    const rows = await db.select().from(userTokens).where(eq(userTokens.userId, user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(first.token));
    expect(rows[0].tokenHash).not.toContain(first.token);

    const second = await issueUserToken(user.id, "email_verification");
    const live = await db
      .select()
      .from(userTokens)
      .where(and(eq(userTokens.userId, user.id), isNull(userTokens.consumedAt)));
    expect(live).toHaveLength(1);
    expect(live[0].tokenHash).toBe(hashToken(second.token));

    expect(await consumeUserToken(first.token, "email_verification")).toBeNull();
    expect(await consumeUserToken(second.token, "email_verification")).not.toBeNull();
  });

  it("rejects wrong-purpose, expired, consumed and unknown tokens", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "token-purpose@test.local", passwordHash: "x", displayName: "Purpose" })
      .returning({ id: users.id });

    const issued = await issueUserToken(user.id, "email_verification");
    expect(await consumeUserToken(issued.token, "password_reset")).toBeNull();
    expect(await verifyEmailWithToken("x".repeat(40))).toBeNull();

    await db.insert(userTokens).values({
      userId: user.id,
      purpose: "password_reset",
      tokenHash: hashToken("expired-token-value"),
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(await consumeUserToken("expired-token-value", "password_reset")).toBeNull();
  });

  it("marks email verified once and records no token material in audit logs", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "token-verify@test.local", passwordHash: "x", displayName: "Verify" })
      .returning({ id: users.id });

    const issued = await issueUserToken(user.id, "email_verification");
    const verified = await verifyEmailWithToken(issued.token);
    expect(verified?.userId).toBe(user.id);
    expect(await verifyEmailWithToken(issued.token)).toBeNull();

    const [stored] = await db.select().from(users).where(eq(users.id, user.id));
    expect(stored.emailVerifiedAt).toBeInstanceOf(Date);

    await db.insert(auditLogs).values({
      actorUserId: user.id,
      action: "auth.email_verified",
      entityType: "user",
      entityId: user.id,
      metadata: { method: "email_token" },
    });
    const audits = await db.select().from(auditLogs).where(eq(auditLogs.entityId, user.id));
    expect(JSON.stringify(audits)).not.toContain(issued.token);
  });

  it("resets a password, revokes every session and consumes the token once", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "token-reset@test.local", passwordHash: "old", displayName: "Reset" })
      .returning({ id: users.id });

    await db.insert(sessions).values([
      { userId: user.id, tokenHash: hashToken("session-one"), expiresAt: new Date(Date.now() + 60000) },
      { userId: user.id, tokenHash: hashToken("session-two"), expiresAt: new Date(Date.now() + 60000) },
    ]);

    const issued = await issueUserToken(user.id, "password_reset");
    const result = await resetPasswordWithToken(issued.token, "new-hash");
    expect(result).toEqual({ userId: user.id, revokedSessions: 2 });

    const remaining = await db.select().from(sessions).where(eq(sessions.userId, user.id));
    expect(remaining).toHaveLength(0);
    const [stored] = await db.select().from(users).where(eq(users.id, user.id));
    expect(stored.passwordHash).toBe("new-hash");
    expect(await resetPasswordWithToken(issued.token, "another-hash")).toBeNull();
  });

  it("allows only one concurrent redemption and one concurrent live issuance", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "token-race@test.local", passwordHash: "x", displayName: "Race" })
      .returning({ id: users.id });

    const issued = await issueUserToken(user.id, "email_verification");
    const results = await Promise.all([
      consumeUserToken(issued.token, "email_verification"),
      consumeUserToken(issued.token, "email_verification"),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);

    await db.delete(userTokens).where(eq(userTokens.userId, user.id));
    const issuedPair = await Promise.all([
      issueUserToken(user.id, "email_verification"),
      issueUserToken(user.id, "email_verification"),
    ]);
    const live = await db
      .select()
      .from(userTokens)
      .where(and(eq(userTokens.userId, user.id), isNull(userTokens.consumedAt)));
    expect(live).toHaveLength(1);
    expect(issuedPair.map((pair) => hashToken(pair.token))).toContain(live[0].tokenHash);
  });

  it("cleans up expired and old consumed tokens without deleting a live token", async () => {
    const [user] = await db
      .insert(users)
      .values({ email: "token-cleanup@test.local", passwordHash: "x", displayName: "Cleanup" })
      .returning({ id: users.id });

    const live = await issueUserToken(user.id, "email_verification");
    const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await db.insert(userTokens).values([
      {
        userId: user.id,
        purpose: "password_reset",
        tokenHash: hashToken("expired-cleanup"),
        expiresAt: new Date(Date.now() - 1000),
        createdAt: old,
      },
      {
        userId: user.id,
        purpose: "password_reset",
        tokenHash: hashToken("consumed-cleanup"),
        expiresAt: new Date(Date.now() + 100000),
        consumedAt: old,
        createdAt: old,
      },
    ]);

    const removed = await cleanupUserTokens({ before: new Date(), limit: 1000 });
    expect(removed).toBeGreaterThanOrEqual(2);

    const remaining = await db.select().from(userTokens).where(eq(userTokens.userId, user.id));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tokenHash).toBe(hashToken(live.token));
  });
});

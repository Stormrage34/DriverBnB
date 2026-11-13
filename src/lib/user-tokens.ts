import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, userTokens, users } from "@/db/schema";
import { hashToken } from "@/lib/token-hash";

export type UserTokenPurpose = "email_verification" | "password_reset";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
export const TOKEN_HASH_PATTERN = /^[a-f0-9]{64}$/;

export type IssuedUserToken = {
  token: string;
  expiresAt: Date;
};

function tokenTtl(purpose: UserTokenPurpose): number {
  return purpose === "email_verification"
    ? EMAIL_VERIFICATION_TTL_MS
    : PASSWORD_RESET_TTL_MS;
}

/**
 * Issue a new single-use token. Serialising on the user row prevents two
 * concurrent issuers from creating two live tokens; the partial unique index
 * is the database-level backstop.
 */
export async function issueUserToken(
  userId: string,
  purpose: UserTokenPurpose,
): Promise<IssuedUserToken> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from users where id = ${userId} for update`);

    const now = new Date();
    await tx
      .update(userTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(userTokens.userId, userId),
          eq(userTokens.purpose, purpose),
          isNull(userTokens.consumedAt),
        ),
      );

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + tokenTtl(purpose));

    await tx.insert(userTokens).values({
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return { token, expiresAt };
  });
}

/**
 * Atomically consume a live token. Returns the owning user id only once, even
 * when two requests race. Expired, consumed, unknown and wrong-purpose tokens
 * are indistinguishable to the caller.
 */
export async function consumeUserToken(
  token: string,
  purpose: UserTokenPurpose,
): Promise<{ userId: string; tokenId: string } | null> {
  if (!token || token.length < 20 || token.length > 200) return null;

  const [row] = await db
    .update(userTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(userTokens.tokenHash, hashToken(token)),
        eq(userTokens.purpose, purpose),
        isNull(userTokens.consumedAt),
        gt(userTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: userTokens.userId, tokenId: userTokens.id });

  return row ?? null;
}

/**
 * Consume a verification token and mark the account verified in one
 * transaction. The user update is idempotent; verification never regresses.
 */
export async function verifyEmailWithToken(
  token: string,
): Promise<{ userId: string } | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(userTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(userTokens.tokenHash, hashToken(token)),
          eq(userTokens.purpose, "email_verification"),
          isNull(userTokens.consumedAt),
          gt(userTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: userTokens.userId, tokenId: userTokens.id });

    if (!row) return null;

    await tx
      .update(users)
      .set({
        emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, row.userId));

    return { userId: row.userId };
  });
}

/**
 * Consume a reset token, replace the password hash and revoke every session in
 * one transaction. The caller must not create a session afterwards.
 */
export async function resetPasswordWithToken(
  token: string,
  passwordHash: string,
): Promise<{ userId: string; revokedSessions: number } | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(userTokens)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(userTokens.tokenHash, hashToken(token)),
          eq(userTokens.purpose, "password_reset"),
          isNull(userTokens.consumedAt),
          gt(userTokens.expiresAt, new Date()),
        ),
      )
      .returning({ userId: userTokens.userId, tokenId: userTokens.id });

    if (!row) return null;

    await tx
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, row.userId));

    const revoked = await tx
      .delete(sessions)
      .where(eq(sessions.userId, row.userId))
      .returning({ id: sessions.id });

    return { userId: row.userId, revokedSessions: revoked.length };
  });
}

/**
 * Bounded cleanup of expired and consumed tokens. Never deletes a live token.
 */
export async function cleanupUserTokens(input?: {
  before?: Date;
  limit?: number;
}): Promise<number> {
  const before = input?.before ?? new Date();
  const limit = Math.min(Math.max(input?.limit ?? 500, 1), 1000);

  const rows = await db.execute<{ id: string }>(sql`
    delete from user_tokens
    where id in (
      select id
      from user_tokens
      where (consumed_at is not null and consumed_at < ${before.toISOString()}::timestamptz)
         or expires_at < ${before.toISOString()}::timestamptz
      order by created_at asc
      limit ${limit}
    )
    returning id
  `);

  return rows.length;
}

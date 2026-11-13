# T-004 Migration Proposal — Account Verification and Reset Tokens

**Status:** IMPLEMENTED IN T-005 — `drizzle/0002_normal_angel.sql` created and applied to `driverfirst_test` only. Not applied to development or production.
**Superseded by:** the T-005 directive's mandatory amendments (UUID, purpose enum, unique hash, partial unique index for one unconsumed token per purpose).

## Why the existing schema is insufficient

T-004 requires email verification (KI-008) and password reset (KI-009) with tokens that are:

- high-entropy, single-use and time-limited;
- hashed at rest;
- never exposed in logs, URLs outside the flow, admin pages or audit metadata.

The current schema has `users.email_verified_at` as a state flag but no token store. The existing
tables cannot safely be reused:

| Alternative | Why rejected |
| --- | --- |
| `sessions` rows with a marker | A token row would contain a hash of a token that `getCurrentUser` treats as an authentication credential. Reusing it as a verification/reset token creates an auth-bypass risk and pollutes session semantics. |
| `audit_logs.metadata` | Audit rows are visible to admins and are append-only. Storing a token hash there violates the "never in admin pages/audit metadata" requirement and gives the wrong lifecycle. |
| Columns on `users` | Only one active token per purpose would be possible, making resend/rotation awkward, and consumed-token history is lost. |
| Signed stateless tokens | No server-side single-use enforcement without a denylist, which requires storage anyway. |

## Proposed schema (additive only)

```sql
CREATE TABLE user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_tokens_token_hash_unique ON user_tokens (token_hash);
CREATE INDEX user_tokens_user_purpose_idx ON user_tokens (user_id, purpose);
```

Drizzle counterpart (sketch):

```ts
export const userTokens = pgTable("user_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt,
}, (t) => [
  uniqueIndex("user_tokens_token_hash_unique").on(t.tokenHash),
  index("user_tokens_user_purpose_idx").on(t.userId, t.purpose),
]);
```

### Token lifecycle

- 32 random bytes, base64url encoded; only the SHA-256 hash is stored.
- Verification TTL: 24 hours. Reset TTL: 1 hour.
- Single use: `UPDATE ... SET consumed_at = now() WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now() RETURNING user_id`.
- Issuing a new token for the same purpose revokes previous unconsumed tokens for that user/purpose
  (delete or mark consumed) to avoid multiple live links.
- Successful verification sets `users.email_verified_at` once (idempotent).
- Successful reset updates `password_hash` and deletes all sessions for the user, then creates no
  automatic session.
- All responses are generic: registration, resend and reset-request never reveal whether an address
  exists. Rate limits apply per IP and per email hash.

## Policy decisions required with the migration

1. **Which actions require a verified email?** Proposed minimum: publishing a vacancy, submitting
   verification evidence, sending an enquiry, and submitting a review. Browsing, saving and profile
   editing remain available. This must be approved before enforcement, because every current account
   has `email_verified_at = NULL`.
2. **Grandfathering.** Existing accounts (currently none in the development database) need either a
   forced verification prompt or an operator-set verified flag for a manually vetted cohort.
3. **Email delivery.** There is no email infrastructure (KI-013). Tokens are useless in production
   without a provider, templates, bounce handling and retry policy. That decision is outside the
   schema change but blocks KI-008/KI-009 delivery.

## Backward compatibility

- Additive table and indexes only; no existing column, constraint or data is changed.
- Old application code can run against the new schema and simply ignores the table.
- No data backfill is required.
- Rollback is `DROP TABLE user_tokens`; it holds no canonical business data, only short-lived token
  hashes.

## Affected environments

| Environment | Action |
| --- | --- |
| Development PostgreSQL | **NOT APPLIED.** Requires separate explicit founder approval. Do not reset or seed. |
| `driverfirst_test` | **APPLIED** via `0002_normal_angel.sql`; harness migrates automatically. |
| Production | **NOT APPLIED.** Requires separate explicit founder approval and deployment planning. |

## Security tests required with implementation

- Token is not returned by any admin query, audit metadata, server log or error page.
- Expired, consumed, wrong-purpose and unknown tokens are rejected without revealing account state.
- Verification and reset cannot be bypassed by calling the action directly with a user id.
- Password reset invalidates all sessions, including the current one.
- Resend rotates tokens and invalidates the previous link.
- Registration/reset responses are identical for existing and non-existing addresses.

## Requested decision

Approve, reject or amend the table and the policy list above. No migration file has been generated and
no schema change has been made.

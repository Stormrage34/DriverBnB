# T-005 Implementation Report — Account Security and Platform Hardening

**Date:** 13 November 2026
**Status:** COMPLETE (implementation and tests); production email delivery, scheduler and deployment remain intentionally unconfigured.
**Starting HEAD:** `b3d0757`
**Branch:** `main`

## 1. T-005 status

Complete within the approved scope. The `user_tokens` migration exists and is applied to
`driverfirst_test` only. Account verification, password reset, verified-email enforcement, operator
bootstrap, provider-independent email delivery, trusted-proxy handling, CSP/HSTS and lifecycle
observability are implemented and tested. No deployment, production migration, email-provider
selection or T-006 work was performed.

## 2. Git

- Starting HEAD: `b3d0757`.
- Implementation commits:
  - `f5612a0` — `T-005: add user token schema and atomic token lifecycle`
  - `3eff045` — `T-005: add email verification, password reset and verified-email enforcement`
  - `0f44a10` — `T-005: harden proxy and headers, add token cleanup and lifecycle observability`
  - `688ee59` — `T-005: cover token lifecycle, account gates, proxy and headers`
  - `e44b3df` — `T-005: document account security, operations and EU-first boundaries`
- Documentation follow-up: `34bccc9` — `T-005: record implementation commit hashes`.
- Working tree: clean after the documentation follow-up.

The implementation is split into schema/token, account-security, infrastructure and tests, followed
by documentation. No commit is amended or rewritten.

## 3. Implemented

### Account tokens

- `src/db/schema.ts`: `user_token_purpose` enum and `user_tokens` table.
- `drizzle/0002_normal_angel.sql`: additive table, FK cascade, unique hash, user/purpose index and
  partial unique index for one unconsumed token per purpose.
- `src/lib/user-tokens.ts`: 32-byte base64url generation, SHA-256 hash at rest, 24h verification /
  1h reset TTL, row-locked issuance, atomic consumption, verification transaction, reset transaction
  with full session deletion, bounded cleanup.
- `src/lib/token-hash.ts`: shared hash function; `src/lib/auth.ts` re-exports it.

### Account security

- `src/app/(auth)/actions.ts`: registration issues verification, resend rotates tokens, verification
  consumes a token, reset request is generic, reset consumes a token and revokes every session.
- `src/app/(auth)/verify-email/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx` and
  `src/components/auth/email-verification-forms.tsx`.
- `src/lib/email.ts`: provider interface, disabled default, memory-only test adapter, verification
  and reset templates, fail-safe delivery result.
- `src/lib/operator-verification.ts` and `src/scripts/verify-user-email.ts`: operator-only admin
  bootstrap and invite-only pilot verification; exact email, role check, `--confirm-control`, atomic
  audit row; no HTTP endpoint.
- `src/app/dashboard/actions.ts`: verified-email gate on enquiries and reviews.
- `src/app/employer/actions.ts`: verified-email gate on verification evidence and vacancy publishing.
- `src/lib/guards.ts` and `src/app/admin/actions.ts`: verified-email gate on admin page and actions.
- Dashboard/employer banners explain the gate; they are advisory only.

### Infrastructure

- `src/lib/auth.ts`: `TRUST_PROXY` fail-safe; forwarding headers ignored unless explicitly trusted.
- `next.config.ts`: CSP, COOP/CORP, frame-deny, referrer, permissions; HSTS only with
  `ENABLE_HSTS=true`.
- `src/app/api/internal/vacancy-lifecycle/route.ts` and `src/scripts/vacancy-lifecycle.ts`: structured
  `vacancy_lifecycle_run` logs with counts and duration, no personal data.
- `src/scripts/cleanup-user-tokens.ts` and npm scripts.

## 4. Database

Migration `drizzle/0002_normal_angel.sql`:

- `user_tokens` table (UUID PK, cascade FK, purpose enum, token hash, expiry, consumption timestamp,
  creation timestamp).
- `user_tokens_token_hash_unique`.
- `user_tokens_user_purpose_idx`.
- `user_tokens_one_unconsumed_per_purpose` partial unique index where `consumed_at IS NULL`.

Applied to `driverfirst_test` only. The development database has no `user_tokens` table and was not
migrated. Rollback is `DROP TABLE user_tokens`; it holds only short-lived token hashes.

## 5. Account security behaviour

- Verification tokens: 24 hours, single use, hashed at rest.
- Reset tokens: 1 hour, single use, hashed at rest.
- Issuing a new token for the same user/purpose marks the previous unconsumed token consumed in the
  same transaction; the user row lock serialises concurrent issuance and the partial unique index is
  the database backstop.
- Consumption is an atomic `UPDATE ... WHERE consumed_at IS NULL AND expires_at > now() RETURNING`.
- Verification sets `email_verified_at` once via `coalesce`.
- Reset updates the password hash and deletes every session in one transaction; it does not create a
  session.
- Registration, resend and reset-request do not disclose account existence.
- Admin bootstrap and pilot verification are operator CLI procedures with an audit row naming the
  operator and reason; the actor is null rather than falsely attributed.

## 6. Infrastructure

- `TRUST_PROXY=false` by default; a spoofed `X-Forwarded-For` is ignored. Deployment contract is in
  `OPERATIONS.md`.
- CSP and security headers are application defaults; HSTS is opt-in.
- Rate limiting remains process-local and is documented as single-instance only.
- Lifecycle runs emit a structured event; no scheduler is deployed.
- Monitoring, backups and restore testing are documented requirements, not configured.

## 7. EU/global architecture

`EU_FIRST_ARCHITECTURE.md` records the current country-specific assumptions (ISO country codes,
hardcoded EUR default, free-text registration/phone/employment fields, English-only UI, no vacancy
timezone) and proposes an explicit jurisdictional policy layer for later approval. No country engine
or schema change was introduced. No legal-compliance claim is made.

KI-040 options are in `KI-040_REVIEW_RETENTION_OPTIONS.md`; KI-045 status matrix is in
`KI-045_STATUS_MATRIX.md`. Badge wording and semantics were not changed.

## 8. Tests

Commands and exact totals to be recorded on the final committed state:

- `npx tsc --noEmit` — 0 errors.
- `npm test` — 169 tests in 18 files, all passing.
- `npm run test:http` — 71 tests in 9 files, all passing (built app against `driverfirst_test`).
- `npm run build` — 0 errors.
- Migration `0002_normal_angel.sql` applied to `driverfirst_test`; `user_tokens` has 3 indexes and 0 rows after cleanup.

New coverage:

- `tests/user-tokens.test.ts`: hashing, TTL, rotation, wrong-purpose, expired, consumed, concurrent
  redemption, concurrent issuance, reset session revocation, cleanup.
- `tests/operator-verification.test.ts`: admin bootstrap, role refusal, duplicate refusal, audit
  attribution.
- `tests/email.test.ts`: templates, test adapter, disabled fail-safe.
- `tests/trusted-proxy.test.ts`: forwarded-header spoofing, trusted and untrusted modes.
- `tests/http/t005-account-security.test.ts`: registration, generic duplicate, verification,
  unverified enquiry/review/evidence/publish blocks, reset/session revocation, admin gate, generic
  reset responses and security headers.

## 9. Remaining blockers

### Technical

- Production email adapter not implemented; self-service delivery is disabled.
- Rate limiting is process-local (KI-014).
- Local development database has not received `user_tokens`; the website cannot exercise token flows
  there until a separate development migration approval.
- No scheduler for vacancy expiry (KI-016).

### Operational

- No provider, DPA, processing location, bounce/complaint handling or sender domain.
- No monitoring, alerting, backup or restore configuration.
- No deployment pipeline or HTTPS/HSTS verification.
- The local development admin remains unverified until the operator bootstrap is run.

### Legal

- EU/member-state employment, intermediation, platform-work, pay-transparency, DSA, defamation and
  data-retention review remains outstanding (KI-020).
- KI-040 review retention requires a founder/counsel decision.
- No claim of EU or global legal compliance.

## 10. Security review

- Tokens are never selected into admin queries, audit metadata, pages or error responses.
- The operator CLI is not reachable over HTTP.
- Password reset does not auto-login and revokes every session.
- Verified-email checks are in Server Actions and admin guards, not UI.
- The trusted-proxy default is fail-safe.
- Residual risks: process-local rate limits; email delivery disabled; local dev DB unmigrated; no
  scheduler; no monitoring.

## 11. Out of scope

No T-006, deployment, production migration, seed/demo data, billing, CV upload, notifications beyond
account security, job matching/ranking, paid verification, paid review removal, per-hire commission,
freight tracking, UI redesign, Prisma, speculative country-compliance engine, or legal-compliance
claim.

## 12. Next decision required

1. Select an email provider and approve its DPA, processing location and sender domain.
2. Approve the development-database migration separately if local token-flow testing is required.
3. Decide KI-040 retention and KI-045 badge wording after reviewing the notes.
4. Configure a scheduler and monitoring before claiming production expiry.
5. Approve any deployment or production migration separately.

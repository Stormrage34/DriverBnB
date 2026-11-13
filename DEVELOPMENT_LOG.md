# Development Log — Milevana (formerly DriverFirst)

> Historical record. The project operated as DriverFirst through T-005; the brand was changed to
> Milevana in Phase 3. Database names such as `driverfirst` and `driverfirst_test` are historical
> technical identifiers and were intentionally not renamed.


Newest entries first. Each entry records what changed, the evidence produced, and what remains.

---

## 2026-11-13 — T-004: Pilot readiness and security hardening

**Status:** Complete except two approval gates (account-token migration, production scheduler)

**Changes**
- **T-003 moderation edge case:** `under_review` + `publishedAt = null` is no longer resolved from
  `moderatedAt`. Only a recorded pending-to-under-review transition in `admin.review_moderation`
  proves a review was never published. Missing evidence fails closed as
  `publication_history_unknown`; contradictory evidence fails as `publication_history_conflict`.
  Both paths change no row and write a blocked audit event. The admin UI shows “Publication history
  unknown” and offers no action for such rows.
- **KI-041:** `changePasswordAction` keeps the current session and deletes every other session in the
  same transaction. Audit metadata records the revoked count; no credential or token is stored.
- **KI-049 / KI-016:** added `src/lib/vacancy-lifecycle.ts`. Live vacancies become
  `reconfirmation_required` on their due date and `expired` after a 7-day grace period. The sweep is
  idempotent, conditional on the read status, skips suspended vacancies and suspended companies, and
  writes one audit row per transition. Exposed through
  `POST /api/internal/vacancy-lifecycle` (bearer secret) and a dry-run-first script; no scheduler is
  deployed. Saved vacancy lists now filter inactive statuses.
- **KI-004 / Workstream C:** added `PERMISSION_MATRIX.md` and
  `tests/http/permission-matrix.test.ts`, covering visitor/driver/employer/other-employer/suspended/
  admin access, cross-tenant reply/enquiry/company/vacancy mutations, direct action invocation,
  export isolation, verification-evidence isolation and suspended-account sessions.
- **Workstream A blocked:** email verification (KI-008) and password reset (KI-009) require a token
  table. No migration was created. `T-004_MIGRATION_PROPOSAL.md` documents the additive schema,
  token lifecycle, anti-enumeration rules, policy decisions and the missing email-delivery dependency.
- **Workstream D:** `T-004_OPERATIONAL_RISKS.md` classifies KI-014, KI-015, KI-017, KI-019, KI-030,
  KI-040, KI-045, KI-057, KI-065, KI-066, KI-068, KI-069 and KI-013. No unrelated fixes were
  implemented.

**Evidence**
- `npx tsc --noEmit` — exit 0.
- `npm test` — 154 tests in 14 files, all passing.
- `npm run build` — exit 0.
- `npm run test:http` — 63 tests in 8 files, all passing.
- `npm run vacancies:lifecycle` — dry run against the empty development DB, exit 0.
- New tests: `tests/vacancy-lifecycle.test.ts`, `tests/vacancy-lifecycle.integration.test.ts`,
  `tests/http/vacancy-lifecycle.test.ts`, `tests/http/account-security.test.ts`,
  `tests/http/permission-matrix.test.ts`; `tests/review-moderation.test.ts` and
  `tests/http/admin-moderation.test.ts` extended for the evidence rule.

**Commits**
- `d7be5da` — require recorded evidence for legacy under-review reviews
- `ddc0d68` — revoke other sessions on password change
- `42bbaa2` — add vacancy reconfirmation and expiry lifecycle
- `5939f1d` — add cross-tenant and role permission matrix tests

**Notes / deviations**
- No migration, seed data, billing, notifications, UI redesign or T-005 work was started.
- “Expiry active in production” is not claimed: the mechanism exists, but scheduling is a deployment
  action.
- Email verification/reset are not claimed as implemented; they are blocked and documented.

---

## 2026-11-13 — T-003: Administration, moderation and privacy stabilization

**Status:** Complete (pending founder review)

**Changes**
- Added the five missing admin surfaces: `/admin/vacancies`, `/admin/reviews`, `/admin/reports`,
  `/admin/users` and `/admin/audit`. Every page calls `requireAdminPage`; every mutation still calls
  `requireAdmin`. Lists use validated enum filters and bounded pagination (20 per page, page 1–500).
- Added `src/lib/admin-queries.ts` with paged list reads and `listAdminUsers`, which selects an explicit
  safe column set. No password hash, session or reset token can reach an admin result.
- KI-070/KI-067: added `src/lib/vacancy-moderation.ts`. Individual suspension keeps
  `suspended_from_status = NULL` so company restoration cannot override it; the prior public state is
  recorded in the `admin.vacancy_suspend` audit event and read back for a manual restore. Restoration
  validates the current state, prior state, company suspension, verification trust, publishability and
  reconfirmation age. Invalid restores leave the vacancy suspended and write
  `admin.vacancy_moderation_blocked`.
- KI-071: extended `src/lib/reviews.ts` with an explicit transition model. `publishedAt` distinguishes a
  never-published `under_review` review from one reopened after publication; a legacy row with neither
  `publishedAt` nor `moderatedAt` fails closed as `publication_history_unknown`. Rejected and removed are
  terminal. `publishedAt` is set once and preserved; every decision and block is audited with previous
  and next state.
- KI-072: review submission and the review company picker now use `isCompanySuspended`, covering both
  `suspended_at` and legacy `verification_status = 'suspended'`.
- KI-044/KI-054: `getEmployerEnquiries` no longer selects the driver's account email; the enquiry form
  receives the exact shareable email and only shows phone sharing when a phone is stored.
- KI-051: removed the unsupported “employers may request contact” and “searchable by employer” controls;
  stored flags are forced private.
- User suspension now deletes the account's session rows transactionally, in addition to the existing
  `isActive`/`suspendedReason` check in `getCurrentUser`.
- Saved companies and saved vacancies filter suspended companies at query level.
- Report moderation treats resolved/dismissed as terminal and audits blocked attempts.

**Evidence**
- `npx tsc --noEmit` — exit 0.
- `npm test` — 134 tests in 12 files, all passing.
- `npm run build` — exit 0.
- `npm run test:http` — 42 tests in 5 files, all passing against the built app and `driverfirst_test`.
- New tests: `tests/review-moderation.test.ts`, `tests/vacancy-moderation.test.ts`,
  `tests/admin-queries.test.ts`, `tests/http/admin-moderation.test.ts`, `tests/http/privacy.test.ts`.

**Notes / deviations**
- No migration was required or authorized. The prior state of an individual vacancy suspension is read
  from the audit trail because there is no dedicated column; a legacy suspension without that record
  fails closed rather than inferring history.
- No seed data, billing, CV upload, email verification/reset, notifications or T-004 work was started.

---

## 2026-11-12 — T-002d: Trust and security stabilization

**Status:** Complete (pending founder review)

**Changes**
- H1/KI-060: added a repeatable built-app HTTP harness (`tests/helpers/http-server.ts`,
  `tests/helpers/fixtures.ts`, `tests/http/*.test.ts`, `vitest.http.config.ts`, `npm run test:http`).
  It uses real sessions, the Next progressive-enhancement form protocol and database assertions for
  unauthenticated, driver, employer, admin, expired-session, cross-company, suspended-company and
  unauthorized-restoration paths.
- H2/KI-061: added `companies.verification_version` (default 0) and made trust version-aware throughout
  `src/lib/verification.ts`, badges, filters, publishing, vacancy labels and admin stats. Missing
  identity snapshots block advancement; legacy verified rows are untrusted and resubmission is forced
  to review. Historical verification rows are not rewritten.
- H3/KI-043: added admin company suspension/restoration with mandatory reasons and audit. Public
  company/job/review queries and direct URLs exclude suspended companies; employer writes and
  verification decisions reject them. Added `vacancies.suspended_from_status`; company restoration is
  transactional, never overrides individual admin suspensions, leaves ambiguous states suspended, and
  sends incomplete vacancies to `draft`.
- H4/KI-063: `verificationRecordKind` distinguishes employer-submitted evidence, system
  profile-change records and legacy records; moderator notes are removed from employer pages and no
  evidence is exposed publicly.
- H5/KI-064: verification submissions require `confirmIdentityChange` for identity/classification
  changes, matching the profile editor; the confirmation is recorded in audit and submission data.
- Added `/admin/companies` and the Companies admin navigation entry.
- Added `company-suspension.ts` and regression tests for suspension, version trust, provenance and
  HTTP authorization.

**Evidence**
- `npx tsc --noEmit` → exit 0.
- `npm test` → 9 files, 106 tests passed.
- `npm run build` → exit 0.
- `npm run test:http` → 3 files, 17 tests passed against the built app and `driverfirst_test`.
- Migration `0001_t002d_trust_stabilization.sql` applied to `driverfirst_test` first, then
  `driverfirst`; both have 2 migrations. Development database: 0 companies, 0 vacancies.
- Code and migration commit `8b22888`.

**Notes**
- The migration is additive and the baseline migration is untouched.
- `verification_version=0` intentionally removes the badge from pre-existing verified data until
  review; the development database is empty.
- Individual vacancy suspension has no admin UI; the action exists and is covered through simulated
  state in the HTTP tests.
- No browser E2E, mobile QA or legal review was performed.
- T-003 was not started; no seed data or unrelated features were added.

**Next:** founder review of T-002d; stop before T-003.

---

## 2026-11-12 — T-002c: Verification identity integrity and queue completion

**Status:** Complete (pending founder review)

**Changes**
- Added `src/lib/verification.ts` as the single verification model: identity snapshot and SHA-256 hash,
  legal/classification/operational change classification, derived checks, labels, allowed outcomes,
  transition resolution, resubmission/invalidation outcomes, and `isFullyVerified`.
- Defined identity-critical fields as legal name, trading name, country, registration number,
  registered address and contracting entity; company type and direct-recruitment declaration are
  classification fields. Operational fields never auto-invalidate.
- `updateCompanyAction` now detects changes, requires the confirmation box for identity/classification
  edits, resets status to `unverified` (legal) or `identity_checked` (role), and downgrades
  `published_verified` vacancies to `published_unverified` in the same transaction.
- `submitVerificationAction` no longer blocks verified companies and no longer resets checks on
  ordinary resubmission. Legal changes reset to `submitted`; classification changes preserve identity
  and reset only the role check. It stores the identity snapshot, hash, changes and operational changes.
- The moderation queue includes `direct_employer_checked`, lists only the next permitted outcome, and
  blocks advancement when the current identity hash differs from the submitted snapshot. Moderators see
  changed fields with previous/current values and recent identity/operational changes.
- `verifiedOnly` filtering and vacancy publishing now use `verified` only; `directOnly` remains a
  separate classification filter. Public badges and panels derive each check independently.
- Ordinary evidence resubmission, profile invalidation and operational changes are audited with
  previous/current values; material operational changes are flagged for review.
- Added `tests/verification-state.test.ts` (52 tests) and `tests/verification.integration.test.ts`
  (6 tests).

**Evidence**
- `npx tsc --noEmit` → exit 0.
- `npm run build` → exit 0.
- `npm test` → 8 files, 97 tests passed.
- No schema or migration change (`git diff --name-only -- src/db drizzle` empty).
- Code commits `b854987` and `ffa5b66` (server-only hash split); documentation commit `449a3e5`.

**Notes**
- Server Actions are not invoked over HTTP in tests; the resolver and database queries are tested
  directly, with the action wiring verified by typecheck/build and code review.
- No per-stage timestamps were added; the audit log retains decision snapshots and times.
- Legacy rows without identity snapshots bypass the mismatch guard; the pilot database is empty.
- T-003 was not started; seed data and unrelated features remain out of scope.

**Next:** founder review of T-002c; stop before T-003.

---

## 2026-11-12 — T-002b: Audit hotfix H1–H4

**Status:** Complete (pending founder review)

**Changes**
- H1: removed `getRecentAudit` from `src/app/admin/actions.ts`; the admin dashboard now reads audit
  logs through `getAuditLogs` in `src/lib/queries.ts`. No audit read is exported from a `"use server"`
  module.
- H2: added `resolveVacancyTransition` in `src/lib/vacancy.ts` and routed both publish and reconfirm
  actions through it. Draft and suspended vacancies cannot become live via crafted POSTs; incomplete
  live vacancies cannot be reconfirmed. Added an explanatory error state on the edit page.
- H3: `getPendingVerifications` now loads the latest `company_verifications` submission per company.
  The moderator queue displays `submission.evidenceNotes`; the employer form no longer prefills
  `company.verificationNotes`.
- H4: employer replies require a `published` review and are stored as `pending`. Added
  `moderateResponseAction` and a pending-replies moderation card on `/admin`; employers see the
  moderation status of their reply.
- Tests: added state-machine cases, static authorization/evidence checks, reply-policy tests and a
  DB-backed moderation-separation suite. Total 39 tests in 6 files.
- Documentation: full audit findings recorded in `KNOWN_ISSUES.md` (P1/P2/P3, including UX);
  `PROJECT_STATUS.md`, `API_SPECIFICATION.md` and `DECISIONS.md` updated.

**Evidence**
- `npx tsc --noEmit` → exit 0.
- `npm run build` → exit 0.
- `npm test` → 6 files, 39 tests passed.
- No schema or migration change (`git diff --name-only -- src/db drizzle` empty).
- Development database untouched; test database is separate (`driverfirst_test`).

**Notes**
- H5 (session revocation) and review-retention changes remain open by instruction.
- Reply moderation uses the existing `review_responses.status` text column; no migration.
- The admin review/report/user/audit pages remain T-004.

**Next:** founder review; T-003 not started.

---

## 2026-11-12 — T-002: Green build and P1 integrity fixes

**Status:** Complete (pending founder review)

**Changes**
- Replaced unsupported `CircleEuro` icon with `Euro` in the vacancy card, vacancy detail and company
  profile; corrected `monthlyEquivalent` import to `@/lib/utils`.
- Added `resolveVacancySave` in `src/lib/vacancy.ts`: blocks incomplete saves of live vacancies,
  blocks employer edits/republishing of suspended vacancies, preserves `confirmed`, and derives the
  correct publish status for verified/unverified companies.
- Refactored `saveVacancyAction` to use the helper; publish timestamps only move on first publication
  or explicit republish, not on ordinary edits.
- Restricted `getEmployerReviews` to `published` reviews so employers cannot see pending or removed
  moderation material.
- Corrected review moderation revalidation to use the company slug and the public reviews route.
- Added Vitest configuration, a guarded test-database helper, and targeted tests.
- Accepted Next.js normalisation of `tsconfig.json` (`jsx: react-jsx`, `.next/dev/types` include).

**Evidence**
- `npx tsc --noEmit` → exit 0.
- `npm run build` → exit 0; 30 dynamic routes + `/_not-found`.
- `npm test` → 3 files, 17 tests passed.
- Database-backed test creates/migrates `driverfirst_test`, inserts published/pending/removed reviews,
  and asserts only the published review is returned to employer and public queries.
- Development database untouched; migration `0000` unchanged.

**Notes**
- No schema change and no new dependency.
- Runtime/browser verification still absent.
- Targeted tests cover the corrected defects, not the full permission model (T-005).

**Next:** T-003 seed dataset, on founder approval.

---

## 2026-11-12 — T-001: Repository baseline and project documentation

**Status:** Complete (initial commit)

**Changes**
- Initialised Git in `/home/stormrage/DriverBnB`.
- Reviewed and extended `.gitignore`: ignores `node_modules`, `.next`, `out`, `build`, all `.env`
  variants except `.env.example`, logs, `next-env.d.ts`, TypeScript/Vitest caches, coverage.
- Added `.env.example` with placeholder database URL and site URL only — no credentials.
- Added `README.md` covering status, stack, local setup, scripts, layout, documentation links,
  non-negotiable rules and legal caveat.
- Added nine project documents:
  `PROJECT_BRIEF.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`,
  `API_SPECIFICATION.md`, `PROJECT_STATUS.md`, `DEVELOPMENT_LOG.md`, `KNOWN_ISSUES.md`,
  `DECISIONS.md`.
- Recorded repository-local Git identity (`DriverFirst Dev <dev@driverfirst.local>`) because no
  global identity exists on the host.

**Evidence**
- `npx tsc --noEmit` → 4 errors (baseline, documented).
- Database inspected: 19 tables, 0 rows, migration `0000` applied.
- Source baseline hash before documentation commit:
  `f41a6431e9bbe14696f8e6b9866458f95d6db368da231365b5df7de913ce6763`.

**Notes**
- No source code changed for T-001 beyond documentation and `.gitignore`.
- No database operation was performed.
- A prior read-only audit attempt was redirected by the founder into an execution approval; its
  findings were folded into `KNOWN_ISSUES.md` and `PROJECT_STATUS.md`.

**Next:** T-002 — green typecheck/build and P1 integrity fixes.

---

## 2026-11-12 — Pre-governance scaffold

**Status:** Unverified foundation

**What was built**
- Next.js 16 App Router application with TypeScript strict, Tailwind 4 design tokens and Geist fonts.
- 19-table PostgreSQL schema and initial Drizzle migration.
- Custom session authentication with scrypt hashing, HTTP-only cookies and role guards.
- Public information architecture: home, jobs, job detail, companies, company profile, reviews,
  verification explainer, employer proposition, about, contact, privacy, terms, review policy, report.
- Driver workspace: dashboard, profile and privacy settings, saved items, enquiry history, review
  submission, account settings, export and deletion.
- Employer workspace: company profile, verification submission, vacancy lifecycle, enquiry inbox,
  review replies, billing placeholder.
- Admin: dashboard and verification queue.

**Verification**
- None end-to-end. Typecheck fails with 4 import errors. Production build not attempted. Database
  contains no data. No tests exist.

**Known defects carried forward**
- Live vacancy can lose required fields on edit.
- Employer review query exposes pending/removed reviews.
- Review moderation revalidates an incorrect path.
- Five admin pages missing.

---

## 2026-11-13 — T-005: Account security, token lifecycle and production hardening

**Status:** Complete (implementation); production email delivery and deployment remain intentionally disabled.

**Changes**
- Additive `user_tokens` schema and migration `drizzle/0002_normal_angel.sql`: UUID PK, cascade FK,
  purpose enum, unique SHA-256 hash, 24h/1h expiry, nullable consumption, partial unique index for one
  live token per user/purpose. Applied to `driverfirst_test` only.
- Token service: 32-byte base64url tokens, hash-at-rest, row-locked issuance, atomic consumption,
  verification transaction, reset transaction with full session revocation, bounded cleanup.
- Account flows: registration issues verification; `/verify-email`, `/forgot-password`,
  `/reset-password`; generic responses; resend rotates tokens; reset never auto-logs in.
- Verified-email enforcement in enquiry, review, vacancy publish and verification-evidence actions;
  admin page and admin actions require a verified admin.
- Operator CLI `npm run users:verify-email` for admin bootstrap / invite-only pilot, with role checks,
  exact-email targeting, `--confirm-control` and an atomic `user.email_verified_operator` audit row.
  No HTTP endpoint.
- Provider-independent email abstraction; `disabled` default, memory-only `test` adapter, no invented
  production provider.
- `TRUST_PROXY` fail-safe; CSP/COOP/CORP and conditional HSTS; structured lifecycle run logs.
- EU-first architecture assessment, KI-040 options note and KI-045 status matrix; badge wording and
  semantics unchanged.
- Tests: account-token lifecycle, operator verification, email adapter/templates, trusted proxy,
  registration/verification/reset/enforcement HTTP flows and security headers.

**Evidence**
- `npx tsc --noEmit` → 0 errors.
- `npm test` → 169 tests in 18 files.
- `npm run build` → 0 errors.
- `npm run test:http` → 71 tests in 9 files.
- Migration applied to `driverfirst_test`; development database has no `user_tokens` table.

**Notes**
- `EMAIL_PROVIDER=disabled` means self-service verification/reset cannot deliver in production.
- The local development admin remains unverified until the operator bootstrap is run.
- No scheduler is configured; lifecycle expiry is not active in production.
- No deployment, production migration, provider selection or T-006 work was performed.

**Next:** Phase 2 brand naming and preliminary clearance, then rebranding.

---

## Entry template

```
## YYYY-MM-DD — T-XXX: Title
Status: Planned / In progress / Complete / Blocked
Changes:
Evidence:
Notes:
Next:
```

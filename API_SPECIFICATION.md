# API Specification — DriverCompass MVP 1

**Version:** 1.1 · 12 November 2026
**Interface style:** Next.js Server Actions for all writes; one route handler for data export.
**Authentication:** session cookie `df_session` (HTTP-only).
**Error model:** actions return `{ error?: string; success?: string }` (or `{ fieldErrors }` for
registration/login). Domain failures are returned, not thrown. Authorization failures either return a
generic error or redirect to `/login`.

No public JSON write API exists. This is intentional: it reduces attack surface and keeps the
recruitment relationship inside server-rendered, CSRF-protected actions.

## 1. Server actions

### 1.1 Authentication and public (`src/app/(auth)/actions.ts`)

| Action | Auth | Input (Zod) | Effect | Limits |
| --- | --- | --- | --- | --- |
| `registerDriverAction` | none | displayName, email, password, confirmPassword, country?, acceptTerms | Creates `users` (role driver) + `driver_profiles` in one transaction; starts session; issues a 24h verification token; audit `auth.register`; redirect `/verify-email?sent=1`. Existing email returns the same redirect without creating an account | 5/hour/IP |
| `registerEmployerAction` | none | displayName, email, password, confirmPassword, companyLegalName, companyCountry, companyRegistrationNumber, companyType, companyWebsite?, acceptTerms | Creates user + company (`unverified`) + basic subscription; session; issues verification token; audit; redirect `/verify-email?sent=1`. Existing email returns the same redirect | 5/hour/IP |
| `loginAction` | none | email, password, next? | Verifies scrypt hash; updates `last_login_at`; starts session; audit; redirect role home or safe `next` | 8/15 min/IP+email |
| `logoutAction` | session | — | Deletes session row; clears cookie; redirect `/` | — |
| `contactAction` | none | name, email, subject, message | Inserts `contact_messages`; returns success | 4/hour/IP |
| `resendVerificationAction` | none | email | Generic response for every address. For an existing unverified account, rotates the verification token and sends a new link; audit `auth.verification_sent` | 3/15 min/IP+email |
| `verifyEmailAction` | none | token | Atomically consumes a 24h verification token and sets `email_verified_at`; audit `auth.email_verified`; invalid/expired tokens return a generic error | — |
| `requestPasswordResetAction` | none | email | Generic response for every address. For an existing active account, issues a 1h reset token and sends the link; audit `auth.password_reset_requested` | 3/15 min/IP+email |
| `resetPasswordAction` | none | token, password, confirmPassword | Atomically consumes a 1h reset token, updates the scrypt hash and deletes every session in one transaction; no session is created; audit `auth.password_reset`; redirect `/login?reset=1` | — |

Registration, resend and reset-request do not disclose whether an address belongs to an account: the
existing-account and new-account paths redirect or return the same generic message. Login uses a
generic credential error.

### 1.2 Driver (`src/app/dashboard/actions.ts`)

| Action | Auth | Input | Effect | Revalidation |
| --- | --- | --- | --- | --- |
| `toggleSavedVacancyAction` | driver | vacancyId | Insert/delete `saved_vacancies` | `/dashboard/saved`, vacancy page |
| `toggleSavedCompanyAction` | driver | companyId | Insert/delete `saved_companies` | `/dashboard/saved`, `/dashboard` |
| `sendEnquiryAction` | driver | vacancyId, message (40–3000), shareEmail?, sharePhone? | Validates vacancy is active; inserts `enquiries` with contact details only when opted in; audit `enquiry.sent` | `/dashboard/applications` |
| `submitReviewAction` | driver | companyId, jobTitle?, employmentStart, employmentEnd?, overall 1–5, eight optional category ratings, title, body (80–4000), eligibilityAttested, publicationConsent | Rejects suspended companies and duplicate periods; inserts review `pending`; audit | company profile, `/dashboard/reviews` |
| `updateDriverProfileAction` | driver | profile fields (contact email/phone) | Updates `driver_profiles`; privacy flags are forced to `private`/`false` because no employer search exists; audit `profile.updated` | `/dashboard/profile`, `/dashboard` |
| `changePasswordAction` | any session | current, new, confirm | Verifies current password; updates scrypt hash; deletes every other session for the account in the same transaction; keeps the current session; audit records the revoked-session count | — |
| `deleteAccountAction` | any session | password, confirm="DELETE" | Blocks employer with attached company; audit; deletes user (cascade); redirect `/` | — |
| `reportContentAction` | optional | targetType, targetId, reason, details? | Inserts `content_reports`; audit `report.created` | — |

Rate limits: enquiries 10/hour/user; reviews 5/day/user; reports 5/day/user or IP.

### 1.3 Employer (`src/app/employer/actions.ts`)

All actions require `employer` role and resolve the company owned by the session user; every query is
scoped by `companyId`.

| Action | Input | Effect |
| --- | --- | --- |
| `submitVerificationAction` | registrationNumber, address, contactPerson, businessEmail, website?, operatesOwnFleet, recruitsDirectly, contractingEntity, evidenceNotes (≥20), confirmTruth, confirmIdentityChange? | Computes identity/classification/operational changes; ordinary resubmission preserves completed checks; legal change resets to `submitted`, classification change to `identity_checked`; requires `confirmIdentityChange` for identity/classification changes when a verification record exists; stores a snapshot with `source: "employer_submission"`, identity hash, changes and confirmation; audit |
| `updateCompanyAction` | company profile schema + `confirmIdentityChange` (checkbox) | Detects legal-identity/classification/operational changes; requires confirmation for identity/classification edits when a check exists; resets to `unverified` (legal) or `identity_checked` (classification); downgrades `published_verified` vacancies in the same transaction; writes a `company_profile_update` record and audit snapshot |
| `saveVacancyAction` | full vacancy schema + vacancyId? + intendToPublish | Computes info score; enforces publishability; inserts or updates vacancy; redirects `/employer/vacancies` |
| `publishVacancyAction` | vacancyId | `resolveVacancyTransition` validates the current status and publishability; rejects suspended; sets published status and confirmation dates; audit |
| `reconfirmVacancyAction` | vacancyId | Only a live, complete vacancy may be reconfirmed; inserts `vacancy_reconfirmations`; sets `confirmed`, `last_confirmed_at`, `reconfirm_due_at`; audit |
| `expireVacancyAction` | vacancyId | Sets `expired`; audit |
| `respondToReviewAction` | reviewId, body (20–2000) | Requires the review to be `published`; rejects a second response; inserts `review_responses` with status `pending`; audit |
| `markEnquiryViewedAction` | enquiryId | Sets `viewed` + timestamp, scoped to company |

### 1.4 Admin (`src/app/admin/actions.ts`)

All actions call `requireAdmin()` and write an audit row.

| Action | Input | Effect |
| --- | --- | --- |
| `decideVerificationAction` | companyId, outcome (`identity_checked` / `direct_employer_checked` / `verified` / `needs_information` / `rejected`), notes ≥10 | Central resolver permits only the next stage; `needs_information` keeps the current status; `rejected` returns `unverified`; blocks suspended companies and advancement without a submitted identity snapshot or with an identity-hash mismatch; stores the reviewed identity snapshot; sets `verification_version` to 1 only on advancement; only trusted `verified` promotes vacancies; audit |
| `moderateReviewAction` | reviewId, outcome (`publish` / `reject` / `remove` / `under_review`), notes ≥10 | Resolves the transition through `resolveReviewModerationTransition` using status, `publishedAt` and recorded moderation history. `publishedAt` separates a never-published `under_review` row from a previously published one. A null `publishedAt` is never resolved from `moderatedAt`; only a recorded pending-to-under-review transition proves the review was never published. Legacy rows without that evidence fail closed with `publication_history_unknown`; contradictory history fails with `publication_history_conflict`. Rejected and removed are terminal. `publishedAt` is set once and preserved. Every decision and blocked attempt is audited with previous state, next state, evidence flags and reason |
| `moderateResponseAction` | responseId, outcome (`publish` / `reject`), notes ≥10 | Publishes or rejects a pending employer reply; audit |
| `setCompanySuspensionAction` | companyId, outcome (`suspend` / `restore`), reason (10–1000) | Suspends by setting `suspended_at`/`suspension_reason` without changing `verification_status`; snapshots live vacancy statuses into `suspended_from_status`; restoration is transactional, restores only company-suspended vacancies after publishability/trust checks, leaves individual suspensions alone, and audits both actions |
| `setVacancyModerationAction` | vacancyId, outcome (`suspend` / `restore` / `expire`), notes? | Resolves the action through `resolveVacancyModerationTransition` (KI-070). Suspension is allowed only from a live status and records the prior state in the audit log while leaving `suspended_from_status` null, so company restoration can never revive an individual decision. Restoration requires a suspended vacancy, an active company, a recorded live prior state and current publishability; restored trust and reconfirmation state are derived from current company verification. An invalid restore leaves the vacancy suspended and audits `admin.vacancy_moderation_blocked` with the reason. Expiry is allowed from a live or suspended state |
| `resolveReportAction` | reportId, outcome (`resolved` / `dismissed` / `investigating`), notes? | Resolved and dismissed are terminal; a later attempt writes `admin.report_moderation_blocked` and changes nothing. Audits previous state, next state and notes |
| `setUserActiveAction` | userId, outcome (`suspend` / `restore`), reason? | Toggles `is_active` and `suspended_reason`; an administrator cannot act on their own account. Suspension deletes the account's session rows in the same transaction, so previously issued cookies stop working in addition to the `isActive`/`suspendedReason` check in `getCurrentUser`. Audit records previous/next state and whether sessions were invalidated |

Audit logs are read through `listAdminAuditLogs` in `src/lib/admin-queries.ts`, called by the
role-guarded `/admin/audit` page. Audit reads are deliberately **not** Server Actions and must never
be exported from a `"use server"` module.

Admin list reads are paginated (`ADMIN_PAGE_SIZE = 20`, page bounded to 1–500) and filter values are
validated against the schema enums before reaching SQL. `listAdminUsers` selects an explicit safe
column set (id, email, role, display name, active state, suspension reason, timestamps); no password
hash, session token or reset token can enter an admin list result.

## 2. Verification contract

`src/lib/verification.ts` is the authority for these rules; actions and pages must not re-implement
them.

- **Identity-critical:** `legalName`, `tradingName`, `country`, `registrationNumber`,
  `registeredAddress`, `contractingEntity`.
- **Classification:** `companyType`, `recruitsDirectly`.
- **Operational:** `operatesOwnFleet`, `fleetSize`, `sectors`, `website`, `businessEmail`, `phone`,
  `contactPerson`, `description`.
- **Trust version:** `companies.verification_version` is `0` for legacy or unproven records and `1`
  only after a moderator advances a record against a reviewed identity snapshot. `verified` plus
  version `0` is **not** a full badge: it is excluded from `verifiedOnly`, cannot publish or promote
  `published_verified` vacancies, and is shown as “Verification requires review”. All badge, filter,
  publishing and vacancy-label paths must pass `(status, verificationVersion)` to
  `isFullyVerified`/`hasTrustedVerification`; status alone is never sufficient.
- **Missing snapshot:** a legacy row without a complete identity snapshot cannot be advanced. The
  moderator may only request information or reject; attempts are audited. Historical rows are not
  rewritten.
- **Moderator transitions:** `submitted → identity_checked → direct_employer_checked → verified`, with
  `needs_information` (status unchanged) and `rejected` (→ `unverified`) at each stage. A suspended
  company cannot be advanced. `verified` is the only full badge.
- **Resubmission:** no identity/classification change preserves the current status; legal change
  resets to `submitted`; classification change resets to `identity_checked` (or `submitted` if identity
  was not checked). A legacy verified company (version `0`) is forced to `submitted`; ordinary
  resubmission cannot manufacture a trusted badge.
- **Profile edit:** legal change → `unverified`; classification change → `identity_checked` (or the
  current status if identity was not checked); operational change → unchanged. Identity/classification
  edits require `confirmIdentityChange`, including through the verification form.
- **Snapshots:** `company_verifications.submitted_data` stores `identity`, `identityHash`,
  `reviewedIdentity`, `identityChanges`, `operationalChanges`, `source` and `identityChangeConfirmed`.
  A decision is blocked when the current identity hash differs from the submitted hash or the snapshot
  is missing. `source` is `employer_submission` for employer evidence, `company_profile_update` for a
  system-generated invalidation record, and absent for legacy rows.
- **Suspension:** `suspended_at` (or legacy `verification_status = 'suspended'`) makes a company
  suspended independently of its verification status. Public reads, vacancy URLs, reviews and employer
  writes reject suspended companies; the verification status is left intact for restoration.

## 3. Route handlers

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/api/me/export` | session | `application/json` attachment with account, profile, enquiries, reviews, saved items; `cache-control: no-store` |
| POST | `/api/internal/vacancy-lifecycle` | `Authorization: Bearer $VACANCY_LIFECYCLE_SECRET` | Runs the idempotent reconfirmation/expiry sweep and returns counts. 503 when the secret is not configured; 401 on a missing/incorrect bearer; GET is 405. No session/cookie auth. |

## 3a. Vacancy lifecycle contract

- Live statuses are swept: `published_unverified`, `published_verified`, `confirmed`,
  `reconfirmation_required`.
- Due date is `reconfirm_due_at`, falling back to `last_confirmed_at + 30 days`. A legacy live row with
  neither timestamp is treated as due now so the grace window starts rather than hiding it silently.
- On the due date the vacancy becomes `reconfirmation_required` (still public, visibly flagged). After
  a 7-day grace period it becomes `expired` (hidden from search, detail, saved lists and applications).
- Suspended vacancies and vacancies of suspended companies are skipped. Expiry never changes
  verification labels or company suspension.
- Each transition is conditional on the status that was read and writes an audit row
  (`vacancy.reconfirmation_required` or `vacancy.expired_by_lifecycle`); repeated runs are idempotent.
- Publishing an expired vacancy still goes through `resolveVacancySave` / `resolveVacancyTransition`,
  which require a complete advert. Expiry does not create a bypass.
- No scheduler is deployed with the repository. The route or `npm run vacancies:lifecycle -- --apply`
  must be scheduled by the operator.

No upload, webhook or health-check endpoint exists. The only internal trigger is the authenticated
vacancy lifecycle route above; no scheduler calls it.

## 4. Page-level data contracts

| Route | Reads |
| --- | --- |
| `/` | admin-style counts, company list, vacancy search |
| `/jobs` | `searchVacancies(filters)` + rating aggregation |
| `/jobs/[slug]` | vacancy + company + ratings; increments view count |
| `/companies` | `listCompanies(filters)` + ratings + open vacancy counts |
| `/companies/[slug]` | company, active vacancies, published reviews + responses, rating breakdown; identity/role checks derived from status and trust version; suspended company returns not found |
| `/companies/[slug]/reviews` | published reviews, breakdown; suspended company returns not found |
| `/dashboard` | driver dashboard aggregate |
| `/employer` | vacancies, enquiries, reviews, responses, rating breakdown; suspended companies see a blocking banner |
| `/employer/verification` | company, latest submission with provenance, derived identity/role checks, allowed stage; moderator notes are not rendered |
| `/admin` | stats, verification queue, reports, pending reviews, audit |
| `/admin/verifications` | queue including `direct_employer_checked`, latest submission, identity changes, recent identity/operational changes; missing-snapshot records are blocked |
| `/admin/companies` | company search/filter (`all`/`active`/`suspended`), suspension reason/date and suspend/restore forms |
| `/admin/vacancies` | paginated vacancy list filtered by validated status, previous suspension state, publishability, and only the moderation actions the transition resolver allows |
| `/admin/reviews` | paginated review list filtered by validated status; `publishedAt`/`moderatedAt` drive the allowed-outcome list |
| `/admin/reports` | paginated report list filtered by validated status; terminal reports render no action form |
| `/admin/users` | paginated account list with validated role/state/search filters and an explicit safe column set; suspend/restore forms |
| `/admin/audit` | paginated, read-only audit viewer filtered by validated entity type |

All are server-rendered and `force-dynamic`.

## 5. Missing endpoints required before launch

1. Email verification: issue/confirm token.
2. Password reset: request/confirm token with single-use expiry.
3. Notification delivery: new enquiry, verification decision, review moderation outcome.
4. CV upload/download with private object storage and signed URLs.
5. Account export for employers (company data, enquiries).
6. Reconfirmation job: flag/expire vacancies after 30 days.
7. Retention purge job.
8. Health check and readiness probe for deployment.

## 6. Error and status conventions

- 401 equivalent: redirect to `/login` (pages) or `{ error: "Sign in …" }` (actions).
- 403 equivalent: redirect to the user's own workspace (pages) or generic refusal (actions).
- Validation: field-level messages for auth forms; first issue message for other actions.
- Not found: `notFound()` for unknown, draft, suspended-company and suspended-vacancy public resources.
- Conflicts: duplicate review period, second employer response, duplicate email.

## 7. Security contract

- Every write validates input server-side with Zod.
- Every write resolves the session and checks role/ownership; never trusts IDs from the client alone.
- Ownership checks scope employer and driver operations by `company_id` / `driver_user_id`.
- Suspended companies are rejected at the query/action layer, not only hidden in the UI. Employer
  writes (`submitVerificationAction`, `saveVacancyAction`, `publishVacancyAction`,
  `reconfirmVacancyAction`, `updateCompanyAction`) call `isCompanySuspended`; admin decisions reject
  suspended companies; company restoration is admin-only.
- Server Actions rely on Next.js same-origin enforcement; no custom CSRF token.
- Rate limits are in-memory and per process; replace with shared storage before scaling.

## 8. HTTP authorization test harness

The authorization boundary is exercised against a real production build, not mocks or source
inspection.

```bash
npm run build
npm run test:http
```

- `npm run test:http` runs `tests/http/**/*.test.ts` with `vitest.http.config.ts`.
- Each suite creates/migrates `driverfirst_test` (default
  `postgres://postgres@127.0.0.1:55432/driverfirst_test`) and truncates it at suite setup.
- The harness starts `next start` with `DATABASE_URL` pointed at the test database (default port 3211),
  creates real session rows/cookies, posts the progressive-enhancement action form fields, and asserts
  both responses and database mutations.
- It covers unauthenticated, driver, employer and admin access, expired sessions, cross-company
  mutation, suspended-company publishing and unauthorized company/vacancy restoration.
- It requires a successful `npm run build` first; it does not build automatically and does not use a
  browser. The form parser depends on Next.js's rendered action fields and will need maintenance on a
  major Next upgrade.

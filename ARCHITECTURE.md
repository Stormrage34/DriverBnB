# Architecture — DriverCompass

**Version:** 1.2 · 13 November 2026
**Status:** Pre-alpha. No production deployment.

## 1. System context

```
Driver / Employer / Moderator
            │ HTTPS
            ▼
   Next.js 16 application (single deployment)
   ├── React Server Components (pages)
   ├── Server Actions (all writes)
   ├── Route Handlers (/api/me/export)
   └── Session auth (scrypt + DB sessions)
            │ SQL (postgres.js)
            ▼
   PostgreSQL 17 (EU-hosted in production)
```

No separate backend service, message queue, search cluster, object store or payment provider exists
in the MVP. This is deliberate: one deployable unit keeps the pilot operable by a small team.

## 2. Stack and rationale

| Layer | Choice | Rationale | Decision |
| --- | --- | --- | --- |
| Framework | Next.js 16 App Router | Server rendering, server actions, single deployment | D-001 |
| Language | TypeScript strict | Type safety across DB, validation and UI | D-002 |
| Styling | Tailwind CSS 4 + design tokens | Consistent, fast, no runtime CSS-in-JS | D-003 |
| Database | PostgreSQL 17 | Relational integrity, arrays, JSONB, strong EU hosting options | D-004 |
| ORM | Drizzle ORM + postgres.js | Typed SQL, explicit migrations, no codegen engine | D-005 |
| Validation | Zod 4 | Shared server-side schemas with clear errors | D-006 |
| Auth | Custom DB sessions, scrypt | No external identity provider; small, auditable surface | D-007 |
| Tests | Vitest unit/DB + built-app HTTP harness | Unit/DB and authorization coverage without a browser dependency | D-008, D-032 |

## 3. Repository and route map

```
src/app/
  layout.tsx                     Root document, fonts, metadata
  globals.css                    Tailwind theme tokens and base styles
  (public)/
    layout.tsx                   Site header/footer + demo-data banner
    page.tsx                     Home
    jobs/page.tsx                Search + filters
    jobs/[slug]/page.tsx         Vacancy detail + application
    companies/page.tsx           Directory
    companies/[slug]/page.tsx    Company profile
    companies/[slug]/reviews/    All reviews
    how-verification-works/      Trust explainer
    for-employers/               Commercial proposition
    about, contact, privacy, terms, review-policy, report
  (auth)/
    layout.tsx                   Split-screen auth shell
    login/page.tsx
    register/page.tsx            Driver/employer tabs
    actions.ts                   register/login/logout/contact
  dashboard/                     Driver workspace (role-guarded layout)
    page.tsx, profile, saved, applications, reviews, reviews/new, settings
    actions.ts                   profile, save, enquiry, review, report, password, delete
  employer/                      Employer workspace (role-guarded layout)
    page.tsx, company, verification, vacancies, vacancies/new, vacancies/[id]/edit,
    enquiries, reviews, billing
    actions.ts                   verification, company, vacancy lifecycle, replies
  admin/                         Moderation (role-guarded layout)
    page.tsx, verifications/, companies/, vacancies/, reviews/, reports/, users/, audit/
    actions.ts                   verification, company suspension, review, vacancy, report, user actions
  api/me/export/route.ts         GDPR JSON export
```

Route grouping affects layout only; URLs are `/jobs`, `/dashboard`, etc.

## 4. Rendering and data flow

- Pages are React Server Components. Database reads happen on the server through `src/lib/queries.ts`.
- Writes are Server Actions (`"use server"` modules). No public REST write API exists.
- All database-backed pages declare `dynamic = "force-dynamic"` to avoid build-time data access and
  stale caches.
- After mutations, actions call `revalidatePath` for affected public and workspace routes.
- Client components are limited to forms with local state/error handling (`useActionState`) and the
  dashboard navigation shell.

Request lifecycle for a write:

1. Browser posts a Server Action (Next.js enforces same-origin checks).
2. Action resolves the session user from the `df_session` cookie.
3. Role/ownership check (`requireRole`, `employerContext`, `driverOnly`, `requireAdmin`), including
   `isCompanySuspended` for employer writes and admin decisions.
4. Zod schema parses and normalises input.
5. Domain rules execute (publishability, suspension, duplicate review, enquiry status).
6. Drizzle writes inside a transaction where multiple tables change.
7. Audit row is written for sensitive actions.
8. `revalidatePath` refreshes affected server-rendered pages.
9. Action returns `{ error }` / `{ success }` or redirects.

## 5. Authentication and sessions

- Password hash: scrypt, N=32768, r=8, p=1, 64-byte key, 16-byte random salt; stored as
  `scrypt$N$r$p$salt$hash`.
- Session token: 32 random bytes (base64url), stored client-side in `df_session`; only its SHA-256 hash
  is stored in `sessions.token_hash`.
- Cookie: HTTP-only, SameSite=Lax, Secure in production, 30-day expiry, path `/`.
- `getCurrentUser()` is memoised per request with React `cache` and joins sessions to active users.
- Sign-out deletes the session row and clears the cookie.
- A password change keeps the current session and deletes every other session for the account in the
  same transaction. Account suspension deletes all sessions and `getCurrentUser` also rejects
  inactive/suspended users.
- Email verification and password reset use `user_tokens`: 32 random bytes, SHA-256 hash at rest,
  single use, 24h verification / 1h reset expiry. Issuance serialises on the user row; consumption is
  an atomic conditional update. Password reset replaces the hash and deletes every session in the same
  transaction and does not create a new session.
- Admin bootstrap and invite-only pilot verification are operator CLI procedures only; there is no
  HTTP bootstrap endpoint. They set `email_verified_at` and write an atomic operator audit row.
- Email delivery is provider-independent. `EMAIL_PROVIDER=disabled` is the default; `test` captures
  messages in memory. No production provider is configured.

## 6. Authorization model

| Surface | Enforcement |
| --- | --- |
| Public pages | No auth; suspended companies filtered in queries; direct company/vacancy/review URLs return not found; private data never selected |
| Driver workspace | `dashboard/layout.tsx` calls `requireDriverPage()`; actions call `driverOnly()` |
| Employer workspace | `employer/layout.tsx` calls `requireEmployerPage()` and resolves the owned company; actions call `employerContext()`, scope every query by `companyId`, and reject suspended companies |
| Admin workspace | `admin/layout.tsx` calls `requireAdminPage()`, which also requires a verified email; every admin action calls `requireAdmin()` with the same check |
| Data export | Route handler checks `getCurrentUser()` |

Layout guards are not the only control: every server action re-checks the role and ownership. This is
required because Server Actions are addressable endpoints, not protected by page layouts.

The expected role/resource access and its test evidence are recorded in `PERMISSION_MATRIX.md`.

## 7. Data access

- `src/db/schema.ts` is the single schema source; migrations are generated into `drizzle/` and applied
  with `drizzle-kit migrate`. T-002d adds `companies.verification_version` and
  `vacancies.suspended_from_status`; T-005 adds the additive `user_tokens` table and its indexes.
  `0002_normal_angel.sql` is applied to `driverfirst_test` only. The baseline migration is immutable.
- `src/lib/queries.ts` centralises read queries, including search filtering, ratings aggregation,
  employer inboxes and admin queues.
- Money is stored as integer EUR minor-unit-free whole euros (`gross_pay_min/max`), with `pay_period`
  and `currency`. Monthly comparison is computed in SQL for filtering and in the UI for display.
- Structured lists (licences, countries, languages) use PostgreSQL text arrays.
- Allowances use JSONB (`{label, amount, currency, note}[]`).

## 8. Security controls

Implemented:

- Server-side validation with Zod on every write path.
- Password hashing and hashed session tokens.
- HTTP-only, SameSite cookies.
- Generic login errors; rate limiting for registration, login, contact, enquiry, review and reports
  (in-memory, per process).
- Security headers in `next.config.ts`: CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options: DENY`, restrictive `Permissions-Policy`, COOP/CORP; `poweredByHeader: false`.
  HSTS is off unless `ENABLE_HSTS=true`.
- Client IP is derived only when `TRUST_PROXY=true`; otherwise forwarding headers are ignored and a
  local rate-limit key is used.
- Hashed, single-use account tokens for verification and password reset; password reset revokes all
  sessions transactionally.
- Verified-email enforcement in the sensitive Server Actions and admin guard.
- Operator-only bootstrap/pilot verification with an atomic audit row.
- Audit logging for verification, moderation, company suspension/restoration, profile and vacancy
  changes, account-security events and operator verification.
- Server-layer suspension enforcement across public queries, direct URLs and employer writes.
- Authorization exercised at the built HTTP boundary with real sessions and database mutation checks
  (`npm run test:http` after `npm run build`); no browser suite exists.
- No third-party analytics or advertising scripts.

Not implemented:

- A production transactional email provider (self-service verification/reset delivery remains off).
- Distributed rate limiting (multi-instance).
- MFA.
- Malware scanning for uploads (no upload surface yet).
- Error monitoring / alerting.
- A deployed scheduler for the vacancy lifecycle.

## 9. Privacy architecture

- Driver profile and CV fields are separate from the public `users` identity and never joined into
  public queries.
- Enquiries store only the contact details explicitly shared per message; otherwise columns are null.
  `getEmployerEnquiries` deliberately does not select the driver's account email, and the enquiry form
  offers phone sharing only when a phone is stored and shows the exact email that will be shared.
- Suspended companies disappear from saved-company and saved-vacancy lists at query level, not only
  from the rendered page.
- Public company profiles expose business identity, not personal data of employees.
- Account deletion cascades sessions, profile, saved items, enquiries and reviews.
- Export route returns account, profile, enquiries, reviews and saved items as JSON.
- Retention rules are stated in the privacy notice but no scheduled purge job exists.

## 10. Verification identity, trust version and evidence model

`src/lib/verification.ts` is the single authority:

- **Identity** — legal name, trading name, country, registration number, registered address,
  contracting entity.
- **Classification** — company type, direct-recruitment declaration.
- **Operational** — fleet size, sectors, website, contact details, description; audited but never
  auto-invalidating.
- **State** — `unverified → submitted → identity_checked → direct_employer_checked → verified`, plus
  the legacy `suspended` value. Moderator decisions can advance one stage, request information without
  changing status, or reject to `unverified`. `verified` is the only full badge.
- **Trust version** — `companies.verification_version` is `0` for legacy/unproven data and becomes `1`
  only when a moderator advances a record against a reviewed identity snapshot. `verified` plus
  version `0` is untrusted: no public full badge, no verified filter, no `published_verified`
  promotion, and the label reads “Verification requires review”. Every component/action passes
  `(status, version)` to the central predicates; there is no status-only path.
- **Missing snapshot** — a legacy record without a complete identity snapshot cannot be advanced.
  The moderator may request information or reject; blocked attempts are audited. Historical rows are
  never rewritten.
- **Invalidation** — a legal-identity profile change resets to `unverified`; a classification change
  resets to `identity_checked`; ordinary evidence resubmission preserves completed checks. A legal
  change via the verification form resets to `submitted`. Identity/classification changes through both
  routes require `confirmIdentityChange`, recorded in the audit and submission metadata.
- **Consistency** — losing trust rewrites `published_verified` vacancies to `published_unverified` in
  the same transaction; `confirmed` vacancies are left alone because their label does not claim
  verification. Public badges read live company status and version.
- **Evidence provenance** — submission snapshots, hashes, reviewed snapshots and change lists live in
  `company_verifications.submitted_data` and `audit_logs.metadata`. `source` distinguishes
  `employer_submission` from `company_profile_update`; rows without it are legacy/unrecorded.
  Moderator `decisionNotes` never reach employer or public pages. A mismatch between the current
  identity hash and the submitted hash blocks advancement. Hashing lives in
  `src/lib/verification-hash.ts` (Node-only); the shared model stays client-safe.

## 11. Company suspension and restoration

Suspension is an administrative state independent of verification:

- A new suspension sets `companies.suspended_at` and `suspension_reason`; it does **not** overwrite
  `verification_status`. Legacy rows with `verification_status = 'suspended'` are also treated as
  suspended.
- Every public query that can return companies, vacancies or reviews filters `suspended_at IS NULL`
  and `verification_status <> 'suspended'`; direct company, review and vacancy URLs call `notFound()`.
  Employer writes and verification decisions reject suspended companies in the action, not only in the
  layout.
- On suspension, live vacancy statuses are copied to `vacancies.suspended_from_status` in the same
  transaction. Suspension never deletes company or vacancy rows.
- On restoration, only vacancies with a non-null `suspended_from_status` are candidates; individual
  suspensions are excluded and must be restored from `/admin/vacancies` with their own audit context.
  A non-live/ambiguous prior status also stays suspended; an unpublishable vacancy becomes `draft`. A
  live vacancy is restored to its prior class, with `published_verified` only when the company is
  currently trusted.
- Suspension and restoration both require an admin reason, run transactionally where multiple rows
  change, and write audit records. Restoration does not resurrect expired/rejected/draft states or
  override a separate administrative decision.
- An individual vacancy suspension stores `suspended_from_status = NULL`, so the company-restoration
  loop can never select it. Its previous public state is recorded in the `admin.vacancy_suspend` audit
  event and resolved by `resolveVacancyModerationTransition` when a moderator restores it manually.
  Without that record, restoration fails closed and leaves the vacancy suspended.
- Restoration is not a status write. `resolveVacancyModerationTransition` validates the current state,
  the recorded prior state, company suspension, current verification trust, publishability and
  reconfirmation age. An invalid or incomplete restore writes `admin.vacancy_moderation_blocked` and
  leaves the vacancy non-public.
- Review moderation is a separate explicit model in `src/lib/reviews.ts`. `publishedAt` distinguishes a
  never-published `under_review` review from one reopened after publication without a schema change.
  A non-null `moderatedAt` is not proof of never-publishing: only a recorded pending-to-under-review
  transition in the moderation audit trail proves it. Missing or contradictory evidence fails closed.
  Rejected and removed reviews are terminal for ordinary moderation.
- Suspending a user deletes their session rows in the same transaction. `getCurrentUser` also filters
  on `is_active` and `suspended_reason`, so the check holds even for a session row created before the
  suspension.
- Vacancy reconfirmation and expiry live in `src/lib/vacancy-lifecycle.ts`. The sweep is idempotent,
  conditional on the status it read, skips suspended vacancies and suspended companies, and writes one
  audit row per transition. It is exposed only through an authenticated internal route and a manual
  script; no scheduler is deployed by this repository.

## 12. Deployment target (not yet implemented)

- Single Next.js deployment in an EU region.
- Managed PostgreSQL in the same region, TLS required, automated backups, PITR.
- Secrets via environment variables, never committed.
- Reverse proxy/WAF with HSTS and CSP at the edge if not set by the app; it must overwrite
  `X-Forwarded-For` so audit IPs and rate-limit keys are trustworthy.
- A scheduler must call `POST /api/internal/vacancy-lifecycle` at least daily with
  `VACANCY_LIFECYCLE_SECRET`. The repository does not ship a scheduler; without this call, vacancy
  expiry is not active.
- No CI/CD pipeline, Dockerfile or infrastructure code exists yet.

## 13. Known architectural risks

1. Process-local rate limiting cannot survive horizontal scaling.
2. No background job runner: vacancy reconfirmation expiry, retention purges and email notifications
   have no execution mechanism.
3. Five admin surfaces (vacancies, reviews, reports, users, audit) remain absent, and individual
   vacancy suspension has no screen, so some trust operations still require database access —
   unacceptable for launch.
4. Custom auth shifts security responsibility to this codebase; the HTTP harness covers the main
   authorization paths, but a full permission/privacy suite and browser E2E are still required.
5. Legal classification of the service (employment intermediation, Platform Work Directive) is
   unresolved and may constrain features, not just copy.

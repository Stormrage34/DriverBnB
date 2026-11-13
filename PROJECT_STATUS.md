# Project Status — DriverCompass

**As of:** 13 November 2026
**Phase:** 0 — Stabilisation. T-001 through T-005 complete. Phase 2 product completion, Phase 3 rebrand to DriverCompass and Phase 4 post-rebrand audit are complete; P1 audit findings are fixed. Production email delivery, scheduler and deployment remain intentionally absent.
**Overall:** Pre-alpha. Build, typecheck, unit/DB and HTTP authorization tests pass. Public browser smoke tests pass; no full browser journey or assistive-technology audit. A production email provider, shared rate limiting, scheduler, monitoring, legal review and deployment configuration are not present.

## 1. Environment

| Item | State |
| --- | --- |
| Repository | `/home/stormrage/DriverCompass` |
| Version control | Git, branch `main` |
| Node.js | 26.13.1 |
| Package manager | npm 12.2.2 |
| Database (development) | PostgreSQL 17.11 at `127.0.0.1:55432`, database `driverfirst` |
| Database (tests) | `driverfirst_test`, created and migrated by the test harness |
| Migrations | `0000_crazy_norrin_radd.sql`, `0001_t002d_trust_stabilization.sql` and `0002_normal_angel.sql`; `0002` adds `user_tokens` and is applied to `driverfirst_test` only. 20 tables |
| Development data | 0 companies, 0 vacancies; no seed script |
| Deployment | None |

## 2. Verification matrix (post-Phase 2)

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | **PASS** — 0 errors | `npx tsc --noEmit` |
| Production build | **PASS** — 0 errors | `npm run build` |
| Unit/DB tests | **PASS** — 173 tests in 18 files | `npm test` (Vitest) |
| HTTP authorization tests | **PASS** — 74 tests in 10 files | `npm run test:http` against the built app and `driverfirst_test` |
| Manual lifecycle script | **PASS** — dry run, 0 rows in the empty development DB | `npm run vacancies:lifecycle` |
| Browser E2E / mobile QA | **PARTIAL** — public smoke and responsive filter checks; no authenticated journeys | Browser checks at 390px/1280px; HTTP forms otherwise |
| Seed data | **MISSING** | Not authorized in T-004 |
| Email verification / reset | **IMPLEMENTED, PRODUCTION DELIVERY DISABLED** | `user_tokens`, verification/password-reset pages and actions, test adapter; no production provider |
| Trusted proxy / CSP | **IMPLEMENTED** | `TRUST_PROXY` fail-safe; CSP and conditional HSTS in `next.config.ts` |
| Deployed scheduler | **NOT CONFIGURED** | Internal lifecycle route and dry-run script exist; no schedule is active |
| Legal review | **NOT STARTED** | — |

Test coverage now proves: the full moderator transition matrix; legacy snapshot refusal; version-gated
badges and filters; company suspension and restoration; public/direct-URL exclusion; employer write
blocking; individual-suspension preservation; invalid-vacancy restoration to draft; evidence
provenance boundaries; identity confirmation on both employer routes; and HTTP-level unauthorized,
cross-company, expired-session and role-escalation attempts with database mutation checks.

## 3. Implemented surfaces (code present)

Public: home, job search with filters, vacancy detail, company directory, company profile, review pages,
verification explainer, for-employers, about, contact, privacy, terms, review policy, report.

Authentication: driver and employer registration, login, logout, role redirects, rate limiting.

Driver workspace: overview, profile with privacy controls, saved vacancies/companies, enquiry history,
review submission, account settings, password change, JSON export, account deletion.

Employer workspace: company profile editor, verification submission, vacancy create/edit/publish/
reconfirm/expire, enquiry inbox, review replies (pre-moderated), billing placeholder.

Admin: dashboard, verification queue with employer evidence and decision recording, company
suspension/restoration, vacancy moderation, review moderation, report handling, user suspension and a
read-only audit viewer. Every admin page is role-guarded; list reads are paginated.

## 4. Fixed in T-005

- **Account tokens are hashed at rest and single-use.** Additive `user_tokens` (UUID, cascade FK,
  purpose enum, unique hash, 24h/1h expiry, partial unique index for one live token per purpose).
  Issuance serialises on the user row; consumption is atomic; password reset and verification update
  the account in the same transaction. Applied to `driverfirst_test` only.
- **Email verification and password reset flows exist.** Registration issues a 24h verification
  token; `/verify-email` consumes it in a POST; `/forgot-password` and `/reset-password` implement a
  1h single-use reset that revokes every session and does not auto-login. Registration/resend/reset
  responses are generic and do not disclose account existence.
- **Verified-email enforcement is server-side.** Enquiries, reviews, vacancy publishing and
  verification-evidence submission require `email_verified_at`; admin pages and admin actions require
  a verified admin. Direct Server Action posts are tested; UI banners are advisory only.
- **Admin bootstrap and pilot verification are operator-only.** `npm run users:verify-email` targets
  the exact account, checks the role, requires `--confirm-control`, and writes an atomic
  `user.email_verified_operator` audit row with operator, reason and target. No HTTP endpoint exists.
- **Email delivery is provider-independent and fail-safe.** `EMAIL_PROVIDER=disabled` by default;
  `test` captures in memory; no production adapter or credentials are invented.
- **Trusted proxy and headers hardened.** `TRUST_PROXY=false` ignores forwarding headers; CSP,
  frame-deny, COOP/CORP are set; HSTS only with `ENABLE_HSTS=true`.
- **Lifecycle observability added.** The internal route and manual script emit a structured
  `vacancy_lifecycle_run` event with counts and duration, never personal data.
- **EU-first, retention and badge assessments documented** in `EU_FIRST_ARCHITECTURE.md`,
  `KI-040_REVIEW_RETENTION_OPTIONS.md` and `KI-045_STATUS_MATRIX.md`; badge wording was not changed.

## 4. Fixed in T-004

- **Legacy review moderation fails closed without recorded evidence.** A non-null `moderatedAt` no
  longer proves a review was never published; only a recorded pending-to-under-review transition does.
  Missing evidence yields `publication_history_unknown`; contradictory evidence yields
  `publication_history_conflict`; both change nothing and write a blocked audit row.
- **Password changes revoke other sessions.** The current session remains valid; all other session rows
  are deleted transactionally and the audit records the count.
- **Vacancy reconfirmation and expiry exist.** A due live vacancy becomes `reconfirmation_required`,
  then `expired` after a 7-day grace period. The sweep is idempotent, skips suspended vacancies and
  suspended companies, audits each transition, and is exposed through an authenticated internal route
  and a dry-run-first script. No scheduler is deployed.
- **Expired vacancies leave the driver's saved list**, not only public search and detail pages.
- **Permission matrix and tenant-isolation tests.** Drivers, employers, other employers, suspended
  users, visitors and admins are exercised against reads, direct action posts, exports and evidence.
- **Account-token migration proposed, not applied.** Email verification and password reset remain
  unimplemented pending approval of an additive `user_tokens` table and an email-delivery decision.

## 4a. Fixed in T-003

- **Administration is operable without database access.** `/admin/vacancies`, `/admin/reviews`,
  `/admin/reports`, `/admin/users` and `/admin/audit` exist, are role-guarded, paginated and filtered
  against validated enum values, and call existing actions rather than duplicating them.
- **Vacancy restoration is a validated transition.** `resolveVacancyModerationTransition` requires a
  suspended vacancy, an active company, a recorded live prior state and current publishability;
  individual suspensions keep `suspended_from_status = NULL` and use their audit-recorded prior state.
  Invalid restores leave the vacancy non-public and write a blocked audit event.
- **Review moderation has an explicit model.** `publishedAt` separates never-published from reopened
  `under_review` rows; legacy rows with no publication history fail closed; rejected and removed are
  terminal.
- **User suspension invalidates existing sessions.** Session rows are deleted transactionally and the
  session lookup also rejects inactive or suspended accounts.
- **Enquiry payloads no longer carry the driver's account email.** Only contact details stored on the
  enquiry are returned; the form shows the exact email and hides phone sharing when no phone exists.
- **Unsupported privacy controls removed.** “Employers may request contact” and “searchable by
  employer” are gone because neither feature exists; stored flags are forced private.
- **Suspended companies cannot leak through saved lists or new reviews.** Query-level filters cover
  saved companies, saved vacancies and the review company picker; review submission uses the central
  `isCompanySuspended` helper for both suspension representations.

## 4a. Fixed in T-002d

- **Legacy verification is untrusted by default.** `verification_version` defaults to 0 and becomes 1
  only when a moderator records a decision against a reviewed identity snapshot. Legacy `verified`
  companies show “Verification requires review”, are excluded from verified filters, cannot publish
  or promote `published_verified` vacancies, and are forced back to `submitted` on resubmission.
- **Missing snapshots block advancement.** A moderator cannot advance a verification record without
  an identity snapshot/hash; only request-information or reject remain. Historical rows are never
  rewritten.
- **Company suspension is enforced centrally.** Admin suspend/restore requires a reason and writes an
  audit record. Suspended companies disappear from company directories, job search, company pages,
  vacancy URLs, reviews and employer writes. Suspension leaves verification status intact.
- **Vacancy restoration is conservative.** Company-suspended vacancies store their prior status;
  individual admin suspensions clear that marker and are never restored by company action; invalid
  vacancies go to draft; ambiguous/non-live states stay suspended; verified labels return only for a
  currently trusted company.
- **Evidence provenance is explicit.** Employer evidence, system profile-change records and legacy
  records are labelled separately; moderator notes are admin-only and never appear on employer or
  public pages.
- **Identity confirmation is enforced on both routes.** Profile edits and verification submissions
  require the dedicated confirmation checkbox when identity/classification changes; confirmation is
  audited. Operational changes do not invalidate identity.
- **HTTP boundary tests:** 17 tests against the built app and test database, including unauthorized
  verification decisions, cross-company vacancy mutation, expired sessions, employer suspension
  attempts, suspended-company publishing and unauthorized restoration.
- **Regression tests:** 106 unit/DB tests in 9 files plus 17 HTTP tests in 3 files.

## 4b. Fixed in T-002c

- **Verified identity is defined and protected.** Legal name, trading name, country, registration
  number, registered address and contracting entity are identity-critical. Company type and
  direct-recruitment declaration are classification fields. Operational fields never auto-invalidate.
- **Invalidation is automatic and visible.** A profile legal-identity change resets the company to
  `unverified`; a direct-employer-to-agency (or other classification) change resets it to
  `identity_checked`. The form requires confirmation, and the audit record stores previous/current
  values. Losing `verified` downgrades `published_verified` vacancies to `published_unverified` in the
  same transaction; vacancies stay published.
- **Ordinary resubmission preserves earned checks.** Submitting updated evidence without changing
  identity or classification leaves `identity_checked`, `direct_employer_checked` or `verified`
  intact.
- **The queue no longer dead-ends.** `direct_employer_checked` is included; the server permits only
  the next stage (`submitted → identity_checked → direct_employer_checked → verified`) plus
  `needs_information` and `rejected`. The UI lists only allowed outcomes and shows identity/role
  checks separately with changed fields and previous/current values.
- **One verification model.** `src/lib/verification.ts` owns snapshots, hashes, change
  classification, derived checks, labels, allowed outcomes and the full-badge predicate. Filters,
  badges, vacancy lifecycle actions and both workspaces use it. `verifiedOnly` means `verified` only;
  `directOnly` remains a separate company-type filter.
- **Identity mismatch blocks advancement.** If the current company identity hash differs from the
  submission, the moderator can only request information or reject. Blocked attempts are audited.
- **Regression tests:** 58 new tests; total 97 in 8 files.

## 4c. Fixed in T-002b

- **H1:** audit-log read removed from the `"use server"` module and served through the guarded admin
  page via `getAuditLogs`; no audit read is an addressable Server Action.
- **H2:** `resolveVacancyTransition` is the single authority for publish/reconfirm. Draft vacancies
  cannot be reconfirmed into visibility, and admin-suspended vacancies cannot be published or
  reconfirmed by their owner. Incomplete live vacancies cannot be reconfirmed.
- **H3:** the verification queue loads the latest `company_verifications` submission and displays the
  employer's evidence. Moderator decision notes stay private and no longer prefill the employer form.
- **H4:** replies are allowed only on published reviews and stored as `pending`; moderators publish or
  reject them from the admin dashboard. Public queries show published replies only.
- Regression tests: 39 total, including DB-backed evidence and reply separation.

## 5. Missing or incomplete

- `verification_version` defaults to 0, so imported/pre-existing verified data loses the badge until
  re-reviewed. The development DB is empty.
- No per-stage timestamps; identity and role decision times live only in the audit log.
- Email verification and password reset are not implemented; the additive token-table migration is
  proposed but not approved (`T-004_MIGRATION_PROPOSAL.md`).
- No notification/email delivery, so verification/reset cannot be operated even after the token table.
- The vacancy lifecycle mechanism exists, but no scheduler is deployed. Until the internal route or
  script is scheduled, expiry is not active in production.
- No CV upload or comparison view.
- No browser E2E, accessibility audit or mobile QA; HTTP tests exercise the server boundary without a
  browser.
- No CI, Dockerfile, deployment configuration, sitemap or robots.
- Legal and regulatory review outstanding.

Full inventory: `KNOWN_ISSUES.md`; operational classification in `T-004_OPERATIONAL_RISKS.md`.

## 6. Blockers to a pilot

1. Account security: email verification/password reset (migration approval + email delivery), or an
   explicit decision to pilot with manually vetted, unverified accounts.
2. A deployed scheduler for vacancy reconfirmation/expiry, plus a trusted-proxy decision for
   `X-Forwarded-For` and HSTS.
3. Legal review of employment intermediation, Platform Work Directive, DSA and pay transparency in NL.
4. Repeatable fictional seed dataset for evaluation.
5. Browser QA and mobile QA; the HTTP harness is not a browser test.
6. EU-region deployment with managed PostgreSQL, backups and monitoring.

## 7. Next tasks

| ID | Task | Status |
| --- | --- | --- |
| T-001 | Repository baseline and nine project documents | Complete — `5004795` |
| T-002 | Green build and P1 integrity fixes | Complete — `4d042b2` |
| T-002b | Audit hotfix H1–H4 | Complete — code `9aaf88a`; docs `8af4230` |
| T-002c | Verification identity integrity and workflow completion (KI-037, KI-038) | Complete — code `b854987` + `ffa5b66`; docs `449a3e5` |
| T-002d | Trust and security stabilization (KI-043, KI-060, KI-061, KI-063, KI-064) | Code complete — `8b22888`; documentation completed separately |
| T-003 | Administration, moderation and privacy stabilization (KI-005, KI-044, KI-051, KI-054, KI-067, KI-070, KI-071, KI-072) | Code complete — `2bb25fd` + test follow-up `a299238`; documentation completed separately |
| T-004 | Pilot readiness: moderation evidence, session revocation, vacancy lifecycle, permission matrix | Code complete — `d7be5da`, `ddc0d68`, `42bbaa2`, `5939f1d`; documentation completed separately. Two approval gates outstanding: token migration and scheduler |
| T-005 | Full permission and privacy test suite | Not approved |

## 8. Honest assessment

The trust chain now has three enforceable guarantees rather than labels: a verified badge requires a
moderator decision backed by an identity snapshot; losing trust immediately changes public labels and
filters; and a suspended company disappears from every public path while its records and verification
history remain intact. The HTTP suite now proves the authorization boundary with real sessions and
database mutations, including attempted cross-company and suspension bypasses. T-004 adds an enforced
review-history distinction, password-change session revocation, a tested vacancy expiry lifecycle and a
documented role/permission matrix.

The limits are equally clear. Email verification and password reset are not implemented: both need an
approved additive token table and an email-delivery decision. Vacancy expiry exists but is not active
in production until a scheduler calls it. Rate limiting, HSTS/CSP and trusted-proxy handling remain
deployment-dependent. The build is still not browser-tested and no external legal review has happened.
The migration intentionally invalidates pre-existing verified rows until review; that is safe for this
empty pilot database but must be communicated before importing real data. Stop here for founder
review; do not start T-005.

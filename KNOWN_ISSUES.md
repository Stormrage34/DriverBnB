# Known Issues — DriverCompass

**As of:** 13 November 2026 (after Phase 4 audit)
**Severity:** P0 = active security exposure; P1 = blocks a trustworthy pilot; P2 = must fix before launch; P3 = improvement.

## 0d. Resolved in Phase 4 audit (13 November 2026)

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| P1-01 | P1 | Drizzle ORM 0.44.7 had a high-severity SQL-identifier injection advisory | Upgraded to `drizzle-orm@0.45.4`; production dependency audit is clean | `npm audit --omit=dev` |
| P1-02 | P1 | `EMAIL_PROVIDER=test` was accepted in production and silently discarded mail | Production now requires an explicitly local `APP_BASE_URL`; otherwise the disabled provider is used | `tests/email.test.ts` |
| P1-03 | P1 | Shared UI defaulted to NL/BG and used a Dutch registration-number label | Country defaults cleared; registration-number label is jurisdiction-neutral | registration forms, home search |

## 0c. Resolved in Phase 2 product polish (13 November 2026)

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| KI-042 | P2 | Invalid filter values could produce a server error | Country, category, accommodation, loading, pay and page inputs are validated or discarded before querying; page clamped 1–500 | `tests/http/jobs-filters.test.ts` |
| KI-046 | P3 | Demo labelling was missing on cards | Company and vacancy cards render a “Demo data” badge when `isDemoSeed` is set | components; HTTP render |
| KI-047 | P3 | Review credibility copy overstated verification | “Driver-reported” badge and a self-declaration caveat replace “Employment attested” | `components/review-card.tsx` |
| KI-050 | P2 | Registration from a vacancy lost the return path | `next` is validated and carried through registration and email verification back to the vacancy | registration/verify actions and forms |
| KI-055 | P3 | Mobile filter panel was always open | Panel is collapsed by default and expanded by CSS on desktop; works without JavaScript | `jobs/page.tsx`, `globals.css` |
| KI-056 | P3 | Empty search state blamed filters on an empty board | Distinct empty-board and no-matching-results states | `jobs/page.tsx` |
| KI-058 | P3 | Render-time view counter inflated social proof | View counter removed from the vacancy detail and query layer | `jobs/[slug]/page.tsx`, `queries.ts` |
| KI-022 | P3 | No custom 404, error or loading boundaries | Root 404 and error boundary added; public loading skeleton removed after it broke redirect status semantics | `app/not-found.tsx`, `app/error.tsx` |
| KI-024 | P3 | Accessibility gaps | Skip link, `main-content` target, pagination labels/44px-style targets and alert semantics added; remaining manual audit items stay open | UI and HTTP render |

## 0b. Resolved in T-005 (13 November 2026)

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| KI-008 | P1 | No email verification; any email could be registered | Additive `user_tokens`, 24h hashed single-use verification tokens, `/verify-email` POST consumption, resend with rotation, registration generic response. Production email delivery is still disabled without a provider (KI-013). | `tests/user-tokens.test.ts`, `tests/http/t005-account-security.test.ts`, `tests/email.test.ts` |
| KI-009 | P2 | No password reset flow | 1h hashed single-use reset tokens, generic request response, atomic consumption, password update and deletion of every session; no automatic login. | `tests/user-tokens.test.ts`, `tests/http/t005-account-security.test.ts` |
| KI-015 | P2 | No CSP or HSTS | Application CSP with frame-ancestors/base-uri/form-action/object-src restrictions; HSTS only when `ENABLE_HSTS=true` after HTTPS verification. | `tests/http/t005-account-security.test.ts`, `next.config.ts` |
| KI-057 | P2 | Client IP trusted the first `X-Forwarded-For` value without a trusted-proxy check | `TRUST_PROXY=false` by default ignores forwarding headers and uses a local key; only an explicitly declared proxy may supply the client IP. | `tests/trusted-proxy.test.ts` |

## 0a. Resolved in T-004 (13 November 2026)

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| KI-041 | P2 | Password change did not revoke other sessions | `changePasswordAction` keeps the current session and deletes every other session in the same transaction; the audit records the count. Existing-session and new-login behaviour is asserted. | `tests/http/account-security.test.ts` |
| KI-049 | P2 | Reconfirmation never expired and `reconfirmation_required` was never written | `src/lib/vacancy-lifecycle.ts` marks live vacancies `reconfirmation_required` on their due date and expires them after a 7-day grace period; idempotent, audit-logged, skips suspended vacancies/companies. The sweep is runnable via `npm run vacancies:lifecycle` or the authenticated internal route. | `tests/vacancy-lifecycle.test.ts`, `tests/vacancy-lifecycle.integration.test.ts`, `tests/http/vacancy-lifecycle.test.ts` |

## 0. Resolved in T-003 (13 November 2026)

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| KI-005 | P1 | Five admin pages absent: vacancies, reviews, reports, users, audit | Implemented all five with `requireAdminPage`, validated status/role/entity filters, bounded pagination (20 per page, page capped at 500), the existing Server Actions, and a read-only audit viewer | `tests/http/admin-moderation.test.ts`, `tests/admin-queries.test.ts` |
| KI-044 | P2 | Enquiry query returned the driver's account email regardless of consent | `getEmployerEnquiries` no longer selects the account email or driver user id; only `shared_email`/`shared_phone` stored on the enquiry reach the employer | `tests/admin-queries.test.ts`, `tests/http/privacy.test.ts` |
| KI-051 | P2 | Privacy controls offered employer search and contact requests that did not exist | Removed both controls; the profile form states the profile is private, stored flags are forced to `private`/`false`, and the dashboard posture copy now describes reality | `tests/http/privacy.test.ts`, `components/driver-profile-form.tsx` |
| KI-054 | P2 | Enquiry consent copy named the account email while the action sent the profile email; phone option appeared without a stored phone | The form is passed the exact shareable email and the phone checkbox only renders when a phone exists; the action stores only those values | `tests/http/privacy.test.ts` |
| KI-067 | P1 | Individual vacancy suspension/restoration had no admin screen | `/admin/vacancies` provides suspend/restore/expire. Individual suspensions keep `suspended_from_status = NULL`; their prior state is read from the suspension audit event, and the restore is validated before any status change | `tests/http/admin-moderation.test.ts`, `tests/vacancy-moderation.test.ts` |
| KI-070 | P1 | Restoration wrote a published status without validating prior state, completeness, trust or reconfirmation | Central `resolveVacancyModerationTransition` validates current state, recorded prior state, company suspension, current trust, publishability and reconfirmation age; invalid restores stay non-public and write `admin.vacancy_moderation_blocked` | `tests/vacancy-moderation.test.ts`, `tests/http/admin-moderation.test.ts` |
| KI-071 | P1 | Review moderation accepted any outcome from any status and could republish rejected/removed reviews | Explicit transition model in `src/lib/reviews.ts`. `publishedAt` distinguishes never-published from reopened `under_review`; legacy rows with no publication history fail closed; rejected/removed are terminal; every decision and block is audited with previous/next state | `tests/review-moderation.test.ts`, `tests/http/admin-moderation.test.ts` |
| KI-072 | P2 | Review submission checked only the legacy `verification_status = 'suspended'` state | Submission now uses `isCompanySuspended` (`suspended_at` or legacy status), and the review company picker filters both representations | `tests/http/privacy.test.ts` |

## 1. Resolved in T-002d

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| KI-043 | P2 | No company suspension action; public company page and vacancy detail did not check company suspension by URL | Added admin suspension/restoration with mandatory reasons and audit; all public queries, direct URLs, reviews and employer writes enforce suspension centrally; vacancy prior status is preserved for safe restoration | `tests/http/suspension.test.ts`, `tests/company-suspension.test.ts` |
| KI-060 | P2 | Verification decisions and identity invalidation were tested only through the resolver and DB queries, not the Server Action boundary | Added a built-app HTTP harness with real sessions, progressive form posting and DB mutation assertions for unauthorized, cross-company, expired-session and role-escalation paths | `tests/http/*.test.ts`, `tests/helpers/http-server.ts` |
| KI-061 | P3 | Legacy verification rows without an identity snapshot bypassed the identity-mismatch guard | A missing snapshot now blocks verification advancement; `verification_version=0` makes legacy verified states untrusted in badges, filters, publishing and vacancy labels; resubmission is forced to review | `tests/http/verification-trust.test.ts`, `tests/verification-state.test.ts` |
| KI-063 | P3 | System-generated profile-change records were labelled as employer-submitted evidence | Provenance is explicit (`employer_submission` / `company_profile_update` / legacy); employer and admin pages label each separately; moderator notes are private | `tests/http/verification-trust.test.ts` |
| KI-064 | P3 | Identity changes through the verification form had no explicit confirmation | Verification submission now requires `confirmIdentityChange` for identity/classification changes; confirmation is audited; profile editor keeps the same rule | `tests/http/verification-trust.test.ts` |

## 2. Resolved in T-002c

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| KI-037 | P1 | Verified identity could be rewritten after verification: legal name, trading name, country, website and company type remained editable while the badge stayed | Identity-critical fields are defined; profile edits that change them reset the badge to `unverified` (legal) or `identity_checked` (role change); a confirmation box and audit snapshot record the change; vacancies lose `published_verified` in the same transaction | `tests/verification-state.test.ts`, `tests/verification.integration.test.ts` |
| KI-038 | P1 | Verification queue dead-ended because `direct_employer_checked` was excluded, so the full badge could not be granted | Queue includes `direct_employer_checked`; the central resolver permits only the next stage; the UI lists only allowed outcomes; `needs_information` keeps the current stage | `tests/verification-state.test.ts`, `tests/verification.integration.test.ts` |
| KI-048 | P2 | `direct_employer_checked` was treated as fully verified in filters and publishing | `isFullyVerified` is true only for `verified`; `verifiedOnly` uses that status; `directOnly` is a separate `company_type` filter; only `verified` produces `published_verified` | `tests/verification.integration.test.ts` |
| KI-053 | P3 | Green verification ticks rendered on unverified profiles | Public job and company panels derive each tick from `identityChecked` / `roleChecked`; unchecked stages are shown as unchecked | public job/company pages; `tests/verification-state.test.ts` |

## 3. Resolved in T-002b (H1–H4)

| ID | Sev | Issue | Resolution | Evidence |
| --- | --- | --- | --- | --- |
| KI-018 | P1 | `getRecentAudit` exported from a `"use server"` module, making an audit read an addressable endpoint | Removed; admin page now uses `getAuditLogs` from `src/lib/queries.ts` | `tests/security.test.ts` |
| KI-033 | P0 | `getRecentAudit` ignored an unchecked `requireAdmin()` return value, so the guard was ineffective | Removed with the function; no audit read exists in any server-action module | `tests/security.test.ts` |
| KI-034 | P1 | `reconfirmVacancyAction` could turn a draft or suspended vacancy into a live `confirmed` listing | `resolveVacancyTransition` requires an existing live status and complete conditions | 8 transition tests in `tests/vacancy.test.ts` |
| KI-035 | P1 | `publishVacancyAction` could republish an admin-suspended vacancy | Same central transition resolver rejects `suspended` for publish and reconfirm | `tests/vacancy.test.ts` |
| KI-036 | P1 | Moderators saw their own notes instead of employer evidence; employer form prefilled moderator-only notes | Queue joins the latest `company_verifications` submission; form no longer reads `verificationNotes` | `tests/moderation.integration.test.ts`, `tests/security.test.ts` |
| KI-039 | P2 | Employer replies published immediately and could attach to pending/removed reviews | Replies require `published` review status and are stored `pending`; admin publish/reject on `/admin` | `tests/reviews-policy.test.ts`, `tests/moderation.integration.test.ts` |

## 4. Resolved in T-002

| ID | Issue | Resolution |
| --- | --- | --- |
| KI-001 | TypeScript icon/import failures | Fixed; `tsc --noEmit` clean |
| KI-002 | Live vacancy could lose salary/conditions on edit | `resolveVacancySave` |
| KI-003 | Employers could see pending/removed reviews | `getEmployerReviews` published-only |
| KI-007 | Production build never succeeded | Build passes |
| KI-010 | Review moderation revalidated company ID instead of slug | Revalidates slug + review page |

## 5. Open P1

| ID | Issue | Location | Notes / next step |
| --- | --- | --- | --- |
| KI-004 | Permission/privacy suite incomplete: authentication, role escalation, cross-company access, enquiry consent and deletion untested | `tests/` | T-005 adds verified-email gates, token misuse/concurrency/reset and trusted-proxy tests. Remaining gaps: employer account deletion/transfer, CV surface (does not exist) |
| KI-006 | No seed dataset; product cannot be evaluated | `src/db/seed.ts` missing | Not authorized in T-003; future scope |
| KI-020 | Legal review outstanding: employment intermediation, Platform Work Directive, DSA, pay transparency, defamation, DAC7 (Pillar 2) | — | Launch blocker |

## 6. Open P2

| ID | Issue | Location | Notes |
| --- | --- | --- | --- |
| KI-011 | No duplicate-company or email-domain check at registration | registration | Real company names can be duplicated |
| KI-012 | Verification evidence is text-only; no document upload or secure evidence storage | `company_verifications` | H3 fixed *display* of text evidence, not storage |
| KI-013 | No production notification/email provider for verification, reset, enquiries or moderation outcomes | `lib/email.ts` | Provider-independent abstraction and test adapter exist; production self-service delivery is disabled |
| KI-014 | Rate limiting is process-local | `lib/rate-limit.ts` | Documented in `OPERATIONS.md`; replace with shared storage before horizontal scaling |
| KI-016 | No deployed scheduler for reconfirmation/expiry | — | Mechanism implemented in T-004; the operator must schedule the internal route or script. Until then expiry is not active in production |
| KI-017 | `review_responses` has no unique `review_id`; one-reply rule is application-only | schema | Future migration |
| KI-019 | No employer account deletion/transfer workflow | `dashboard/actions.ts` | Employer with company is blocked with a message |
| KI-040 | Account deletion cascades published reviews, erasing legitimate criticism | `schema.ts` `driver_reviews.driver_user_id` | Options documented in `KI-040_REVIEW_RETENTION_OPTIONS.md`; founder/counsel decision required |
| KI-045 | Admin verification decision bulk-rewrites only `published_unverified|published_verified` vacancies, producing mixed badge semantics and skipping `confirmed` | `admin/actions.ts` | Status matrix documented in `KI-045_STATUS_MATRIX.md`; no badge/UI change authorized in T-005 |
| KI-065 | `verification_version` defaults to 0, so any pre-existing or imported verified company loses the public badge until re-reviewed | migration, verification model | Intended safety behaviour; communicate before importing production data |
| KI-066 | Company restoration sends incomplete company-suspended vacancies to `draft` and leaves ambiguous/non-live prior states `suspended`; the employer must fix and republish | company suspension action | Conservative policy; no automatic notification exists |

## 7. Open P3 / UX / operational

| ID | Issue | Location |
| --- | --- | --- |
| KI-021 | Search filters incomplete: experience, home time, multi-language, pay structure; home page claims rotation filtering that does not exist | jobs page |
| KI-023 | No sitemap, robots.txt or structured data | `app/` |
| KI-024 | Remaining accessibility gaps: 10–11px trust metadata, errors still lack per-input `aria-describedby`/`aria-invalid`, no automated/manual screen-reader audit | UI |
| KI-025 | No CI, Dockerfile, deployment configuration or migrations check | repository |
| KI-026 | Development PostgreSQL is a user-space conda instance on port 55432 | environment |
| KI-027 | `.hermes.md` referenced by orchestration instructions does not exist at repo root or `$HOME` | repository |
| KI-028 | Company profile publishes business email, creating a contact route outside the enquiry log | company profile |
| KI-029 | Contact form messages stored unencrypted; no spam challenge beyond rate limiting | `contact_messages` |
| KI-030 | Employer lists unpaginated (admin lists are now paginated) | `lib/queries.ts` |
| KI-031 | Tests require a Postgres role with CREATEDB to provision `driverfirst_test` | `tests/helpers/test-db.ts` |
| KI-032 | Test setup emits PostgreSQL NOTICE output for cascade truncation (cosmetic) | `tests/helpers/test-db.ts` |
| KI-052 | No vacancy/employer comparison view despite repeated "compare" marketing copy | product |
| KI-059 | Reply moderation records reasoning only in the audit log; no moderation note/history on the response row, no employer appeal view | admin/review responses |
| KI-062 | No per-stage timestamps: identity/role decision times live only in the audit log, not on separate company fields | `companies`, audit log |
| KI-068 | The HTTP harness parses Next.js rendered action fields and may need maintenance on a major Next upgrade | `tests/helpers/http-server.ts` |
| KI-069 | Restoring a legacy `verification_status='suspended'` company downgrades verification to `unverified` because no prior verification status is stored | company restoration action |

KI-065, KI-066, KI-068 and KI-069 are open. KI-065 and KI-066 are accepted consequences of the
trust/restoration policy, not hidden defects; KI-068/KI-069 are maintenance/legacy edge cases. None
blocks the documented T-004 guarantees. Operational classification of KI-014, KI-015, KI-017, KI-019,
KI-030, KI-040, KI-045, KI-057 and these items is in `T-004_OPERATIONAL_RISKS.md`.

## 8. Deferred by explicit founder decision

- Review retention/de-identification (KI-040) — excluded; requires a retention decision and schema
  approval.
- Seed data (KI-006) — not authorized in T-003 or T-004.
- Email verification and password reset (KI-008/KI-009) — blocked pending approval of the additive
  token table in `T-004_MIGRATION_PROPOSAL.md` and an email-delivery decision.

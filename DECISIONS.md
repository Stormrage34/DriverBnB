# Decisions — Milevana

Architectural and product decisions with rationale and consequences. Founder approval is required for
changes to approved architecture, schema after approval, privacy defaults, paid services, legally
sensitive functionality, destructive operations and production deployment.

---

## D-001 — Keep Next.js 16 App Router as the application framework

**Date:** 2026-11-12 · **Status:** Approved by founder
**Decision:** Use Next.js 16 with React Server Components and Server Actions as a single deployable
application.
**Rationale:** Server rendering suits SEO-sensitive job/company pages; Server Actions remove the need
for a separate REST layer in a small team; one deployment is operable at pilot scale.
**Consequences:** Hosting must support Node.js; no static-only deployment; framework upgrade cadence
must be managed.

## D-002 — TypeScript strict mode everywhere

**Date:** 2026-11-12 · **Status:** Approved
**Decision:** `strict: true`, no implicit any, shared types from the Drizzle schema.
**Rationale:** Recruitment and privacy data are too sensitive for runtime type drift.
**Consequences:** Typecheck is a release gate; third-party types must be kept current.

## D-003 — Tailwind CSS 4 with semantic design tokens

**Date:** 2026-11-12 · **Status:** Approved
**Decision:** Use Tailwind with CSS variables for paper, ink, brand, accent and status colours.
**Rationale:** Consistent visual system, small CSS payload, no component-library lock-in.
**Consequences:** Components are hand-built; accessibility must be tested manually.

## D-004 — PostgreSQL as the only datastore

**Date:** 2026-11-12 · **Status:** Approved
**Decision:** All relational data, enums, arrays and JSONB live in PostgreSQL. No search cluster,
document store or cache in MVP.
**Rationale:** Integrity, operational simplicity, EU hosting availability, sufficient full-text/ILIKE
search at pilot volume.
**Consequences:** Search must be revisited if vacancy volume grows; backups and PITR are mandatory.

## D-005 — Drizzle ORM rather than Prisma

**Date:** 2026-11-12 · **Status:** Approved by founder
**Decision:** Keep Drizzle ORM and `postgres.js`; do not migrate to Prisma.
**Rationale:** Migration already applied; typed SQL suits complex filters and aggregates; no engine
codegen; less rebuild risk.
**Consequences:** Schema changes require generated SQL migrations; developers must understand SQL.

## D-006 — Zod schemas validate every write

**Date:** 2026-11-12 · **Status:** Approved
**Decision:** All Server Actions parse input with Zod before touching the database.
**Rationale:** Client-side validation is not a security control; consistent, typed errors.
**Consequences:** Schemas are duplicated conceptually with DB constraints; DB constraints remain the
last line of defence.

## D-007 — Custom session authentication instead of an identity provider

**Date:** 2026-11-12 · **Status:** Approved for MVP
**Decision:** Implement scrypt password hashing and database-backed sessions with HTTP-only cookies.
**Rationale:** Two roles, no social login, no enterprise SSO; avoids a paid external dependency and
keeps personal data in one EU database.
**Consequences:** Password reset, email verification, MFA and breach handling become our
responsibility. The auth code must be covered by tests before launch.

## D-008 — Server Actions instead of a public REST API for writes

**Date:** 2026-11-12 · **Status:** Approved
**Decision:** All mutations are Server Actions; the only route handler is the GDPR export.
**Rationale:** Smaller attack surface, same-origin enforcement by the framework, less code.
**Consequences:** No mobile client or third-party integration can write without a future API; actions
must enforce authorization themselves.

## D-009 — Drivers free, employers pay; no payments in MVP

**Date:** 2026-11-12 · **Status:** Approved
**Decision:** Build plan and billing placeholders only; no card processing, subscriptions or invoices.
**Rationale:** Validate employer willingness to publish transparent conditions before adding payment
complexity and financial compliance.
**Consequences:** Revenue is zero during pilot; pricing remains a hypothesis.

## D-010 — Verification is independent of payment

**Date:** 2026-11-12 · **Status:** Non-negotiable product rule
**Decision:** Verification status is granted only by moderator decision based on evidence; no plan,
featured placement or subscription affects it.
**Rationale:** The product's core differentiator is trust; paid badges would destroy it.
**Consequences:** Verification is a cost centre and must be resourced.

## D-011 — Separate company identity verification from vacancy confirmation

**Date:** 2026-11-12 · **Status:** Non-negotiable product rule
**Decision:** Display identity status and vacancy confirmation as distinct, dated facts.
**Rationale:** A verified company can still advertise a role that is filled or stale.
**Consequences:** Every vacancy needs a confirmation date and reconfirmation workflow.

## D-012 — Reviews are moderated before publication; employers get a reply, not a delete button

**Date:** 2026-11-12 · **Status:** Non-negotiable product rule
**Decision:** Reviews start `pending`; moderators publish, reject or remove with recorded reasoning.
Employers may publish one response per review. No code path allows employer deletion or paid removal.
**Rationale:** Credibility and defamation risk management without allowing commercial pressure.
**Consequences:** Moderation capacity is a launch requirement; appeals process needed.

## D-013 — Driver profile and CV private by default

**Date:** 2026-11-12 · **Status:** Non-negotiable product rule
**Decision:** Profiles are not publicly browsable; contact details and CVs are shared only per
enquiry with explicit consent.
**Rationale:** Drivers must be able to search without exposing their job search to a current or
prospective employer.
**Consequences:** Employers cannot source passively; all contact is driver-initiated or
driver-authorised.

## D-014 — Fictional demo data only, never real companies with fabricated conditions

**Date:** 2026-11-12 · **Status:** Approved by founder
**Decision:** Seed datasets use fictional Dutch transport companies, clearly flagged `is_demo_seed`
and labelled in the UI. Real company identities are never combined with invented vacancies, pay or
reviews.
**Rationale:** Fabricated claims about identifiable businesses create defamation and consumer-law
exposure and corrupt pilot validation.
**Consequences:** Real employer data must come from the employer or public sources with attribution
and no invented reviews; demo data must be removable before launch.

## D-015 — No candidate ranking, allocation or wage negotiation

**Date:** 2026-11-12 · **Status:** Non-negotiable product rule
**Decision:** The platform presents information and enables contact. It does not rank drivers for
employers, allocate jobs, generate contracts or negotiate pay.
**Rationale:** Preserves the driver-first positioning and avoids heavier employment-intermediation
regulation.
**Consequences:** No matching revenue stream; employer tools must remain informational.

## D-016 — Applied migrations are immutable; no database resets

**Date:** 2026-11-12 · **Status:** Approved
**Decision:** Never edit or delete an applied migration. Changes require a new migration. Destructive
database operations require founder approval and a backup.
**Rationale:** Reproducibility and data safety.
**Consequences:** Schema mistakes are corrected forward, not rewritten.

## D-017 — Local development uses a user-space PostgreSQL instance

**Date:** 2026-11-12 · **Status:** Temporary
**Decision:** Development connects to PostgreSQL 17.11 at `127.0.0.1:55432` (conda-forge binaries,
database `driverfirst`).
**Rationale:** No sudo or Docker daemon available on the host; unblocks development without system
changes.
**Consequences:** This is not a deployment pattern. Production requires managed EU PostgreSQL with
TLS, backups and monitoring.

## D-018 — Live vacancies must satisfy publishability rules on every save

**Date:** 2026-11-12 · **Status:** Approved (T-002)
**Decision:** `resolveVacancySave` enforces completeness whenever a vacancy is published **or already
live**, regardless of whether the employer re-ticks the publish checkbox. Suspended vacancies cannot be
edited back into publication by the employer.
**Rationale:** Without this, an employer could clear salary or conditions on a live advert while the
status remained published, breaking the product's core transparency promise.
**Consequences:** Domain logic lives in a pure, tested helper; future statuses must be added to
`LIVE_VACANCY_STATUSES` deliberately.

## D-019 — Employers see published reviews only

**Date:** 2026-11-12 · **Status:** Approved (T-002)
**Decision:** Employer review queries return `published` reviews exclusively. Pending, under-review,
rejected and removed reviews are moderation material and are not exposed to the reviewed company.
**Rationale:** Exposing unmoderated content invites retaliation and lets employers infer reviewer
identity or pressure drivers before a decision.
**Consequences:** Employers cannot prepare a reply until publication; moderation must be staffed.

## D-020 — Audit reads are server-only queries, never Server Actions

**Date:** 2026-11-12 · **Status:** Approved (T-002b H1)
**Decision:** `getAuditLogs` lives in `src/lib/queries.ts` and is called only by the role-guarded admin
page. No audit read is exported from a `"use server"` module.
**Rationale:** Server Actions are addressable endpoints. A read exported there depends on an
authorization check that is easy to omit — as it was, because `requireAdmin()` returned `null` and the
caller ignored it.
**Consequences:** Any future sensitive read must go through a server-only module; the regression test
scans the admin action module for the removed export.

## D-021 — One state machine governs vacancy publish and reconfirm

**Date:** 2026-11-12 · **Status:** Approved (T-002b H2)
**Decision:** `resolveVacancyTransition` is the only authority for employer-initiated publish and
reconfirm. It rejects suspended vacancies, requires an existing live status for reconfirmation, and
re-runs publishability on both paths.
**Rationale:** UI-only controls are not controls. A drafted POST to a server action could previously
turn a draft or suspended vacancy into a live listing.
**Consequences:** New vacancy transitions must be added to the resolver, not implemented ad hoc in
actions; tests cover the allowed and denied edges.

## D-022 — Employer evidence and moderator notes are separate data

**Date:** 2026-11-12 · **Status:** Approved (T-002b H3)
**Decision:** Moderators read `company_verifications.evidenceNotes` (employer-submitted). Internal
decision notes remain in `companies.verificationNotes` and are never prefilled into the employer's
submission form.
**Rationale:** Verification must be decided on the evidence that was actually submitted, and internal
reasoning must not leak back to the employer as if it were their own statement.
**Consequences:** Document upload is still absent; text evidence is displayed as submitted. A future
evidence store must preserve this separation.

## D-023 — Employer replies are pre-moderated

**Date:** 2026-11-12 · **Status:** Approved (T-002b H4)
**Decision:** A reply is allowed only on a `published` review and is stored `pending`; a moderator
publishes or rejects it from the admin dashboard. Public queries show only `published` replies.
**Rationale:** This matches the public review policy and prevents retaliation against drivers whose
reviews are still in moderation.
**Consequences:** Moderation capacity is required for employer replies; employers see a pending state
until a decision is recorded.

## D-024 — Verified identity is a defined field set, not the whole company profile

**Date:** 2026-11-12 · **Status:** Approved (T-002c)
**Decision:** Legal name, trading name, country, registration number, registered address and contracting
entity are identity-critical. Company type and direct-recruitment declaration are classification
fields. Operational fields (fleet size, sectors, website, contact details, description) never
auto-invalidate a check.
**Rationale:** The badge must mean something specific. Changing the legal entity or public identity
invalidates identity; changing direct employer to agency invalidates the role check; changing a phone
number must not.
**Consequences:** Trading-name changes trigger re-verification. Operational changes are audited and
material ones are flagged for moderator review.

## D-025 — Resubmission preserves completed checks

**Date:** 2026-11-12 · **Status:** Approved (T-002c)
**Decision:** Submitting updated evidence does not reset `identity_checked`,
`direct_employer_checked` or `verified` unless the submission changes an identity-critical or
classification field. Legal changes reset to `submitted` (new evidence) or `unverified` (profile edit);
classification changes fall back to `identity_checked`.
**Rationale:** Employers must be able to update documents without losing an earned badge, while a real
identity change cannot be hidden behind a routine resubmission.
**Consequences:** The submission row records the identity snapshot and the changes since the last
reviewed snapshot.

## D-026 — One verification model across actions, queries and UI

**Date:** 2026-11-12 · **Status:** Approved (T-002c)
**Decision:** `src/lib/verification.ts` owns identity fields, snapshot/hash, invalidation, derived
checks, labels, allowed outcomes and transition resolution. Filters, badges and vacancy lifecycle code
import it; no component defines its own rule.
**Rationale:** The previous build treated `direct_employer_checked` as fully verified in some paths
and not others. Duplicated rules are how badges drift.
**Consequences:** `verifiedOnly` means `verified` only; `directOnly` remains a classification filter.
`published_verified` is produced only by a fully verified company.

## D-027 — Operational changes are flagged, not auto-invalidated

**Date:** 2026-11-12 · **Status:** Approved (T-002c)
**Decision:** Changes to `operatesOwnFleet`, `fleetSize`, `sectors`, `website` and contact fields keep
the current verification status, are written to the audit log with previous/current values, and are
flagged for moderator review when material.
**Rationale:** Fleet size and contact details change routinely and are not legal identity. But a change
that could undermine a direct-employer check must be visible, not silent.
**Consequences:** Moderators see recent identity and operational changes on the verification queue;
they can request information or reset the status manually.

## D-028 — Identity snapshots live in existing JSONB and audit records

**Date:** 2026-11-12 · **Status:** Approved (T-002c)
**Decision:** No migration. `company_verifications.submitted_data` stores the submitted identity,
reviewed identity, hash and change list; `audit_logs.metadata` stores the same immutable record on
submission, decision and invalidation.
**Rationale:** The fields already exist and the pilot database is empty. A schema change would add
deployment risk for no pilot-stage benefit.
**Consequences:** Per-stage timestamps and DB-enforced transitions are not available; a later
`verification_events` table can replace the JSONB convention with a migration.

## D-029 — Verification loss downgrades vacancy labels, never unpublishes valid vacancies

**Date:** 2026-11-12 · **Status:** Approved (T-002c)
**Decision:** Losing `verified` sets any `published_verified` vacancy to `published_unverified` in the
same transaction. Vacancies stay published if they still satisfy `checkPublishable`; `confirmed`
vacancies are not rewritten.
**Rationale:** The vacancy remains a real job, but the platform must not keep claiming the employer is
verified. The company badge is read live, so the label changes immediately.
**Consequences:** Paths are revalidated; no precomputed verified badge survives invalidation.

## D-030 — Verification evidence version gates every full-badge claim

**Date:** 2026-11-12 · **Status:** Approved (T-002d)
**Decision:** `companies.verification_version` defaults to `0` and is set to `1` only when a moderator
records a decision against a reviewed identity snapshot. `isFullyVerified`, `identityChecked`,
`roleChecked`, labels, verified filters, vacancy promotion and publishing all require a trusted
version. Legacy `verified` rows remain in the database but cannot claim or preserve a full badge.
**Rationale:** Legacy/imported rows may have a status without the evidence needed to justify it.
Treating the status alone as trusted is exactly the failure H2 addresses.
**Consequences:** Existing verified rows lose the public badge until re-reviewed. A legacy verified
company that resubmits evidence is forced to `submitted`; no historical verification row is rewritten.

## D-031 — Company suspension is independent of verification and records prior vacancy status

**Date:** 2026-11-12 · **Status:** Approved (T-002d)
**Decision:** New company suspension is represented by `companies.suspended_at` and
`suspension_reason`, leaving `verification_status` intact. `vacancies.suspended_from_status` records
the status of each company-suspended vacancy. Individual admin suspensions clear that column so
company restoration cannot override them.
**Rationale:** Suspension is an administrative state, not a verification decision. Without a prior
status, restoration cannot distinguish company-wide suspension from an individual admin suspension
or avoid republishing an invalid advert.
**Consequences:** Restoration is transactional, audited and conservative: invalid vacancies become
drafts; individual suspensions stay suspended; `published_verified` is restored only for a currently
trusted company.

## D-032 — Authorization is tested through the built HTTP boundary

**Date:** 2026-11-12 · **Status:** Approved (T-002d)
**Decision:** `tests/http` starts the production build against `driverfirst_test`, creates real
sessions and posts React's progressive-enhancement form fields without a browser. Tests assert both
HTTP outcomes and database mutations.
**Rationale:** Mocked `cookies()` or static source checks do not prove that the server boundary
enforces authentication, roles and ownership. A browser dependency is unnecessary for these
workflows.
**Consequences:** `npm run test:http` requires a prior `npm run build`; the harness is isolated from
the unit/DB suite by `vitest.http.config.ts`. The parser depends on Next's rendered action fields and
will need maintenance on major Next upgrades.

## D-033 — Verification evidence provenance is explicit

**Date:** 2026-11-12 · **Status:** Approved (T-002d)
**Decision:** Employer submissions carry `source: "employer_submission"`; profile-driven records
carry `source: "company_profile_update"`; rows without a source are legacy/unrecorded. Employer and
admin surfaces label these separately; public surfaces expose no evidence.
**Rationale:** A system-generated profile-change record and a moderator note are not employer
evidence. Labelling them as such misrepresents provenance and can mislead a moderator.
**Consequences:** Legacy rows are not called employer-submitted. Moderator `decisionNotes` are
admin-only; public pages expose no evidence text.

## D-034 — Identity changes require explicit confirmation on both employer routes

**Date:** 2026-11-12 · **Status:** Approved (T-002d)
**Decision:** The company profile editor and the verification submission both require a dedicated
`confirmIdentityChange` acknowledgement when an identity-critical or classification field changes on
a company with an existing verification record. The confirmation and change are audited.
**Rationale:** A general truth attestation is not specific enough when the user is changing the legal
identity behind a verified badge.
**Consequences:** Missing confirmation returns an error and writes nothing. Operational changes are
exempt and do not invalidate identity.

## D-035 — Account tokens are a dedicated hashed table

**Date:** 2026-11-13 · **Status:** Approved (T-005)
**Decision:** Use an additive `user_tokens` table with a UUID primary key, cascade FK, purpose enum,
unique SHA-256 hash, expiry, nullable consumption timestamp and a partial unique index for one
unconsumed token per user and purpose. Never store raw tokens or reuse sessions/audit rows.
**Rationale:** Account tokens have a different lifecycle and threat model from sessions. A dedicated
table supports rotation, atomic single use and cleanup without creating an authentication bypass.
**Consequences:** `0002_normal_angel.sql` is applied to `driverfirst_test` only. Development and
production require separate approval. Raw tokens exist only in the outgoing email/test adapter.

## D-036 — Email delivery is disabled until a provider is approved

**Date:** 2026-11-13 · **Status:** Approved (T-005)
**Decision:** Ship a provider-independent `EmailProvider` interface, a memory-only test adapter and a
disabled default. Do not invent provider credentials, DPA terms or data-residency claims.
**Rationale:** A token flow that cannot deliver email is honest; a fake provider is not. Provider
selection is a legal and operational decision, not an implementation detail.
**Consequences:** `EMAIL_PROVIDER=disabled` by default. Registration/resend/reset remain generic and
fail safe. Production self-service verification requires a real adapter and configuration.

## D-037 — Verified-email policy is enforced in Server Actions

**Date:** 2026-11-13 · **Status:** Approved (T-005)
**Decision:** Require `email_verified_at` for driver enquiries, driver reviews, vacancy publishing
and employer verification-evidence submission; require it for admin pages and admin actions. Enforce
in the action boundary, not by hiding UI.
**Rationale:** Server Actions are addressable endpoints; a disabled button is not authorization.
**Consequences:** Existing unverified accounts, including the local admin, are blocked until the
controlled operator procedure runs. UI banners are advisory.

## D-038 — Admin bootstrap and pilot verification are operator CLI procedures

**Date:** 2026-11-13 · **Status:** Approved (T-005)
**Decision:** `npm run users:verify-email` is the only path for operator verification. It requires
`--admin-bootstrap` or `--pilot`, the exact email, a reason, an operator identity and
`--confirm-control`. It checks the role and writes an atomic `user.email_verified_operator` audit row
with `actorUserId = null` and explicit operator metadata.
**Rationale:** No public bootstrap endpoint may exist. A misleading actor attribution is worse than a
null actor with explicit operator metadata.
**Consequences:** The command refuses unknown accounts, wrong roles, already-verified accounts and
missing confirmation. No correspondence is stored.

## D-039 — Trusted proxy is opt-in, not assumed

**Date:** 2026-11-13 · **Status:** Approved (T-005)
**Decision:** `TRUST_PROXY=false` by default; ignore `X-Forwarded-For`/`X-Real-IP` and use a local
rate-limit key. Only a deployment that explicitly sets `TRUST_PROXY=true` may use the first forwarded
address.
**Rationale:** Trusting a client-supplied header lets an attacker rotate rate-limit keys.
**Consequences:** Direct deployments must keep it false. Reverse proxies must overwrite, not append,
the forwarding headers; this is documented in `OPERATIONS.md`.

## D-040 — Security headers are application defaults; HSTS is opt-in

**Date:** 2026-11-13 · **Status:** Approved (T-005)
**Decision:** Set CSP, frame-deny, COOP/CORP, referrer and permissions policies at the application
layer. Enable HSTS only with `ENABLE_HSTS=true` after HTTPS is verified.
**Rationale:** A CSP that allows arbitrary third-party scripts is not a control; HSTS on an
unverified or HTTP-only deployment can lock users out.
**Consequences:** Reverse proxies must not strip the headers. The CSP allows inline Next.js bootstrap
styles/scripts; a stricter nonce-based CSP needs a separate change and test pass.

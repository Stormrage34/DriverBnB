# T-002c Plan — Verification Identity Integrity and Workflow Completion

**Status:** Approved with amendments (12 November 2026)
**Scope:** KI-037 (verified company identity mutability) and KI-038 (verification workflow dead-end) only.
**Out of scope:** T-003, seed data, company suspension (KI-043), schema changes, H5 session revocation,
review retention, unrelated features.

## 1. Verification states

The existing `verification_status` enum is retained. No migration is planned.

| Status | Meaning | Identity checked | Role checked | Full badge |
| --- | --- | --- | --- | --- |
| `unverified` | No evidence accepted | no | no | no |
| `submitted` | Evidence submitted, identity pending | no | no | no |
| `identity_checked` | Legal identity confirmed | yes | no | no |
| `direct_employer_checked` | Recruitment role confirmed | yes | yes | no |
| `verified` | Identity and role confirmed | yes | yes | yes |
| `suspended` | Admin-only terminal state | n/a | n/a | no |

`direct_employer_checked` keeps its schema name. For agencies, subcontractors and intermediaries its
UI label is "Intermediary status checked"; for direct employers it is "Direct-employer status checked".

Derived checks are centralised in `src/lib/verification.ts`:
`identityChecked`, `roleChecked`, `isFullyVerified`, `allowedVerificationOutcomes`.

## 2. Moderator transitions

Only the next stage is permitted. The server validates every decision with
`resolveVerificationTransition`; the UI lists only allowed outcomes.

| Current | Allowed outcomes |
| --- | --- |
| `unverified` | none (employer must submit) |
| `submitted` | `identity_checked`, `needs_information`, `rejected` |
| `identity_checked` | `direct_employer_checked`, `needs_information`, `rejected` |
| `direct_employer_checked` | `verified`, `needs_information`, `rejected` |
| `verified` | none |
| `suspended` | none |

`needs_information` records the decision but leaves the current status unchanged.
`rejected` returns the company to `unverified`.

Prohibited: `submitted -> direct_employer_checked`, `submitted -> verified`,
`identity_checked -> verified`, `direct_employer_checked -> identity_checked`,
`unverified -> checked`, any employer-initiated check transition, and any transition out of
`suspended`.

## 3. Verified identity fields

Identity-critical, changing any invalidates checks as described below:

- `legalName`
- `tradingName`
- `country`
- `registrationNumber`
- `registeredAddress`
- `contractingEntity`

Classification fields, changing any invalidates the recruitment-role check only:

- `companyType`
- `recruitsDirectly`

Operational fields, never auto-invalidated:

- `operatesOwnFleet`, `fleetSize`, `sectors`, `website`, `businessEmail`, `phone`,
  `contactPerson`, `description`

## 4. Invalidation matrix

| Change | Current status | New status | Effect |
| --- | --- | --- | --- |
| Legal identity | `verified` / `direct_employer_checked` / `identity_checked` / `submitted` | `unverified` (profile edit) or `submitted` (verification resubmission) | Identity and role checks reset; badge removed immediately |
| Legal identity | `unverified` | unchanged / `submitted` on submission | no badge to remove |
| Classification (`companyType`, `recruitsDirectly`) | `verified` / `direct_employer_checked` | `identity_checked` | Role check invalidated; identity check preserved |
| Classification | `identity_checked` | `identity_checked` | role already unchecked |
| Classification | `submitted` / `unverified` | unchanged | no completed role check |
| Operational fields | any | unchanged | audited; material changes flagged for moderator review |
| Any change | `suspended` | `suspended` | suspension management out of scope |

A direct-employer-to-agency change therefore always drops `verified` and
`direct_employer_checked` to `identity_checked`, and every `published_verified` vacancy is downgraded
to `published_unverified`.

## 5. Resubmission rules

Ordinary evidence resubmission preserves completed checks:

| Current | No identity/role change | Legal identity change | Classification change |
| --- | --- | --- | --- |
| `unverified` | `submitted` | `submitted` | `submitted` |
| `submitted` | `submitted` | `submitted` | `submitted` |
| `identity_checked` | `identity_checked` | `submitted` | `identity_checked` |
| `direct_employer_checked` | `direct_employer_checked` | `submitted` | `identity_checked` |
| `verified` | `verified` | `submitted` | `identity_checked` |

The verification row records `identity`, `identityHash`, `identityChanges`, `resubmission: true`, and
the status the company holds after the submission. Completed checks are not erased by updating
evidence notes.

## 6. Auditable identity record

No schema change:

- `company_verifications.submitted_data.identity` — snapshot submitted by the employer.
- `company_verifications.submitted_data.identityHash` — SHA-256 of canonical JSON.
- `company_verifications.submitted_data.reviewedIdentity` — snapshot actually reviewed.
- `company_verifications.submitted_data.identityChanges` — field, previous value, current value,
  category, for moderator display.
- `audit_logs.metadata` — same snapshot/hash on submission, decision and invalidation, plus previous
  and next status.

If the current identity hash does not match the submitted hash at decision time, the moderator cannot
advance the status; only "request information" or "reject" are offered.

A profile edit that changes identity or classification also writes a `company_verifications` record
with `source: "company_profile_update"`, the previously reviewed snapshot and the changed values. This
keeps the moderator queue and the next resubmission diff anchored to the identity that was actually
reviewed.

## 7. Vacancy consistency

- `isFullyVerified(status)` is true only for `verified`.
- Only a fully verified company produces `published_verified` vacancies.
- Losing `verified` downgrades `published_verified` to `published_unverified` in the same transaction.
- Vacancies remain published if they still satisfy `checkPublishable`; nothing is expired.
- `confirmed` vacancies are not rewritten, because their label does not claim verification; the
  company badge is read live from `companies.verification_status`.
- `verifiedOnly` filters use `verification_status = 'verified'` only. `directOnly` remains a separate
  `company_type = 'direct_employer'` filter.
- Revalidate the company page, company list, job list, job detail pattern and employer dashboard after
  invalidation. No precomputed badge survives.

## 8. One authoritative model

`src/lib/verification.ts` owns:

- identity field sets and snapshot/hash
- change classification and invalidation outcomes
- resubmission status resolution
- derived checks and labels
- allowed outcomes and transition resolution
- `isFullyVerified`
- vacancy verification downgrade/promotion decision

Server actions, queries, filters, badges and vacancy lifecycle code import these functions. No
component re-implements a status rule.

## 9. Files

New:

- `src/lib/verification.ts`
- `src/lib/verification-hash.ts` (server-only SHA-256; kept separate so shared UI can import the
  status model without `node:crypto`)
- `tests/verification-state.test.ts`
- `tests/verification.integration.test.ts`
- `T-002C_PLAN.md`

Modified:

- `src/app/employer/actions.ts`
- `src/app/admin/actions.ts`
- `src/app/admin/verifications/page.tsx`
- `src/components/company-form.tsx`
- `src/components/verification-form.tsx`
- `src/components/verification-badge.tsx`
- `src/components/vacancy-card.tsx`
- `src/components/company-card.tsx`
- `src/lib/validation.ts`
- `src/lib/queries.ts`
- `src/lib/constants.ts`
- `src/app/(public)/jobs/page.tsx`
- `src/app/(public)/jobs/[slug]/page.tsx`
- `src/app/(public)/companies/page.tsx`
- `src/app/(public)/companies/[slug]/page.tsx`
- `src/app/(public)/how-verification-works/page.tsx`
- `src/app/employer/page.tsx`
- `src/app/employer/verification/page.tsx`
- `src/app/employer/company/page.tsx` (copy/status only, if needed)

Documentation updated after implementation:

- `KNOWN_ISSUES.md`, `PROJECT_STATUS.md`, `DEVELOPMENT_LOG.md`, `DECISIONS.md`,
  `API_SPECIFICATION.md`, `DATABASE_SCHEMA.md`, `ARCHITECTURE.md`

## 10. Tests

- Full transition matrix: every current status × every outcome, permitted and prohibited.
- Derived checks and labels for direct employers, agencies and subcontractors.
- Identity/role/operational diff classification.
- Resubmission status matrix.
- Confirmation requirement and no-write path.
- Snapshot hash stability and change detection.
- Identity mismatch blocks advancement.
- `getPendingVerifications` includes `direct_employer_checked`.
- `getAdminStats` pending count includes it.
- `verifiedOnly` excludes `direct_employer_checked`; `directOnly` follows current company type.
- Vacancy downgrade/promotion decision.
- Existing tests remain green.

## 11. Evidence and commits

- `npx tsc --noEmit`
- `npm test`
- `npm run build`
- One documentation/plan commit before code, one code/tests commit, one final documentation commit.
- Report full hashes, `git show --stat`, clean working tree, test counts, build exit, remaining risks.

## 12. Risks

- Trading name is treated as identity-critical; legitimate rebrands require re-verification.
- No per-stage timestamps without a schema change; audit log preserves decision times.
- `needs_information` no longer rewinds status.
- Company suspension/unsuspension remains KI-043.
- Legacy rows without identity snapshots fall back to current company values at decision time; the
  database is empty in this build, so there is no backfill.

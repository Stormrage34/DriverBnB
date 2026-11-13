# KI-045 — Company and vacancy status matrix

**Date:** 13 November 2026
**Status:** documentation/status-matrix assessment only. No badge wording, status semantics or UI
behaviour was changed in T-005. No migration was introduced.

## 1. The statuses

### Company verification

| Status | Meaning | Public presentation |
| --- | --- | --- |
| `unverified` | No verification claim | “Unverified” |
| `submitted` | Evidence submitted; moderator review pending | “Verification submitted” |
| `identity_checked` | Legal identity checked | “Identity checked” |
| `direct_employer_checked` | Identity plus role/intermediary classification checked | “Direct-employer status checked” or “Intermediary status checked” |
| `verified` | Full verification with trusted version | “Verified employer” (direct) or “Verified company” (other) |
| `suspended` | Company suspended | “Suspended” |

A `verified` status with `verification_version = 0` is untrusted and renders “Verification requires
review” rather than a verified badge.

### Company suspension

| Representation | Meaning | Public effect |
| --- | --- | --- |
| `verification_status = 'suspended'` | Legacy suspension state | Company and vacancies hidden; writes blocked |
| `suspended_at` non-null | Current suspension marker, independent of verification status | Company and vacancies hidden; writes blocked |

Both representations are checked by the central suspension helper. A company can be suspended while
its verification status remains `verified`; the suspension must win in every public and write path.

### Vacancy publication

| Status | Meaning | Public listing |
| --- | --- | --- |
| `draft` | Not published | Hidden |
| `published_unverified` | Published while employer verification is incomplete | Visible with company verification badge |
| `published_verified` | Published with a fully verified company | Visible with verified badge |
| `confirmed` | Employer reconfirmed; live | Visible |
| `reconfirmation_required` | Due date passed; grace period running | Visible with “Reconfirmation overdue” badge |
| `expired` | Grace period ended | Hidden from search, detail, saved lists and applications |
| `suspended` | Admin-suspended vacancy | Hidden; employer cannot publish/reconfirm |

### Vacancy reconfirmation and expiry

- Due date: `reconfirm_due_at`, falling back to `last_confirmed_at + 30 days`.
- A live vacancy becomes `reconfirmation_required` on the due date.
- After a 7-day grace period it becomes `expired`.
- The lifecycle sweep is idempotent and skips suspended vacancies and suspended companies.
- Reconfirmation does not rewrite company verification.

### Vacancy suspension

- Admin suspension sets `vacancy.status = 'suspended'` and preserves the prior state when known.
- Individual vacancy suspension keeps `suspended_from_status = NULL`; restoration reads the recorded
  audit transition.
- A suspended vacancy is hidden and cannot be reconfirmed or republished by the employer.
- A company suspension hides all of that company's vacancies regardless of individual vacancy state.

## 2. Current display rules

| Surface | Company verification | Company suspension | Vacancy publication/reconfirmation/expiry |
| --- | --- | --- | --- |
| Public company page | Badge from `getVerificationPresentation` | Page returns 404 | Lists only public vacancies |
| Public job card | Company badge shown | Company hidden; card not rendered | `reconfirmation_required` gets a separate warning badge |
| Public job detail | Company badge shown | 404 | `draft`, `expired`, `suspended` return 404 |
| Employer workspace | Badge/status plus verification form | Suspension banner; writes blocked | Status labels from `vacancyStatusLabel` |
| Admin workspace | Verification queue/status | Suspension controls and reason | Separate vacancy moderation and lifecycle states |
| Saved lists | Company/vacancy queries filter suspension | Hidden | Expired/suspended filtered at query level |

## 3. Identified inconsistencies / risks

1. **Company badge beside a stale vacancy.** A `reconfirmation_required` vacancy still shows the
   employer's verification badge; a separate “Reconfirmation overdue” badge communicates freshness.
   This is arguably correct but can be read as “verified vacancy” rather than “verified company”.
2. **`published_verified` after company trust loss.** The code downgrades live `published_verified`
   rows when verification is lost, but a legacy/imported row or a race could leave a mixed label.
   `vacancyStatusLabel` guards the display when the company is not trusted.
3. **Company suspension vs vacancy suspension.** Two independent fields can disagree; suspension
   must always win. The central helper is the only safe read path.
4. **Expired vs suspended restoration.** Restoration from company suspension may send incomplete
   vacancies to `draft`; an individually suspended vacancy retains its own state. The semantics are
   conservative but can surprise an employer.
5. **Badge wording.** “Verified employer” describes the company, not the vacancy. Changing the wording
   is a product/legal decision and was intentionally not done in T-005.

## 4. Recommendation

- Keep the current semantics until a founder decision on badge wording.
- If wording changes, use a single status presenter that distinguishes:
  company verification, company suspension, vacancy publication, vacancy reconfirmation, vacancy
  suspension and vacancy expiry.
- Add tests for every combination before changing labels.
- Do not introduce a migration for KI-045.

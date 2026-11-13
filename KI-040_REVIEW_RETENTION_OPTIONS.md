# KI-040 — Review retention on account deletion: technical options

**Date:** 13 November 2026
**Status:** options note only. No retention policy is implemented. A founder decision and legal review are required before any change.

## 1. The problem

`driver_reviews.driver_user_id` references `users.id` with `ON DELETE CASCADE`. Deleting a driver
account therefore deletes that driver's published reviews. That conflicts with the product promise
that employers cannot remove reviews, and it can erase legitimate criticism of an employer.

The current UI tells drivers that reviews are removed on account deletion, but that wording was
written for the existing cascade and is not a legal decision.

## 2. Options

### Option A — Keep the cascade, disclose it

- Delete reviews with the account.
- Keep the existing user-facing disclosure.
- Simplest and most privacy-protective.
- Weakens review integrity: an employer could pressure a driver to delete an account, and the
  historical record disappears.
- Does not preserve moderation evidence or legal claims.

### Option B — Pseudonymise reviews and detach the account

- Replace the author reference with a non-reversible per-review pseudonym or a tombstone author id.
- Keep the review body, ratings, employment period and moderation record.
- Delete direct identifiers from the account and profile.
- Requires a schema change: nullable author reference or a separate review-author tombstone.
- Must not be described as anonymisation if re-identification remains possible.
- Needs a documented lawful basis and retention period; the review may still be personal data.

### Option C — Retain only moderation/audit evidence, remove the public review

- Delete the public review but retain a minimal moderation record for legal claims and abuse defence.
- Strong privacy posture, weaker review integrity.
- Retention must be purpose-limited, time-limited and documented.
- Requires a retention job and a deletion/erasure exception process.

### Option D — Account deletion with an explicit review choice

- Let the driver choose: delete reviews, or keep them pseudonymously.
- More complex UX and legal wording; consent cannot be a condition of deletion.
- Requires the schema support from Option B and clear explanations.

## 3. Technical impact

| Option | Schema change | Public reviews survive | Personal data retained | Complexity |
| --- | --- | --- | --- | --- |
| A — cascade | none | no | minimal | lowest |
| B — pseudonymise | yes: author reference/tombstone | yes | pseudonymous review data | medium |
| C — moderation-only | yes: retention table/fields | no | minimal moderation evidence | medium |
| D — user choice | yes, same as B | driver-dependent | driver-dependent | highest |

## 4. Recommendation for decision

Do not implement a permanent-retention policy unilaterally. Ask counsel to assess:

- whether published reviews can be retained after account deletion;
- the correct lawful basis and retention period;
- whether pseudonymisation is sufficient or whether the review remains personal data;
- how to handle legal claims, preservation requests and the right to erasure;
- what the user-facing explanation must say.

A conservative interim posture is to keep the current cascade and disclosure until that review is
complete. It is not a claim that the current posture is legally correct.

## 5. Out of scope for T-005

No schema change, no deletion behaviour change, no retention job and no public copy change were made.

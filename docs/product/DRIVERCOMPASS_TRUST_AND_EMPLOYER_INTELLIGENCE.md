# DriverCompass — Trust and Employer Intelligence

**Date:** 13 November 2026
**Purpose:** the rules that make employer intelligence credible, what exists today, and what must be decided before a reputation system is expanded.

## 1. What "verified" is allowed to mean

Four different claims, four different labels. A single badge is prohibited.

| Label | What the platform established | What it does not mean |
| --- | --- | --- |
| **Company identity verified** | The legal entity exists and the person claiming to act for it is authorised | That the company treats drivers well |
| **Document checked** | A named document was inspected and its expiry recorded | That the document is current, or that the driver holds the skill in practice |
| **Employer-declared** | The employer typed it into a structured field | That anyone checked it |
| **Verified employment experience** | The platform confirmed the driver worked for the employer, in the stated relationship and period | That the review's opinion is true |

Unverified driver reviews are published and labelled, but never counted in a score.

## 2. Reputation independence

- Subscription tier is not readable by any query that filters, orders or scores reviews.
- No payment can add, remove, reorder or reword a review.
- Employer replies are labelled, one per review, and never counted as a review or a vote.
- Verification is granted against published criteria only; paying does not buy it.
- The rule is stated in the interface where the score appears, and must be enforced by a permission test, not only by policy text.

## 3. Review integrity, in the current data model

What exists: `driver_reviews` (rating, text, status, author), `review_responses` (employer reply), moderation statuses (`pending`, `under_review`, `published`, `rejected`, `removed`), admin moderation, audit log.

What is missing before the score can be published:

1. **Employment provenance** — relationship type, period, country of work.
2. **A verified flag** — set by a documented process, not by the driver's assertion.
3. **Category ratings** — nine conditions, each optional, stored separately from the overall rating.
4. **A publication rule** — no percentage below 5 verified reviews; category averages require a minimum count.
5. **Recusal and appeals** — a second moderator for contested decisions, published reasoning.

Until those exist, the company page shows the star breakdown and the reviews, with the count, and does not claim a recommendation percentage.

## 4. Small employers and re-identification

- The submission form warns when the employer has fewer than 10 drivers in the claimed period.
- A driver may request coarsening: year instead of month, generic job category, country removed.
- Moderation redacts names, plates, customers and any detail that identifies a colleague.
- An employer may request coarsening of a review that identifies an individual; the request is assessed against the public interest in the review, not against the employer's commercial preference.

## 5. Legal questions requiring counsel

| Area | Question |
| --- | --- |
| GDPR | Lawful basis for publishing employment experiences; retention after account deletion; requests that would expose another driver's data |
| Defamation | Fact versus opinion per member state; platform liability after notice; who bears the risk of an unverified claim |
| DSA | Notice-and-action, statement of reasons, internal complaints, transparency reporting at the applicable size |
| Employment intermediation | Whether any matching, ranking or discovery feature constitutes recruitment activity or falls under platform-work rules |
| Consumer law | Whether a recommendation percentage with a small sample is an unfair commercial practice |
| Document handling | Storage, encryption, retention and deletion of identity and qualification documents |

No claim of compliance is made anywhere in the product or the documentation. This section is a list of questions, not answers.

## 6. Principles that outrank feature requests

1. A number is never shown without its count and its basis.
2. A label is never shown without saying what was checked.
3. A missing field is a warning, not a benefit — the vacancy page now says so explicitly.
4. Payment never moves a reputation value.
5. The driver's identity is never the price of a verified review.

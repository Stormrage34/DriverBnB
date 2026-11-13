# Driver Reviews & Recommendations — Product and Trust Concept

**Date:** 13 November 2026
**Status:** concept for approval. Nothing in this document is implemented. No schema, API or moderation tooling is built.
**Related:** `docs/research/REVIEWS_COMPETITIVE_ANALYSIS.md`, `docs/design/reviews-concept.html`, `docs/brand/BRAND_GUIDELINES.md`

---

## 1. What this is

A review layer attached to the employer, not to the vacancy. A driver tells other drivers what it was like to work for a company: whether the pay arrived as advertised, whether the rotation held, what the truck was like, what management did when something went wrong.

It is deliberately **not** a star rating bolted onto a job board, and it is deliberately **not** the same concept as an employer recommending a driver. The two directions of recommendation are separate products with separate data, separate moderation and separate visibility rules. Combining them would let an employer's endorsement of a driver influence that driver's review of the employer, which is exactly the pressure the system must resist.

## 2. Employer profile: the reviews section

**Heading:** What drivers say about this employer

### 2.1 Summary block

| Element | Rule |
| --- | --- |
| Recommendation score | Percentage of **verified** drivers who answered "would recommend". The denominator is stated in words: "of 34 drivers with verified experience" |
| Score basis | One line under the score: "confirmed employment only; 7 further reviews are not verified and never enter the score" |
| Review volume | Total, split into verified and not verified — never a single undifferentiated count |
| Minimum sample | No percentage is shown below 5 verified reviews. Below that the profile shows the reviews and the line "not enough verified experiences to calculate a score" |
| Filters | Employment type, job category, country, period. A filter that would leave fewer than 5 reviews in a cohort hides the percentage and shows the reviews only |

The score is never shown without its basis. A number without a denominator is the most common way review platforms mislead.

### 2.2 Category ratings

| Category | What the driver is asked |
| --- | --- |
| Pay reliability | Was the pay accurate and on time? |
| Advertised vs actual | Did the job match the vacancy? |
| Rotation and home time | Were promised rotations and home time respected? |
| Working conditions | Were schedules and working arrangements reasonable? |
| Equipment and maintenance | What condition were the vehicles in? |
| Accommodation and facilities | What was provided during assignments and rest? |
| Management and communication | How were drivers treated when something went wrong? |
| Contracts and administration | Were terms and paperwork transparent? |
| Safety and professionalism | Were safety and professional standards respected? |

Each category has a "no experience of this" option. A category is only published when at least 5 verified reviews rated it. Categories are averaged on a 1–5 scale and displayed with the count that produced them; a single 5 from one driver is not a trend.

### 2.3 Review card anatomy

1. Verification label: **Verified experience** (employment and dates confirmed) or **Not verified** (driver-reported).
2. Employment relationship: directly employed, agency, subcontractor, other (defined in the form).
3. Period of experience, job category, country.
4. The driver's account, in their words.
5. The categories they rated, with their individual scores — only those they answered.
6. **Company reply**, if any, clearly separated and labelled as the employer's statement.
7. Review date, and a "edited" marker if the driver changed it after publication.
8. Report control.

### 2.4 Ordering

Newest first by default, with a "most useful" option once there is enough volume. Ordering is never influenced by subscription tier, and the ordering rule is stated in the interface.

## 3. Submission flow

| Step | Content | Design note |
| --- | --- | --- |
| 1. Find the employer | Search by name, city or registration number; confirm the exact legal entity and site | Prevents reviews landing on the wrong company |
| 2. Relationship | Directly employed, agency, subcontractor, other | Determines which categories are asked |
| 3. Period | Start and end month; "still working there" allowed | Required for verification and for usefulness |
| 4. Recommendation | Would you recommend this employer? Yes / No | The only question that feeds the score |
| 5. Categories | The nine conditions, each with "no experience" | Never forced |
| 6. Account | Free text, optional, with guidance on what not to include (names of individuals, registration plates, customer names) | The most common source of defamation and identification risk |
| 7. Identity | Show my name / show "driver in international C+E" / show nothing | Default: nothing. Verification never requires disclosure |
| 8. Review and submit | Summary, then moderation status | "Submitted for review" is not "published" |

## 4. Verification

Three levels, each with a different claim:

| Level | What was checked | How | Label |
| --- | --- | --- | --- |
| Verified experience | Employment relationship, employer entity and approximate dates | Platform records (enquiry, application or employer-confirmed hire), or employer confirmation of a claimed period without revealing content | Verified experience |
| Partly verified | Employer confirms the person worked there but not the dates, or dates confirmed by document without employer check | Document review by a moderator, deleted after the decision | Period confirmed |
| Not verified | Nothing checked | — | Not verified |

**Rules**
- Verification never publishes identity, and never shares the driver's review text with the employer for confirmation — only the fact of employment and the period.
- A document used for verification is deleted after the check; it is never attached to the review.
- Verification can be revoked if the employment is later disproved; the review remains, re-labelled.

## 5. Driver profile: "My experience"

An optional section on the driver's own profile, separate from the employer review.

- Private by default. Nothing appears until the driver selects an experience.
- The driver selects which reviews (or a distinct short recommendation) to display.
- Employment documents are never published.
- The driver can edit or remove any item at any time.
- **Hiding the profile does not remove the employer review.** This is stated in the interface at the point where the driver toggles visibility, not buried in a policy.
- A displayed item is visibly a *selected* recommendation, not an automatic employment history.

## 6. Trust, fairness and moderation

### 6.1 Fraud and manipulation

| Risk | Control |
| --- | --- |
| Fake reviews from non-drivers | Verification gate; unverified reviews are published but excluded from the score and marked |
| Competitor brigading | Rate limits per account and per IP, device and behavioural signals, burst detection on a company within a window, and a manual hold when a burst arrives |
| Employer-bought positive reviews | Payment records are checked against reviewers; an employer paying a driver for a review is a breach with a public consequence |
| Suppression by subscription | Technically impossible by design: the tier field is not read by any query that filters, sorts or scores reviews |
| Review farming via accounts | One review per driver per employer per employment period; edits are versioned and dated |
| Coordinated negative campaign | Publication delay on a new company's first reviews, velocity thresholds, and a "under review" state that does not hide the reviews but pauses their inclusion in the score |

### 6.2 Right of reply and disputes

- The employer may post one public reply per review, labelled **Company reply**.
- The employer may report a review for a factual error, a legal issue or a policy breach. The report is not a removal.
- A moderated decision produces a public status on the review: published, edited (with what changed), removed (with the policy clause), or under review.
- The driver may contest a decision once, with reasons; the appeal is reviewed by a different moderator where staffing allows.
- Neither party can pay for a different outcome; the moderation policy is published and versioned, and every decision cites the clause used.

### 6.3 Small employers and identification

This is the hardest problem in employment reviews and must be designed, not patched.

- The submission form warns when the employer has fewer than 10 drivers in the reviewed period that details may identify the author.
- The driver can request **coarsening**: the period becomes a year, the job category becomes "driver", and the country is removed.
- Where a review contains an identifying detail (a name, a plate, a customer), moderation redacts it; the driver is told what was redacted and why.
- A small employer may request coarsening of a review that identifies an individual colleague; the request is assessed against the public interest in the review.

### 6.4 Evidence without exposure

- Verification evidence is seen by moderators only, stored separately from review content, and deleted after the decision.
- Facts in a review are treated as the driver's account, not as platform findings. The platform asserts only what it verified: the employment.
- The interface separates three kinds of statement everywhere: **verified fact** (the employment), **company statement** (the reply), **driver opinion** (the account).

## 7. Legal flags (for counsel, not decided here)

| Area | Question |
| --- | --- |
| GDPR | Lawful basis for processing employment data; retention of reviews after account deletion; data-subject requests that would reveal another driver; special-category data that drivers may volunteer in free text |
| DSA | Notice-and-action handling, statement of reasons for removals, transparency reporting once the platform exceeds the relevant size threshold, internal complaint handling and out-of-court dispute settlement |
| Defamation | Per-member-state rules on statements of fact versus opinion; who is liable for user content; what the platform must do after notice |
| Employment law | Whether publishing conditions breaches confidentiality clauses; whistleblowing protections where safety is raised |
| Consumer law | Whether a "would recommend" percentage is an unfair commercial practice if the sample is small or unrepresentative |
| Retention | How long a review stays published, and whether an employer can require deletion after a legal dispute |

None of these are resolved. Each needs a lawyer in the first market.

## 8. What this does to the product

- The employer profile becomes the product's centre of gravity, with vacancies attached to it.
- A driver can use DriverCompass with no intention of applying — reading employers is a legitimate use, and it is what builds the review corpus.
- The score is a reputation asset for the employer, which is the honest commercial reason for them to care about the record and to reply.

## 9. Deliberately not in this scope

- No review database, rating computation, employer reply workflow, moderation console or appeals tooling.
- No recommendations of drivers by employers inside this feature.
- No algorithm that ranks employers by score.
- No scraping of reviews from other platforms.
- No publication of individual salaries attached to a named driver.

## 10. Next step, if approved

1. Legal opinion on the moderation model and the defamation exposure in the first market.
2. Data model for review, verification, response and moderation events (append-only).
3. A closed pilot with one employer and its drivers, published with explicit consent, before any public launch.

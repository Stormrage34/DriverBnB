# DriverCompass — Product Gap Analysis

**Date:** 13 November 2026
**Method:** read the repository (`src/db/schema.ts`, 43 routes, 24 components), the running application, and the existing tests. Nothing below is inferred from documentation alone.

## 1. What already exists and already fits the mission

| Capability | Current state |
| --- | --- |
| Structured vacancies | 30+ fields on `vacancies`: contracting entity, gross pay range, currency, period, allowances (JSONB), rotation, home time, weekly rest, loading duty, accommodation + details, vehicle, equipment, operating countries, languages, licences, experience, training, application method |
| Vacancy page | Renders the fields as a labelled record with an information-completeness score; missing values now surface as a "Not stated by the employer" disclosure |
| Employer profiles | Company page with identity, company type (direct/agency), verification record and dates, published vacancies, review summary |
| Driver reviews | `driver_reviews` + `review_responses` tables, submission route, moderation statuses, right of reply, review breakdown on the company page, empty state |
| Driver profile data | Licences, Code 95, ADR qualification + classes, years of experience, transport experience, preferred categories/countries/rotation, availability, languages, CV object key |
| Privacy controls | `profileVisibility` (private by default), `isSearchable` (opt-in), CV upload disabled in the pilot, no public driver directory |
| Direct contact | Enquiry flow from the driver, employer inbox, application URL/email methods, no allocation or ranking |
| Roles | Driver, employer, admin with server-side permission checks and tests |

The product is **not** a blank job board. The data model for employer intelligence and the skills passport is substantially present; the gaps are in presentation, verification depth and a few workflows.

## 2. Gaps, by pillar

### A. Know the employer

| Gap | Current | Target | Work required |
| --- | --- | --- | --- |
| Review summary | Star breakdown + count on the company page | Recommendation percentage with its verified denominator, category averages with counts | Query + component. **Blocked on a data-model decision**: `driver_reviews` has no verified/unverified flag and no employment period |
| Verification labels | One verification status per company | Separate, dated checks (identity, employer type, vacancy) surfaced individually | Schema: verification records per check type (partially present in `company_verifications`) + UI |
| Review provenance | Review has rating + text + author visibility | Employment relationship, period, country, language of work; verified vs not | Schema migration + submission form |
| Employer reply | Exists (`review_responses`) | Public, labelled, counted separately | UI copy only |
| Reviews index | None | "Driver reviews" browse surface | New route + query; not built because empty |
| Employer operating locations | Not modelled | Cities/countries served | Schema + form |
| Fleet information | Free-text `equipment` per vacancy | Company-level fleet description | Schema (company level), not vacancy level |

### B. Show your value

| Gap | Current | Target | Work required |
| --- | --- | --- | --- |
| Public professional profile | None — profiles are private or visible on request to employers who receive an enquiry | A driver-controlled profile view | Product decision on visibility model, then route + permissions |
| Evidence levels | None | Self-declared / document checked / corroborated | Schema (evidence type + date + reviewer), storage for documents, retention policy, moderation |
| Qualification expiry | Not modelled | Expiry dates with reminders | Schema + notification job |
| Route and equipment experience | Free-text `transportExperience` | Structured lists | Schema |
| Skills presentation | Form fields only | Summary card the driver can share | Component + permission check |
| Employer search of drivers | `isSearchable` flag exists | Search that respects consent | Query + employer UI + audit trail |

### C. Choose directly

| Gap | Current | Target | Work required |
| --- | --- | --- | --- |
| Matching | Filter-based search, relevance sort by completeness | Explainable match on skills and preferences | Ranking model + explanation strings; **must not** become a paid ranking |
| Match explanations | None | "Good match because…" | Derived from filter hits; no ML needed |
| Contact controls | Enquiry flow, profile visibility | Per-enquiry disclosure choices | Form + audit |
| Employer search of drivers | Not exposed | Consent-based discovery | See B |
| Notifications | None | "A driver replied", "a review was answered" | Job runner + email provider (already abstracted) |

## 3. What the bounded alignment changed now

- Homepage hero, three pillar sections and the employer section rewritten to the positioning.
- Navigation: `Find work · Employers · How verification works · For employers`.
- Vacancy page: explicit disclosure of fields the employer did not state.
- Brand: DriverCompass identity, metadata, icons, email header (previous task).

## 4. What was deliberately not built

- No review verification flag, no recommendation percentage, no reviews index — each needs a schema decision and a moderation model; shipping a half-built reputation system would violate the trust principle.
- No public driver directory — the visibility model needs a product decision.
- No match scoring — no validated methodology exists.
- No billing changes.

## 5. Priority order (market advantage, not visual novelty)

1. **Review provenance** (relationship, period, verified flag) — it is the differentiator and it is blocked on one migration.
2. **Employer verification displayed per check**, with dates — cheap, and it makes "verified" mean something.
3. **Skills passport presentation** from existing columns — no migration needed for a first version.
4. **Match explanations** from existing filters — no model needed.
5. **Driver discovery under consent** — only after the visibility decision.

## 6. Risks

| Risk | Why it matters |
| --- | --- |
| Reputation system without provenance | A score that cannot separate verified from claimed is worse than no score; it invites the exact manipulation the brand promises to resist |
| Public profiles | Re-identification and employer pressure; requires explicit consent design, not a toggle |
| Document verification | Special-category data, retention and breach exposure; needs storage, encryption and deletion policy before the first upload |
| Matching | Explainability is a legal and ethical requirement; a black box cannot be defended |
| Employment-intermediation classification | Any feature that selects or allocates drivers changes the legal classification — counsel before building |

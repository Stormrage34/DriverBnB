# Product Requirements — DriverCompass MVP 1

**Version:** 1.2 · 13 November 2026
**Scope:** Employer discovery and verified vacancies (Pillar 1)
**Status key:** Implemented / Partial / Missing / Unverified (code exists, never exercised end-to-end)

## 1. Actors

| Actor | Description |
| --- | --- |
| Visitor | Unauthenticated user browsing public pages |
| Driver | Registered professional driver seeking employment |
| Employer owner | Registered representative of a transport company |
| Moderator / admin | Trust-operations user |
| System | Scheduled jobs, audit, rate limiting |

## 2. Functional requirements

### 2.1 Accounts and authentication

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| AUTH-01 | Driver can register with name, email, password and country | MUST | Implemented, unverified |
| AUTH-02 | Employer can register and create a company record with legal name, country, registration number and classification | MUST | Implemented, unverified |
| AUTH-03 | Passwords are stored as salted scrypt hashes; sessions use random tokens stored as hashes in HTTP-only cookies | MUST | Implemented, unverified |
| AUTH-04 | Login is rate-limited and returns a generic error for unknown email or wrong password | MUST | Implemented, unverified |
| AUTH-05 | Role-based redirect after login (driver/employer/admin) with sanitised `next` path | MUST | Implemented, unverified |
| AUTH-06 | Password change from account settings | SHOULD | Implemented, verified — current session retained; other sessions revoked |
| AUTH-07 | Password reset by email | SHOULD | Not implemented — blocked on token-table approval and email delivery |
| AUTH-08 | Email verification | SHOULD | Not implemented — blocked on token-table approval and email delivery |
| AUTH-09 | Session listing and revocation | COULD | Partial — password change and account suspension revoke sessions; no session list |

Acceptance for AUTH-01..06: a fresh user can register, sign in, reach the correct workspace, sign out,
and cannot reach another role's workspace by URL.

### 2.2 Driver profile and privacy

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| PROF-01 | Profile fields: name, country, languages, licence categories, Code 95, ADR classes, experience, preferences, availability | MUST | Implemented, unverified |
| PROF-02 | Contact email and phone are private and shared only per enquiry, by explicit checkbox | MUST | Implemented, verified — employer payload contains only enquiry-stored contact fields; phone option requires a stored phone (`tests/http/privacy.test.ts`) |
| PROF-03 | Profile visibility is private by default; searchable-by-employer is off by default | MUST | Not offered — both unsupported controls were removed in T-003; profiles are forced private |
| PROF-04 | CV upload, private storage and per-employer sharing | SHOULD | Missing (deferred) |
| PROF-05 | Driver can export personal data as JSON | MUST (GDPR) | Implemented, unverified |
| PROF-06 | Driver can delete account and personal data | MUST (GDPR) | Implemented, unverified |
| PROF-07 | No public display of contact details, home address or current employer | MUST | Implemented, unverified |

Acceptance: an employer account cannot retrieve any driver profile, CV, email or phone through public
pages or server actions.

### 2.3 Company registration and verification

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| VER-01 | Company profile stores legal name, trading name, country, registration number, address, website, contact | MUST | Implemented, unverified |
| VER-02 | Company declares direct employer / agency / subcontractor / intermediary | MUST | Implemented, unverified |
| VER-03 | Verification statuses: unverified, submitted, identity checked, direct-employer checked, verified, suspended | MUST | Implemented, unverified |
| VER-04 | Moderator records decisions with mandatory reasoning in the audit log | MUST | Implemented, verified — queue and decision exist; all admin surfaces are present |
| VER-05 | Verification is independent of payment; no paid badge | MUST | Implemented (no billing exists) |
| VER-06 | Suspended companies are hidden from public pages and cannot publish | MUST | Implemented, verified — public/direct-URL queries, employer writes, saved lists, review submission and admin decisions enforce `suspended_at` and the legacy status |

Acceptance: a company cannot reach `verified` without a moderator decision; changing registration
number after verification is blocked; the public profile distinguishes checked facts from declared
information.

### 2.4 Vacancies

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| VAC-01 | Structured fields: title, country, city, category, contract type, contracting entity, licences, experience | MUST | Implemented, unverified |
| VAC-02 | Pay fields: gross min/max, currency, period, pay structure, itemised allowances | MUST | Implemented, unverified |
| VAC-03 | Conditions: working pattern, rotation, home time, weekly rest, accommodation + details, loading duties | MUST | Implemented, unverified |
| VAC-04 | Equipment, routes, languages, training, benefits | SHOULD | Implemented, unverified |
| VAC-05 | Publishing blocked until mandatory conditions are complete | MUST | Implemented, verified — employer saves, transitions and administrative restoration all require publishability |
| VAC-06 | Vacancy statuses: draft, published unverified, published verified, confirmed, reconfirmation required, expired, suspended | MUST | Implemented, unverified |
| VAC-07 | Last confirmation date displayed; reconfirmation every 30 days | MUST | Implemented, verified — due date marks `reconfirmation_required`; expiry after 7-day grace. No scheduler deployed, so production expiry depends on operator scheduling |
| VAC-08 | Expired and suspended vacancies hidden from drivers | MUST | Implemented, verified — search, detail, saved list and applications |
| VAC-09 | Employer can edit and expire own vacancies only | MUST | Implemented, verified — ownership scoped by company; expired republish requires completeness |

Acceptance: a vacancy cannot be published without gross pay, pay structure, rotation, home time,
weekly rest, accommodation, licence requirements and an application method; an edited live vacancy
cannot lose those fields.

### 2.5 Search and discovery

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| SRCH-01 | Filter by country, category, ADR, gross pay (monthly equivalent), accommodation, loading | MUST | Implemented, unverified |
| SRCH-02 | Filter by direct employer vs intermediary and by verification status | MUST | Implemented, unverified |
| SRCH-03 | Sort by relevance/verification, newest, pay | MUST | Implemented, unverified |
| SRCH-04 | Results show verification, confirmation date and information completeness | MUST | Implemented, unverified |
| SRCH-05 | Filters by experience, home time, pay structure, language (multi) | SHOULD | Missing / partial |
| SRCH-06 | Saved searches and alerts | COULD | Missing |

Acceptance: filtering never returns expired/suspended vacancies; paid promotion cannot override
filters (no promotion exists yet).

### 2.6 Company profile and reviews

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| REV-01 | Public company profile: identity, type, sectors, fleet, description, vacancies, reviews, verification record | MUST | Implemented, unverified |
| REV-02 | Published reviews show overall + eight category ratings, employment period and pseudonym | MUST | Implemented, unverified |
| REV-03 | One review per driver per employment period; duplicate blocked | MUST | Implemented, unverified |
| REV-04 | Reviews are moderated before publication | MUST | Implemented, verified — explicit transition model; rejected/removed terminal; ambiguous legacy rows fail closed |
| REV-05 | Employer may publish one response per review | MUST | Implemented, unverified |
| REV-06 | Employer cannot delete or edit reviews; removal only via moderation | MUST | Implemented by omission (no delete action) |
| REV-07 | Reviews may be reported; moderators record outcomes | MUST | Implemented, verified — `/admin/reports` with terminal outcomes |
| REV-08 | Criminal/exploitation allegations are not published as fact without substantiation | MUST (legal) | Policy written; moderation workflow now available |

Acceptance: an employer account has no code path to delete, edit or hide a published review; a driver
cannot submit two reviews for the same company and start month.

### 2.7 Direct contact and applications

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| APP-01 | Vacancy offers exactly one declared application method: external URL, email, or platform enquiry | MUST | Implemented, unverified |
| APP-02 | Platform enquiry stores message; contact details shared only if the driver opts in per enquiry | MUST | Implemented, verified — the employer payload carries only the enquiry-stored email/phone |
| APP-03 | Employer sees enquiries for own company only; driver sees own enquiry history | MUST | Implemented, unverified |
| APP-04 | Platform does not rank, select, forward CVs or negotiate | MUST | Implemented by design |
| APP-05 | Email notifications for new enquiries and moderation outcomes | SHOULD | Missing |

Acceptance: an enquiry created without contact consent contains no email or phone; employer A cannot
read employer B's enquiries.

### 2.8 Administration and audit

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| ADM-01 | Admin dashboard with verification, vacancy, review and report queues | MUST | Implemented, verified — dashboard plus all queues |
| ADM-02 | Vacancy moderation: suspend, restore, expire | MUST | Implemented, verified — validated transition resolver |
| ADM-03 | Review moderation: publish, reject, remove with reasoning | MUST | Implemented, verified — explicit transition model |
| ADM-04 | Report handling: investigate, resolve, dismiss | MUST | Implemented, verified |
| ADM-05 | User suspension and restoration | MUST | Implemented, verified — existing sessions invalidated |
| ADM-06 | Audit log viewer | MUST | Implemented, verified — read-only, paginated |
| ADM-07 | All sensitive actions recorded with actor, entity, reasoning, timestamp, IP | MUST | Implemented, verified for admin mutations and blocks |

## 3. Non-functional requirements

- **Security:** server-side validation on every write; server-side role enforcement on every action;
  rate limiting on auth/contact/enquiry/review; secure headers; no secrets in source.
- **Privacy:** data minimisation; private-by-default profiles; retention rules documented; export and
  deletion workflows; separate controller roles for platform and recruiting employers.
- **Accessibility:** semantic landmarks, labelled inputs, keyboard-operable forms, visible focus,
  colour contrast, no reliance on colour alone.
- **Mobile:** mobile-first layouts, tap targets ≥ 44px, no horizontal scrolling for core journeys.
- **Performance:** public list pages server-rendered, paginated; no client-side data waterfalls.
- **Compatibility:** current evergreen browsers; responsive web, no native app.
- **Observability:** audit log for trust actions; error monitoring not yet integrated.
- **Localisation:** English only for pilot; currency EUR; country codes ISO-3166 alpha-2.

## 4. Out of scope (explicit)

Candidate selection/ranking sold to employers, automatic job allocation, employment contract
generation, wage negotiation, per-hire commissions, driver tracking, performance monitoring, mandatory
public CVs, freight load allocation, rate negotiation, carriage management, owner-driver commercial
marketplace, payments, CV upload.

## 5. Pilot metrics

1. Verified employers.
2. Active confirmed vacancies.
3. Share of vacancies with complete salary and condition information.
4. Drivers contacting employers.
5. Driver-to-employer enquiry conversion.
6. Vacancy reconfirmation rate.
7. Driver return rate after 30 days.
8. Employer subscription conversion (once billing exists).
9. Credible reviews per company.

## 6. Acceptance for MVP 1

MVP 1 is complete only when every MUST requirement above has an executable test or documented manual
verification, the production build passes, permissions are proven server-side, and a Dutch pilot can
run with fictional demo data without misrepresenting any real company.

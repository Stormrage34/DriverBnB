# Project Brief — DriverCompass

**Version:** 1.0 · 12 November 2026
**Status:** Pre-alpha pilot build. Not launched.

## 1. Mission

Build a European peer-to-peer transport recruitment marketplace in which professional drivers can
identify trustworthy transport employers, compare real employment conditions, read reviews from
other drivers, and contact the employer directly — without a recruitment intermediary deciding who
sees what, who is ranked, or who gets the job.

## 2. Problem

A transport vacancy can be technically truthful and still conceal the facts that decide whether the
job works:

- Is the advertised figure gross or net, and what does it include?
- Is accommodation provided, deducted, optional or absent?
- Is the driver paid for calendar days, working days or hours?
- Which legal entity signs the contract — the carrier, an agency or a client?
- Where is the truck parked during weekly rest?
- Are loading and unloading expected?
- Are deductions made for damage, fuel or equipment?
- Is the vacancy still open at all?

Drivers currently resolve these questions through informal networks, trial employment, or not at all.
Job boards compete on the number of adverts, not the quality of information about the employer behind
them. Agencies are frequently indistinguishable from direct employers.

## 3. Users

**Primary — professional drivers.** C+E international drivers, reefer and temperature-controlled
drivers, ADR tanker and tank-container drivers, sea-container and box-trailer drivers, regional
drivers, newly qualified drivers, experienced drivers changing employer, and EU drivers seeking
direct employment in another Member State.

**Paying — transport employers.** Small and medium carriers, large international fleets, reefer
operators, ADR/tanker companies, container operators, and cross-border recruiters that hire directly.
Recruitment agencies and intermediaries may participate only with clear disclosure of their role.

**Trust operations — moderators.** Verify company identity, moderate vacancies and reviews, handle
reports, and record decisions.

## 4. Value proposition

For drivers: structured, comparable employment conditions; separation of verified facts from
employer claims; credible reviews with a right of reply; direct contact; private-by-default profile.

For employers: access to informed drivers, structured vacancy presentation, verified identity, direct
enquiries, and a public right of reply — without per-hire commissions or candidate-ranking products.

## 5. Product principles

1. The driver owns the decision. The platform introduces parties; it does not select, rank, allocate
   or negotiate.
2. Verification is evidence, not marketing. It cannot be purchased and is separate from vacancy
   confirmation.
3. Conditions beat adjectives. Pay, rotation, home time, accommodation and duties are structured
   fields.
4. Privacy is the default. Profiles and CVs are private; employers cannot browse drivers.
5. Reputation cannot be bought. Employers may reply; they may not remove criticism.
6. Intermediaries must identify themselves.

## 6. Scope — approved MVP (Pillar 1)

In scope:

- Driver accounts and private professional profiles.
- Company registration and verification (identity, direct-employer status).
- Direct employer vs agency/subcontractor/intermediary classification.
- Structured vacancies with working-condition fields and confirmation dates.
- Vacancy search and filters.
- Company profiles.
- Driver reviews and employer responses.
- Direct application and contact (employer page, email, platform enquiry).
- Admin moderation, reporting and audit.

Out of scope for MVP:

- Automated candidate selection, ranking, job allocation.
- Employment contract generation, wage negotiation, per-hire commissions.
- Driver tracking or performance monitoring.
- Owner-driver business marketplace (Pillar 2), freight exchange, load allocation.
- Payments and subscriptions (billing UI placeholder only).
- CV upload (deferred; storage fields exist).
- Native mobile apps (responsive web only).

## 7. First market

The Netherlands, for a concrete starting point and a transport sector the founder knows directly:
reefer, ADR tanker, tank-container, sea-container and box/general freight. Expansion to Germany,
Belgium and other EU markets follows only after the verification model works in one market and
country-specific legal advice is obtained.

## 8. Success definition

The product succeeds when a driver can say:

> "I know who this company is, I understand what the job actually pays and requires, I have read what
> other drivers experienced, and I decided to contact them myself."

Registrations are not a success metric. The pilot measures verified employers, active confirmed
vacancies, share of vacancies with complete salary and condition information, driver-to-employer
contact rate, vacancy reconfirmation rate, driver return rate, employer conversion and credible
reviews per company.

## 9. Constraints

- Legal review is required in each launch country (employment intermediation, Platform Work
  Directive transposition, DSA, GDPR, pay transparency, defamation).
- The platform must not perform regulated recruitment functions without authorisation.
- EU-region hosting and data processing.
- No real company may be presented with fabricated conditions or reviews; demo data is fictional and
  labelled.
- The build must remain maintainable by a small team; unnecessary dependencies and services are
  avoided.

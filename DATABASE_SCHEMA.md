# Database Schema — DriverCompass MVP 1

**Version:** 1.2 · 13 November 2026
**Engine:** PostgreSQL 17
**ORM:** Drizzle ORM (`src/db/schema.ts`)
**Migration state:** `drizzle/0000_crazy_norrin_radd.sql`, `drizzle/0001_t002d_trust_stabilization.sql` and `drizzle/0002_normal_angel.sql` generated. `0000` and `0001` are applied to `driverfirst` and `driverfirst_test`; `0002` is applied to `driverfirst_test` only, by T-005 direction. The development database has not received `user_tokens`.
**Data state:** 20 tables; development database has 0 companies and 0 vacancies. No seed dataset exists.

## 1. Conventions

- Primary keys: UUID (`gen_random_uuid()`), except none — all tables use UUID.
- Timestamps: `timestamptz`, `created_at` and `updated_at` default `now()` unless noted.
- Enums: PostgreSQL native enums for stable classifications.
- Arrays: `text[]` for list-like attributes (licences, languages, countries, sectors).
- JSONB: allowances, verification submission snapshots and audit metadata.
- Money: integer whole euros, with explicit `currency` and `pay_period`; never floats.
- Deletes: `ON DELETE CASCADE` for user-owned content, `SET NULL` for audit references.
- Migration policy: applied migrations are immutable. Schema changes require a new generated
  migration; the database is never reset as part of a task.

## 2. Enums

| Enum | Values |
| --- | --- |
| `user_role` | driver, employer, admin |
| `user_token_purpose` | email_verification, password_reset |
| `company_type` | direct_employer, recruitment_agency, subcontractor, intermediary |
| `verification_status` | unverified, submitted, identity_checked, direct_employer_checked, verified, suspended |
| `vacancy_status` | draft, published_unverified, published_verified, confirmed, reconfirmation_required, expired, suspended |
| `transport_category` | reefer, adr_tanker, adr_tank_container, container, box_general, regional, other |
| `contract_type` | permanent, fixed_term, temporary_agency, subcontract, freelance |
| `pay_period` | month, week, hour |
| `accommodation_arrangement` | provided_free, provided_deducted, optional, not_provided, not_disclosed |
| `loading_duty` | none, occasional, full |
| `application_method` | external_link, email, platform_message |
| `review_status` | pending, published, under_review, rejected, removed |
| `enquiry_status` | sent, viewed, responded, closed |
| `report_status` | open, investigating, resolved, dismissed |
| `report_target` | review, vacancy, company, message |
| `moderation_decision` | approved, rejected, needs_information |
| `subscription_plan` | basic, vacancy, business, multi_vacancy |
| `subscription_status` | active, past_due, cancelled, trialing |

## 3. Tables

### 3.1 `users`

Account identity for all roles.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| email | text | unique index `users_email_unique`; stored lowercase |
| password_hash | text | scrypt encoded string |
| role | user_role | default driver |
| display_name | text | shown in workspaces; reviews use a derived pseudonym |
| email_verified_at | timestamptz | nullable; set only by a consumed email token or the controlled operator procedure |
| is_active | boolean | default true; false on suspension |
| suspended_reason | text | null when active |
| last_login_at | timestamptz | |
| created_at / updated_at | timestamptz | |

Relations: 1–1 `driver_profiles`, 1–N `sessions`, 1–N owned `companies`, 1–N reviews, enquiries,
saved items, audit rows.

### 3.2 `sessions`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK users CASCADE | index |
| token_hash | text | unique; SHA-256 of cookie token |
| user_agent / ip_address | text | request context |
| expires_at | timestamptz | 30 days |
| created_at | timestamptz | |

### 3.3 `user_tokens`

Single-use account tokens. Only a SHA-256 hash is stored; the raw token exists only in the email link
or the test adapter.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| user_id | uuid FK users CASCADE | index with purpose |
| purpose | user_token_purpose | `email_verification` or `password_reset` |
| token_hash | text | unique; SHA-256 hex of a 32-byte base64url token |
| expires_at | timestamptz | 24 hours for verification, 1 hour for reset |
| consumed_at | timestamptz | null until atomically consumed |
| created_at | timestamptz | |

Indexes:

- `user_tokens_token_hash_unique` — unique token hash.
- `user_tokens_user_purpose_idx` — lookup by owner and purpose.
- `user_tokens_one_unconsumed_per_purpose` — partial unique index on `(user_id, purpose)` where
  `consumed_at IS NULL`, so at most one live token exists per purpose.

Issuance serialises on the user row and marks prior unconsumed tokens consumed in the same
transaction. Consumption is a single conditional `UPDATE ... RETURNING`.

### 3.4 `driver_profiles`

Private professional profile, one per driver.

Key columns: `user_id` (unique, FK CASCADE), `first_name`, `country_of_residence`, `languages[]`,
`licence_categories[]`, `code_95`, `adr_qualified`, `adr_classes[]`, `years_experience`,
`transport_experience`, `preferred_categories[]`, `preferred_countries[]`, `preferred_rotation`,
`availability`, `cv_object_key`, `cv_file_name`, `phone`, `contact_email`, `profile_visibility`
(default `private`), `is_searchable` (default false), timestamps.

Privacy: no public query joins this table. CV fields exist but no upload surface.

### 3.4 `companies`

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK | |
| owner_user_id | uuid FK users SET NULL | employer account |
| slug | text | unique |
| legal_name / trading_name | text | |
| country | text | ISO alpha-2, indexed |
| registration_number | text | registry identifier |
| registered_address | text | |
| website / business_email / phone / contact_person | text | |
| sectors | text[] | |
| fleet_size | integer | |
| operates_own_fleet / recruits_directly | boolean | declarations |
| company_type | company_type | direct/agency/subcontractor/intermediary |
| contracting_entity | text | entity signing contracts |
| description | text | employer-provided |
| verification_status | verification_status | default unverified, indexed; `suspended` is a legacy state |
| verification_version | integer | not null default 0; `0` = legacy/untrusted, `>= 1` = moderator-reviewed trusted evidence |
| verified_at / last_verified_at | timestamptz | |
| verification_notes | text | moderator/internal notes |
| is_demo_seed | boolean | true for fictional pilot data |
| suspended_at / suspension_reason | timestamptz / text | company-wide suspension set by an admin; does not change `verification_status` |
| created_at / updated_at | timestamptz | |

### 3.5 `company_verifications`

Audit trail of verification submissions and decisions.

Columns: `company_id` FK CASCADE, `submitted_by_user_id` SET NULL, `submitted_data` JSONB,
`evidence_notes`, `status` verification_status, `decision` moderation_decision, `reviewer_id` SET NULL,
`reviewed_at`, `decision_notes`, `created_at`. Index on `company_id`.

`submitted_data` convention (no schema change; T-002c):

| Key | Meaning |
| --- | --- |
| `identity` | normalized snapshot submitted by the employer: legal name, trading name, country, registration number, address, contracting entity, company type, direct-recruitment flag |
| `identityHash` | SHA-256 of canonical JSON for `identity` |
| `reviewedIdentity` | snapshot the moderator actually reviewed |
| `identityChanges` | array of `{field,label,previous,current,category}` for moderator display |
| `operationalChanges` | same shape for operational fields; material changes are flagged |
| `source` | `employer_submission` for employer evidence; `company_profile_update` for a system-generated invalidation record; absent on legacy rows |
| `identityChangeConfirmed` | boolean confirmation recorded when an existing verification record is changed |
| `resubmission` | true when evidence updates an existing submission |

`audit_logs.metadata` stores the same identity/hash and previous/next status on submission, decision,
invalidation and blocked decision. Per-stage timestamps and DB-enforced transitions are not present;
the audit log is the record.

### 3.6 `company_subscriptions`

Billing placeholder; no payment integration.

Columns: `company_id` FK CASCADE, `plan` subscription_plan default basic, `status`
subscription_status default active, `current_period_end`, timestamps.

### 3.7 `vacancies`

Core structured vacancy record.

Identity: `id`, `company_id` FK CASCADE, `created_by_user_id` SET NULL, `slug` unique, `title`,
`country`, `city`, `contracting_entity`, `transport_category`.

Requirements: `licence_requirements[]`, `experience_requirements`, `contract_type`.

Pay: `gross_pay_min`, `gross_pay_max`, `currency` (default EUR), `pay_period`, `pay_structure`,
`allowances` JSONB array of `{label, amount, currency, note?}`.

Conditions: `working_pattern`, `rotation`, `home_time`, `loading_unloading`, `accommodation`,
`accommodation_details`, `weekly_rest`.

Equipment and context: `vehicle_type`, `equipment`, `operating_countries[]`,
`languages_required[]`, `training_provided`, `benefits`.

Application: `application_method`, `application_url`, `application_email`, `contact_name`.

Lifecycle: `status`, `info_score` (0–100 computed), `published_at`, `last_confirmed_at`,
`reconfirm_due_at`, `view_count`, `moderation_note`, `suspended_from_status`, timestamps.

`suspended_from_status` is nullable. It records the live status a vacancy had when the company was
suspended, so company restoration can restore only that state. It is null for an individual
administrative suspension and is cleared when an individual admin action sets the status. This is the
guard that prevents company restoration from overriding a separate administrative decision.

Indexes: company, status, country, category.

### 3.8 `vacancy_reconfirmations`

Append-only record of employer confirmations: `vacancy_id` FK CASCADE, `confirmed_by_user_id`
SET NULL, `note`, `created_at`.

### 3.9 `driver_reviews`

| Column | Notes |
| --- | --- |
| company_id, driver_user_id | FKs CASCADE |
| job_title, employment_start, employment_end | period is date (day precision, month supplied by UI) |
| overall_rating | 1–5 |
| payment_reliability, advert_accuracy, dispatch_management, equipment, home_time, accommodation, deductions, working_conditions | nullable 1–5 |
| title, body | published text |
| status | default pending |
| eligibility_attested | boolean |
| moderation_notes, moderated_by_user_id, moderated_at | moderation trail |
| published_at, timestamps | |

Unique: `(company_id, driver_user_id, employment_start)` — one review per employment period.
Indexes: company, status.

### 3.10 `review_responses`

`review_id` FK CASCADE, `company_id` FK CASCADE, `author_user_id` SET NULL, `body`, `status`
(default published), timestamps. One response per review is enforced in application logic, not by a
unique constraint (candidate hardening item).

### 3.11 `enquiries`

Direct driver-to-employer contact record.

`vacancy_id` FK SET NULL, `company_id` FK CASCADE, `driver_user_id` FK CASCADE, `method`
application_method, `message`, `shared_email`, `shared_phone`, `status` enquiry_status,
`employer_viewed_at`, `responded_at`, timestamps. Indexes: driver, company.

`shared_email` / `shared_phone` are null unless the driver opted in for that enquiry.

### 3.12 `saved_vacancies`, `saved_companies`

Join tables with unique `(user_id, vacancy_id)` / `(user_id, company_id)`, cascading deletes.

### 3.13 `content_reports`

`reporter_user_id` SET NULL (null for anonymous), `target_type`, `target_id` (uuid, polymorphic),
`reason`, `details`, `status`, `resolution_notes`, `handled_by_user_id`, `handled_at`, timestamps.
Index on status.

### 3.14 `audit_logs`

`actor_user_id` SET NULL, `action`, `entity_type`, `entity_id` (text), `metadata` JSONB, `ip_address`,
`created_at`. Indexes on actor and created_at. Append-only by convention; no update/delete path exists.

### 3.15 `contact_messages`

Public contact form storage: `name`, `email`, `subject`, `message`, `handled_at`, `created_at`.

### 3.16 Phase 2/3 scaffolding (no UI)

- `business_profiles` — owner-driver vehicle count, trailer types, coverage, ADR capability, insurance.
- `service_listings` — supplier/service directory entries.
- `commercial_opportunities` — subcontracting/capacity listings with contracting party and terms.

These tables exist to keep the schema modular. They are not exposed and must not be used until legal
review of the owner-driver pillar.

## 4. Migration history

| Migration | Change | State |
| --- | --- | --- |
| `0000_crazy_norrin_radd.sql` | Baseline 19-table schema | Applied; immutable |
| `0001_t002d_trust_stabilization.sql` | `companies.verification_version integer NOT NULL DEFAULT 0`; `vacancies.suspended_from_status vacancy_status NULL` | Applied to `driverfirst_test` first, then `driverfirst`; no backfill |

The T-002d migration is additive only. It does not rewrite `company_verifications` rows or historical
verification statuses. Existing rows receive version `0` and are treated as untrusted until a
moderator reviews fresh evidence. No database reset was performed.

## 5. Relationships

```
users 1─1 driver_profiles
users 1─N sessions
users 1─N companies (owner)
companies 1─N company_verifications
companies 1─1 company_subscriptions (current)
companies 1─N vacancies
vacancies 1─N vacancy_reconfirmations
companies 1─N driver_reviews
users 1─N driver_reviews
driver_reviews 1─N review_responses
companies 1─N enquiries
users 1─N enquiries
users 1─N saved_vacancies / saved_companies
users 1─N content_reports (optional)
users 1─N audit_logs (optional)
```

## 6. Retention (stated policy; no purge job yet)

| Data | Retention |
| --- | --- |
| Account and profile | Until deletion |
| Sessions | 30 days or sign-out |
| Enquiries | 24 months after last activity |
| Reviews | While published; deleted with account |
| Verification evidence and audit | Up to 5 years where needed for compliance |
| Security logs | 90 days |
| Contact messages | 12 months |

## 7. Planned schema work (not approved)

1. Unique constraint on `(review_id)` in `review_responses` to enforce one reply at database level.
2. `reconfirm_due_at` consistency constraint or generated status for stale vacancies.
3. `users.email_verified_at` workflow and tokens table.
4. Password reset tokens table.
5. Notification/outbox table if email delivery is added.
6. Optional `company_members` table if multiple staff accounts are required.
7. Review evidence storage reference and moderation decision history.

Any of these requires a new migration and founder approval where they change the approved design.

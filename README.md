# DriverCompass

A driver-first European transport recruitment marketplace. Drivers compare verified transport
employers on structured employment conditions, read driver reviews, and contact the employer
directly. Employers pay for visibility and recruitment tools; drivers never pay and never lose
control of their data or their decision.

**Status: pre-alpha pilot build. Not launched. No production data.** All company profiles,
vacancies and reviews created for development are fictional and labelled as demo data.

## Stack

- Next.js 16.4 (App Router) + React 19
- TypeScript 5.9 (strict)
- Tailwind CSS 4.3
- PostgreSQL 17 + Drizzle ORM 0.44 (`postgres.js` driver)
- Zod 4 validation
- Custom session authentication (scrypt password hashing, HTTP-only cookies)

## Prerequisites

- Node.js 22+ (developed on Node 26)
- PostgreSQL 16+ reachable via `DATABASE_URL`

## Local setup

```bash
cp .env.example .env          # then set DATABASE_URL
npm install
npm run db:migrate            # applies drizzle/ migrations
npm run dev                   # http://localhost:3000
```

There is no seed script yet; a pilot dataset has not been authorized.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit/DB suite (173 tests) |
| `npm run test:http` | Built-app HTTP authorization suite against `driverfirst_test`; run `npm run build` first |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Seed demo data — **file does not exist yet** |
| `npm run vacancies:lifecycle` | Dry-run vacancy reconfirmation/expiry sweep; add `-- --apply` to persist. Production should use the internal route below |
| `npm run users:verify-email` | Controlled operator verification for the existing admin bootstrap or invite-only pilot; requires `--confirm-control` |
| `npm run users:cleanup-tokens` | Bounded cleanup of expired and consumed account tokens |

## Repository layout

```
src/app/(public)     Public site: jobs, companies, reviews, legal, report
src/app/(auth)       Login and registration
src/app/dashboard    Driver workspace
src/app/employer     Employer workspace
src/app/admin        Moderation workspace
src/app/api          Route handlers (data export, internal lifecycle trigger)
src/components       UI, forms, cards, dashboard shell
src/db               Drizzle schema and migrations
src/lib              Auth, queries, validation, guards, audit, rate limiting
```

## Vacancy lifecycle and scheduling

Live vacancies become `reconfirmation_required` on their due date and are expired after a 7-day grace
period. The sweep is idempotent and skips suspended vacancies and suspended companies.

There is **no scheduler in this repository**. A deployment must choose one of:

```bash
# Authenticated HTTP trigger (recommended for hosted platforms)
POST /api/internal/vacancy-lifecycle
Authorization: Bearer $VACANCY_LIFECYCLE_SECRET

# Manual execution from a trusted host (dry-run by default)
npm run vacancies:lifecycle
npm run vacancies:lifecycle -- --apply
```

`VACANCY_LIFECYCLE_SECRET` must be set in the deployment environment; without it the route returns
503. Schedule the call at least daily. Do not describe expiry as active in production until the
schedule is actually configured and observed.

## Account security and email

- Email verification tokens expire in 24 hours; password-reset tokens expire in 1 hour. Only SHA-256
  hashes are stored, both are single-use, and reset revokes every session.
- `EMAIL_PROVIDER=disabled` is the default. Self-service verification/reset delivery therefore does
  not work until a real provider is configured. `EMAIL_PROVIDER=test` is a memory-only adapter for
  tests; it must never be used for real users.
- The existing administrator is bootstrapped with the operator-only CLI:

  ```bash
  npm run users:verify-email -- --admin-bootstrap \
    --email admin@example.eu --operator "Founder" \
    --reason "Mailbox control confirmed out of band" --confirm-control
  ```

- Invite-only pilot accounts use `--pilot` instead of `--admin-bootstrap`. There is no HTTP
  bootstrap endpoint.
- `TRUST_PROXY=false` by default. Only set it to `true` behind a proxy that overwrites
  `X-Forwarded-For`; see [OPERATIONS.md](OPERATIONS.md).
- HSTS is off unless `ENABLE_HSTS=true` on a verified HTTPS deployment.

## Tests

`npm test` covers the token lifecycle, operator verification, email templates/adapter, trusted-proxy
handling and the existing unit/DB suite. `npm run test:http` (after `npm run build`) covers
registration, verification, reset, verified-email enforcement, admin bootstrap and security headers
against the built app and `driverfirst_test`.

## Documentation

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [OPERATIONS.md](OPERATIONS.md)
- [EU_FIRST_ARCHITECTURE.md](EU_FIRST_ARCHITECTURE.md)
- [KI-040_REVIEW_RETENTION_OPTIONS.md](KI-040_REVIEW_RETENTION_OPTIONS.md)
- [KI-045_STATUS_MATRIX.md](KI-045_STATUS_MATRIX.md)
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- [API_SPECIFICATION.md](API_SPECIFICATION.md)
- [PROJECT_STATUS.md](PROJECT_STATUS.md)
- [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md)
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md)
- [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md)
- [T-004_OPERATIONAL_RISKS.md](T-004_OPERATIONAL_RISKS.md)
- [T-004_MIGRATION_PROPOSAL.md](T-004_MIGRATION_PROPOSAL.md)
- [DECISIONS.md](DECISIONS.md)

## Non-negotiable product rules

- Drivers are free users; employers pay.
- Driver profiles and CVs are private by default.
- Employers cannot buy access to private driver data.
- Verification cannot be purchased and is independent of payment.
- Employers cannot pay to remove reviews or change ratings.
- Paid listings are labelled.
- Gross and net salary are never conflated.
- Agencies and intermediaries must identify themselves.
- No candidate ranking, job allocation or wage negotiation by the platform.

## Legal

This repository is a pilot build, not a launched service. The privacy notice, terms and review
policy in `src/app/(public)` are product-accurate drafts that still require review by qualified
counsel in each operating country. See `KNOWN_ISSUES.md`.

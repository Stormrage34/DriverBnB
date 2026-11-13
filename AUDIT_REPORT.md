# Post-Rebrand Audit — Milevana

**Date:** 13 November 2026
**Audited HEAD before fixes:** `afeb835`
**Fixes commit:** `fccc0b7`
**Method:** fresh source inspection, dependency audit, HTTP/authorization suite, browser smoke
testing, brand-occurrence search and database/migration inspection. This is not a penetration test.

## Findings summary

| Severity | Found | Fixed | Outstanding |
| --- | --- | --- | --- |
| P0 — critical | 0 | 0 | 0 |
| P1 — high | 3 | 3 | 0 |
| P2 — medium | 10 | 0 | 10 |
| P3 — low | 4 | 0 | 4 |

No active P0 security, privacy or data-integrity defect was found in the implemented code.

## P1 findings — fixed

### P1-01 — Runtime dependency vulnerability in Drizzle ORM

- **Component:** `package.json`, `package-lock.json`.
- **Evidence:** `npm audit --omit=dev` initially reported one high-severity advisory:
  GHSA-gpj5-g38j-94v9, Drizzle ORM SQL injection via improperly escaped SQL identifiers, versions
  `<0.45.2`; installed version was `0.44.7`.
- **Reproduction:** `npm audit --omit=dev --json`.
- **Impact:** A library-level SQL-identifier escaping flaw in a production dependency. No vulnerable
  dynamic identifier call was found in this codebase, but the dependency should not remain on an
  affected version.
- **Correction:** Upgraded to `drizzle-orm@0.45.4`. `npm audit --omit=dev` now reports 0
  vulnerabilities.
- **Scope:** Within the audit's dependency-security scope. TypeScript, unit, build and HTTP suites
  were rerun after the upgrade.

### P1-02 — Test email adapter could be selected in production

- **Component:** `src/lib/email.ts`.
- **Evidence:** `EMAIL_PROVIDER=test` returned the in-memory adapter regardless of `NODE_ENV`. A
  production misconfiguration would accept verification/reset requests and silently discard the
  mail.
- **Reproduction:** Set `NODE_ENV=production`, `EMAIL_PROVIDER=test`, `APP_BASE_URL=https://milevana.eu`,
  then call `sendAccountEmail`; before the fix it returned `delivered: true, provider: test` with no
  outbound mail.
- **Impact:** Users could not verify or reset accounts while the UI reported success. This is a
  reliability and account-recovery failure, not a mail-disclosure issue.
- **Correction:** The memory adapter is now allowed in production only when `APP_BASE_URL` is
  explicitly set to a local host. Non-local or missing `APP_BASE_URL` falls back to `disabled`.
  Four regression tests cover local development, production-local, production non-local and absent base URLs.
  Verification/reset copy no longer claims a message was sent; it says a link will be sent when delivery
  is configured and directs the user to the pilot team if nothing arrives.
- **Scope:** Within the approved email abstraction and operational-hardening scope.

### P1-03 — Accidental national defaults in shared registration and search

- **Components:** `src/app/(public)/page.tsx`, `src/components/auth/driver-register-form.tsx`,
  `src/components/auth/employer-register-form.tsx`.
- **Evidence:** Home search defaulted to `NL`; driver registration defaulted to `BG`; employer
  registration defaulted to `NL`; the registration-number placeholder said “KvK / CoC number”.
- **Reproduction:** Open `/`, `/register?role=driver` and `/register?role=employer` and inspect the
  selected values/placeholder.
- **Impact:** The shared UI treated a Dutch or Bulgarian national context as the default, contrary to
  the EU-first requirement. A Dutch registration-number label also implied a country-specific format.
- **Correction:** Country defaults are now empty (“All countries” / “Prefer not to say” / “Select
  country of registration”); the registration-number placeholder is jurisdiction-neutral.
- **Scope:** Within the EU-first architecture correction authorized by the directive. No country
  workflow or schema change was added.

## P2 findings — outstanding

| ID | Component | Evidence / impact | Recommendation |
| --- | --- | --- | --- |
| P2-01 | Dev tooling (`vitest@3.2.7`, `drizzle-kit@0.31.11`) | `npm audit` reports 5 moderate and 2 critical advisories in test/build tooling, including Vitest path traversal and tinypool prototype pollution. Not shipped to production. | Upgrade Vitest and drizzle-kit in a dedicated tooling change; rerun the full suite. |
| P2-02 | `next.config.ts` CSP | `script-src` and `style-src` include `'unsafe-inline'`, required by the current Next.js hydration/style output. | Implement a nonce/hash-based CSP with browser verification in a separate security change. |
| P2-03 | `src/lib/rate-limit.ts` | Limits are process-local; multiple instances do not share counters. | Use a shared store before horizontal scaling. |
| P2-04 | `src/lib/email.ts` | Only `disabled` and in-memory test adapters exist; no production provider, DPA, sender domain or processing location. | Select and contract a provider; configure SPF/DKIM/DMARC; test delivery and bounce handling. |
| P2-05 | vacancy lifecycle | Route and script exist, but no scheduler is deployed; expiry is not active in any real environment. | Schedule the authenticated internal route or script and monitor runs. |
| P2-06 | operations | No monitoring, alerting, backup schedule or restore test. | Add error/uptime monitoring, database backups and a recorded restore drill. |
| P2-07 | legal | Employment intermediation, Platform Work Directive, DSA, pay transparency, defamation, retention and DAC7 reviews are outstanding. | Obtain qualified jurisdiction-specific review before launch. |
| P2-08 | domain/contact | `milevana.eu` is not registered; public contact addresses are placeholders; no mail delivery. | Register domains and mailboxes only after clearance; update addresses before launch. |
| P2-09 | employer accounts | No employer account deletion or transfer workflow; employer with a company is blocked with a message. | Add an audited transfer/deletion procedure with company ownership checks. |
| P2-10 | QA | No browser end-to-end journey suite and no assistive-technology audit. Public smoke tests and HTTP action tests exist. | Add a browser suite for the fourteen journeys and a manual keyboard/screen-reader pass. |

## P3 findings — outstanding

| ID | Component | Evidence | Recommendation |
| --- | --- | --- | --- |
| P3-01 | SEO | No sitemap, robots.txt or structured data. | Add after launch domain is fixed. |
| P3-02 | Accessibility | Some trust metadata is 10–11px; field errors use `role="alert"` but lack per-input `aria-describedby`/`aria-invalid`. | Add field-level associations and run axe/AT checks. |
| P3-03 | CI/deploy | No CI, Dockerfile or migration check in the repository. | Add a CI pipeline that runs tsc, unit, build and HTTP tests against a disposable database. |
| P3-04 | operator CLI | Bootstrap requires a `--confirm-control` flag but no second-person or interactive confirmation. | Consider dual control or a typed target-email confirmation for production operators. |

## Verification after fixes

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | PASS — 0 errors |
| `npm test` | PASS — 173 tests in 18 files |
| `npm run build` | PASS — 0 errors |
| `npm run test:http` | PASS — 74 tests in 10 files |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Browser smoke | PASS — home, `/jobs`, malformed filters, custom 404; 390px mobile filters collapsed; 1280px desktop filter panel visible |
| Brand search | No obsolete public-facing old-brand references; only historical log lines remain |
| Database | No development or production migration was run; `0002` remains test-DB only |

## Limitations

- No penetration test, DAST, dependency-reachability analysis or formal accessibility audit was
  performed.
- Browser checks covered public pages and responsive filter behaviour, not authenticated journeys.
- The HTTP suite uses real sessions and database mutation checks, but it is not a substitute for a
  browser journey suite.
- No legal or trademark clearance is asserted.

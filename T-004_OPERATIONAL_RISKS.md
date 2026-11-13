# T-004 Operational Risk Review

**As of:** 13 November 2026

Classification used here:

1. **Pilot blocker** — must be resolved or explicitly accepted before a real-world pilot.
2. **Important before public launch** — acceptable for a controlled pilot with a small known cohort,
   but not for open registration or scale.
3. **Safely deferred** — no material pilot risk under the stated conditions.

No item in this document was implemented as part of T-004 unless explicitly stated elsewhere in
`DEVELOPMENT_LOG.md`.

| Issue | Class | Practical risk | Dependencies / decision |
| --- | --- | --- | --- |
| KI-014 — process-local rate limiting | 2 | Login, registration, enquiry and report limits reset on deploy and are not shared between instances. A single-instance pilot is protected; horizontal scaling or repeated restarts weaken it. | Needs a shared store (e.g. Redis/PostgreSQL) and a proxy-level limit before public launch. Not a code-only fix. |
| KI-015 — no CSP/HSTS | 2 | Missing HSTS allows downgrade on first visit; missing CSP increases the impact of any XSS. The app already sets nosniff, referrer, frame-deny and permissions policy. | Can be delivered at the reverse proxy/edge. If the app terminates TLS directly, headers must be added there. Confirm hosting before choosing the layer. |
| KI-017 — no unique constraint on review responses | 2 | The one-reply rule is application-only. Two concurrent submissions could create two replies. Low likelihood in a small pilot, real data-integrity defect at scale. | Requires a schema migration (unique index on `review_responses.review_id`). Not authorized in T-004. |
| KI-019 — employer deletion / ownership transfer | 3 | An employer whose company cannot be deleted must be supported manually. Small pilot cohort can be handled by the operator. | Product workflow and legal ownership evidence needed before self-service. |
| KI-040 — account deletion cascades reviews | 1 | A driver can delete their account and thereby erase published criticism, which undermines review integrity. Conversely, retaining reviews conflicts with a naive erasure interpretation. | Founder/legal decision required: retain pseudonymised reviews, or delete on request. Needs a retention policy and probably a migration. |
| KI-057 — spoofable `X-Forwarded-For` | 1 | Audit IPs and rate-limit keys can be spoofed if the app is exposed directly. Behind a proxy that overwrites the header, the risk is contained. | Deployment decision: trusted-proxy allowlist or edge-generated header. Must be settled before the pilot is reachable from the internet. |
| KI-030 — unpaginated employer lists | 3 | Employer enquiry/vacancy lists grow with the account. A pilot employer with modest volume is unaffected. | Paginate before onboarding large employers; no security impact. |
| KI-045 — verification decision rewrites only published badge states | 2 | A verification decision can leave `confirmed` or other live states with stale badge labels, producing mixed semantics on the same company. | Requires a vacancy-state policy decision; changing it silently would alter employer-facing labels. Founder approval needed. |
| KI-065 — legacy verified rows are untrusted (`verification_version = 0`) | 3 | Imported or pre-existing verified companies lose the public badge until re-reviewed. This is the intended safety behaviour and the development database is empty. | Communication/runbook before importing production data. |
| KI-066 — conservative restoration to `draft` / stays suspended | 3 | An employer with an incomplete restored vacancy must fix and republish. This is deliberate and visible; no automatic notification exists. | Notification infrastructure would improve UX (KI-013). |
| KI-068 — HTTP harness depends on Next.js rendered action fields | 3 | A major Next.js upgrade can break the test harness. This affects maintenance, not the running product. | Re-check after framework upgrades. |
| KI-069 — legacy suspended company restoration downgrades verification | 3 | A company suspended under the legacy `verification_status = 'suspended'` state returns as `unverified` because no prior status is stored. | Manual re-verification after restoration; a migration could store prior status if this becomes common. |
| KI-013 — no email delivery | 1 for account security | Email verification and password reset cannot be operated end-to-end without sending mail; the token flow alone would be unusable in production. | Requires an email provider, templates, bounce handling and a retry/queue decision. Schema proposal is in `T-004_MIGRATION_PROPOSAL.md`. |
| KI-020 — Dutch legal review | 1 | Employment intermediation, Platform Work Directive, DSA, pay transparency, defamation and DAC7 risks remain unassessed. Code cannot substitute for this. | External counsel. Launch blocker independent of engineering. |

## Deployment-dependent items

- **Vacancy lifecycle scheduling.** The sweep exists and is idempotent, but no scheduler is deployed.
  Production must call `POST /api/internal/vacancy-lifecycle` with
  `Authorization: Bearer $VACANCY_LIFECYCLE_SECRET` at least daily, or run
  `npm run vacancies:lifecycle -- --apply` from a trusted host. Without one of these, vacancies do not
  expire in production.
- **Rate limiting and trusted proxy.** Both depend on the hosting topology; they are not resolved by
  application code alone.
- **CSP/HSTS.** Best delivered at the edge; must be verified against the real deployment.

## Pilot conditions implied by this review

A controlled pilot is defensible only if:

1. It runs as a single application instance or rate limits are moved to shared storage.
2. It sits behind a trusted proxy that overwrites `X-Forwarded-For` and enforces HSTS.
3. The vacancy lifecycle route is scheduled.
4. Account deletion/review retention and legal review have explicit founder decisions.
5. Email verification/reset are either implemented after migration approval or the risk of unverified
   accounts is explicitly accepted for a manually vetted cohort.

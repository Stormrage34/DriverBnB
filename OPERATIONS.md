# Operations and deployment boundary

**Date:** 13 November 2026
**Status:** pilot runbook draft. Nothing here is deployed or configured in a production environment.

## 1. Email delivery

- `EMAIL_PROVIDER=disabled` is the default. Tokens are still generated and stored hashed, but no
  account email is sent; self-service verification and reset are unavailable.
- `EMAIL_PROVIDER=test` captures messages in memory only. It must never be used for real users.
- There is **no production email adapter** in this repository. A provider, data-processing agreement,
  processing location and subprocessor review must be selected before enabling one.
- Required production configuration once a provider exists: provider credentials, `EMAIL_FROM`,
  `APP_BASE_URL` (public HTTPS origin), bounce/complaint handling and retry policy.
- Never log raw tokens, token hashes, verification URLs or reset URLs.
- Verification tokens expire in 24 hours; reset tokens expire in 1 hour; both are single-use.
- Cleanup: `npm run users:cleanup-tokens` is bounded to 500 rows per run. Schedule it daily in the
  same trusted environment as the lifecycle job.

## 2. Controlled operator verification

There is no public admin-bootstrap endpoint and no user-selectable verification method.

Admin bootstrap:

```bash
npm run users:verify-email -- \
  --admin-bootstrap \
  --email admin@example.eu \
  --operator "Founder" \
  --reason "Mailbox control confirmed out of band" \
  --confirm-control
```

Invite-only pilot:

```bash
npm run users:verify-email -- \
  --pilot \
  --email driver@example.eu \
  --operator "Founder" \
  --reason "Invite-only pilot; mailbox control confirmed out of band" \
  --confirm-control
```

Rules:

- Confirm control of the exact mailbox before running the command.
- The command targets the exact existing email address and refuses an unknown account.
- Admin bootstrap refuses a non-admin. Pilot refuses an admin.
- Already-verified accounts are refused; the audit row is not rewritten.
- The audit row is `user.email_verified_operator`, `actorUserId = null`, with `actor: operator_cli`,
  operator, reason, target email, target role and timestamp. Controls and closed mailboxes are not
  stored.
- This is an interim procedure for a controlled cohort, not a substitute for email delivery.

## 3. Trusted proxy and client IP

`TRUST_PROXY` is `false` by default. In that state the application ignores `X-Forwarded-For` and
`X-Real-IP` and uses the literal key `local`, so a spoofed header cannot create arbitrary rate-limit
keys.

Only set `TRUST_PROXY=true` when a reverse proxy:

1. listens on the public edge,
2. strips inbound `X-Forwarded-For` and `X-Real-IP`, and
3. appends the actual peer address in a documented order.

The application takes the first `X-Forwarded-For` value. A proxy that appends rather than overwrites
must be configured so the first value is the real client, or the deployment must move the trusted
hop handling into the proxy/WAF.

## 4. Security headers

Application headers on every route:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` with `default-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `object-src 'none'`, and no third-party script/connect origins.
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`

HSTS is **off** unless `ENABLE_HSTS=true`. Enable it only after HTTPS is verified end to end and the
domain is not used over plain HTTP. The value is `max-age=31536000; includeSubDomains` without
`preload`.

The reverse proxy must not strip or weaken these headers. If the proxy terminates TLS, it must set
HSTS too; the application cannot see the original scheme.

## 5. Rate limiting

`src/lib/rate-limit.ts` is an in-process sliding window. It is safe for a single Node.js instance and
is **not** multi-instance safe. Before horizontal scaling or a public launch, replace it with shared
storage (Redis or an edge/WAF limiter) or route all traffic through a single limiter. Do not claim
distributed rate limiting until that is configured and observed.

## 6. Vacancy lifecycle

- There is no scheduler in this repository. Expiry is not active until an operator configures one.
- Recommended trigger: daily `POST /api/internal/vacancy-lifecycle` with
  `Authorization: Bearer $VACANCY_LIFECYCLE_SECRET`.
- Manual dry run: `npm run vacancies:lifecycle`; apply with `-- --apply`.
- Each run emits a structured `vacancy_lifecycle_run` log with trigger, duration and counts
  (`scanned`, `markedReconfirmationRequired`, `expired`, `skipped`) and no personal data.
- Alert on non-2xx responses, missing runs, unexpected `skipped` growth or a run that scans zero rows
  when live vacancies exist.
- The sweep is idempotent and skips suspended vacancies and suspended companies.

## 7. Monitoring

Minimum before a pilot:

- uptime/HTTP checks for `/`, `/jobs`, `/login` and the internal lifecycle route;
- error tracking with personal-data scrubbing;
- alert on repeated 5xx, failed migrations, failed lifecycle runs, email-provider failures and
  abnormal auth/rate-limit patterns;
- audit review for `user.email_verified_operator`, `auth.password_reset`, `auth.email_verified`,
  admin decisions and failed authorization attempts;
- PostgreSQL connection, disk, replication and slow-query monitoring.

No monitoring integration exists in this repository. Do not claim it is configured.

## 8. PostgreSQL backups and restore

No backup is configured by this repository. A production deployment must provide:

- daily encrypted base backups plus point-in-time recovery (WAL archiving);
- retention aligned with the privacy notice and legal obligations;
- backups stored in the EU with access control and encryption at rest;
- a restore test at least quarterly, recording the restore point and verification result;
- a documented recovery-time and recovery-point objective.

Restore checklist:

1. Provision an isolated PostgreSQL instance.
2. Restore the latest base backup and replay WAL to the chosen point.
3. Run `npm run db:migrate` only if the restored schema is behind the application.
4. Verify row counts for users, companies, vacancies and audit logs.
5. Run a read-only smoke test (`/`, `/jobs`, `/login`).
6. Record the restore timestamp, backup identifier and verification result.
7. Do not point the restored instance at production until sign-off.

## 9. Secrets and deployment

- Never commit `.env`, provider credentials, lifecycle secrets or database passwords.
- Use the platform's secret store; rotate the lifecycle bearer and database credentials on a schedule.
- Do not apply migrations to development or production as part of T-005. The `user_tokens` migration
  is tested on `driverfirst_test` only.
- Do not deploy or configure production from this repository without a separate founder decision.

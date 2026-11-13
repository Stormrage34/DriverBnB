# Permission Matrix — DriverCompass (T-005)

**As of:** 13 November 2026

This matrix states the intended access for every role/resource pair. It is enforced server-side at
query, Server Action and route-handler level. Hiding a control in the UI is never treated as
authorization.

## Roles

| Code | Role |
| --- | --- |
| V | Public visitor (unauthenticated) |
| D | Driver, active session |
| D-other | A different driver's data |
| E | Employer who owns the company |
| E-other | Employer who does not own the company |
| SU | Suspended user with a previously issued session |
| SC | Company suspended by an administrator |
| A | Administrator |

`SC` is a property of the company, so an employer owning a suspended company keeps `E` identity
but loses write and public visibility while suspension is active.

## Matrix

| Resource / operation | V | D | D-other | E | E-other | SU | SC | A |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public jobs, companies, published reviews | Read | Read | Read | Read | Read | Read | Hidden | Read |
| Suspended company profile and its vacancies | 404 | 404 | 404 | 404 | 404 | 404 | 404 | Read via admin |
| `/dashboard/*` (own saved items, applications, reviews, profile, settings) | Redirect to login | Own only | No route | Redirect `/employer` | Redirect `/employer` | Redirect to login | n/a | Redirect `/admin` |
| `/api/me/export` | 401 | Own data | Own only | Own account row only | Own account row only | 401 | n/a | Own account row only |
| Enquiry send | No | Own, active vacancy, shared contacts only | No | No | No | No | No | No |
| Enquiry read | No | Own history | No | Own company only | No | No | Own company only | No |
| Enquiry contact fields | No | n/a | No | Only fields explicitly shared on that enquiry | No | No | Only shared fields | No |
| Saved companies/vacancies | No | Own only | No | No | No | No | n/a | No |
| Review submission | No | Own, active company, pre-moderated | No | No | No | No | Rejected | No |
| Review reply | No | No | No | Own company, published review, one reply, pre-moderated | No | No | No | Moderate only |
| Review moderation | No | No | No | No | No | No | No | `/admin/reviews` |
| Employer workspace `/employer/*` | Redirect to login | Redirect `/dashboard` | No | Own company | Own company only | Redirect to login | Read + blocking banner, writes rejected | Redirect `/admin` |
| Company profile edit | No | No | No | Own company | Own company only | No | Rejected | No |
| Verification submission | No | No | No | Own company | Own company only | No | Rejected | No |
| Verification evidence read | No | No | No | Own company only | No | No | Own company only | `/admin/verifications` |
| Employer review list | No | No | No | Published reviews of own company | No | No | Own company | All via admin |
| Admin workspace `/admin/*` | Redirect to login | Redirect `/dashboard` | No | Redirect `/employer` | Redirect `/employer` | Redirect to login | Redirect | All pages |
| Vacancy moderation (suspend/restore/expire) | No | No | No | No | No | No | No | `/admin/vacancies` |
| Company suspension/restoration | No | No | No | No | No | No | No | `/admin/companies` |
| Report handling | No | Create report only | No | Create report only | Create report only | No | Create report only | `/admin/reports` |
| User suspension/restoration | No | No | No | No | No | No | No | `/admin/users`, not own account |
| Audit log | No | No | No | No | No | No | No | `/admin/audit`, read-only |
| Existing session after account suspension | n/a | n/a | n/a | n/a | n/a | Invalid immediately | n/a | n/a |
| Existing other sessions after password change | n/a | Revoked | n/a | Revoked | n/a | n/a | n/a | Revoked |
| Enquiry / review with unverified email | n/a | Rejected server-side | n/a | n/a | n/a | Rejected | n/a | n/a |
| Vacancy publish / verification evidence with unverified email | n/a | n/a | n/a | Rejected server-side | Rejected | Rejected | Rejected | n/a |
| Admin workspace with unverified admin email | n/a | n/a | n/a | n/a | n/a | n/a | n/a | Redirect `/verify-email?required=1` |
| Account token file/API | No | No | No | No | No | No | No | Never exposed |

## Enforcement points

- Route guards: `requireDriverPage`, `requireEmployerPage`, `requireAdminPage` in `src/lib/guards.ts`.
- Session authority: `getCurrentUser` joins `sessions` to `users` and requires an unexpired token,
  `is_active = true` and `suspended_reason IS NULL`.
- Server Actions resolve the session themselves and never trust a client-supplied owner id:
  - driver actions use `driverOnly()` and the session user id;
  - employer actions use `employerContext()` and the company owned by the session user;
  - admin actions call `requireAdmin()`.
- Company suspension is enforced in queries and actions through `isCompanySuspended`
  (`suspended_at` or legacy `verification_status = 'suspended'`).
- Enquiry contact data is read from the enquiry row only; `getEmployerEnquiries` does not select the
  driver's account email.
- Job/company queries filter suspended companies; saved lists also filter inactive vacancy statuses.
- User suspension deletes the account's session rows transactionally.
- Verified-email gates are enforced inside the Server Actions (`sendEnquiryAction`,
  `submitReviewAction`, `saveVacancyAction`, `publishVacancyAction`, `submitVerificationAction`) and
  in `requireAdminPage`/`requireAdmin`, not by hiding controls.
- `user_tokens` is never selected by an admin query, audit payload or page; only hashes exist in the
  database.

## Test evidence

`tests/http/permission-matrix.test.ts` exercises the role matrix, cross-tenant reads and mutations,
direct action invocation, exports, verification evidence and suspended-account access. Related
coverage lives in `tests/http/admin-moderation.test.ts`, `tests/http/privacy.test.ts`,
`tests/http/account-security.test.ts` and `tests/admin-queries.test.ts`.

## Known gaps

- Production email delivery is disabled until a provider is selected; the operator CLI is the
  controlled interim path for the admin and invite-only pilot.
- CV upload does not exist, so there is no CV read/write surface to test.
- Browser-level UI hiding is not part of this matrix; tests assert server responses and database
  outcomes.
- Employer account deletion/transfer remains unimplemented (KI-019).

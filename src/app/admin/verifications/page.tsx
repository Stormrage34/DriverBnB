import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerificationBadge } from "@/components/verification-badge";
import { requireAdminPage } from "@/lib/guards";
import { getPendingVerifications, getRecentVerificationChanges } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { decideVerificationAction } from "@/app/admin/actions";
import { companyTypeLabel, countryName } from "@/lib/constants";
import {
  allowedVerificationOutcomes,
  buildIdentitySnapshot,
  identityChecked,
  readIdentitySnapshot,
  roleCheckLabel,
  roleChecked,
  verificationRecordKind,
} from "@/lib/verification";
import { identityHash } from "@/lib/verification-hash";

export const dynamic = "force-dynamic";

type ChangeRow = {
  field?: unknown;
  label?: unknown;
  previous?: unknown;
  current?: unknown;
  category?: unknown;
};

const OUTCOME_LABELS: Record<string, string> = {
  identity_checked: "Confirm legal identity",
  direct_employer_checked: "Confirm recruitment role",
  verified: "Grant full verified badge",
  needs_information: "Request more information (keeps current stage)",
  rejected: "Reject submission",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "The decision form was incomplete. Nothing was changed.",
  not_found: "That company no longer exists.",
  transition: "That decision is not allowed from the company's current stage.",
  identity_mismatch:
    "The company identity has changed since this evidence was submitted. Request a new submission or reject it; the badge cannot advance.",
  suspended: "This company is suspended. Restore it before recording a verification decision.",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}

function readChanges(metadata: Record<string, unknown>): ChangeRow[] {
  const source = Array.isArray(metadata.identityChanges)
    ? metadata.identityChanges
    : Array.isArray(metadata.operationalChanges)
      ? metadata.operationalChanges
      : [];
  return source.filter((item): item is ChangeRow => Boolean(item) && typeof item === "object");
}

export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminPage();
  const [pending, recentChanges, params] = await Promise.all([
    getPendingVerifications(),
    getRecentVerificationChanges(8),
    searchParams,
  ]);
  const error = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <div>
      <PageHeader
        title="Verification queue"
        description="Check legal identity and recruitment role separately. A decision here changes the public badge and the verification label on every vacancy."
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      {pending.length === 0 ? (
        <Card>
          <CardBody className="py-14 text-center">
            <ShieldCheck size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">Queue is empty</p>
            <p className="mt-1 text-sm text-muted">No verification submissions are waiting.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((row) => {
            const entries = readChanges(
              (row.submission?.submittedData ?? {}) as Record<string, unknown>,
            );
            const submittedData = (row.submission?.submittedData ?? {}) as Record<string, unknown>;
            const submittedIdentity = readIdentitySnapshot(submittedData.identity);
            const currentIdentity = buildIdentitySnapshot(row.company);
            const recordKind = verificationRecordKind(submittedData);
            const hasSnapshot = submittedIdentity !== null;
            const identityMismatch =
              hasSnapshot &&
              identityHash(submittedIdentity!) !== identityHash(currentIdentity);
            const identityBlocked = !hasSnapshot || identityMismatch;
            const allowed = allowedVerificationOutcomes(row.company.verificationStatus);
            const outcomes = identityBlocked
              ? allowed.filter((outcome) => outcome === "needs_information" || outcome === "rejected")
              : allowed;
            const identityDone = identityChecked(row.company.verificationStatus, row.company.verificationVersion);
            const roleDone = roleChecked(row.company.verificationStatus, row.company.verificationVersion);

            return (
              <Card key={row.company.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle>{row.company.legalName}</CardTitle>
                      <VerificationBadge
                        status={row.company.verificationStatus}
                        companyType={row.company.companyType}
                        verificationVersion={row.company.verificationVersion}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {countryName(row.company.country)} · {companyTypeLabel(row.company.companyType)} ·
                      owner {row.owner?.email ?? "unknown"}
                    </p>
                  </div>
                  <Link
                    href={`/companies/${row.company.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-brand underline-offset-4 hover:underline"
                  >
                    Public profile <ExternalLink size={12} />
                  </Link>
                </CardHeader>
                <CardBody className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        identityDone
                          ? "border-success/25 bg-success-soft"
                          : "border-line bg-paper text-muted"
                      }`}
                    >
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider">
                        Check 1 · Legal identity
                      </p>
                      <p className="mt-1 font-medium">
                        {identityDone ? "Confirmed" : "Not yet confirmed"}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        roleDone
                          ? "border-success/25 bg-success-soft"
                          : "border-line bg-paper text-muted"
                      }`}
                    >
                      <p className="text-[0.7rem] font-semibold uppercase tracking-wider">
                        Check 2 · Recruitment role
                      </p>
                      <p className="mt-1 font-medium">
                        {roleDone
                          ? roleCheckLabel(row.company.companyType)
                          : "Not yet confirmed"}
                      </p>
                    </div>
                  </div>

                  {identityBlocked ? (
                    <div className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
                      {!hasSnapshot
                        ? "The latest submission has no identity snapshot. It cannot advance verification; request fresh evidence or reject it."
                        : "Current company identity does not match the identity in the latest submission. Only “request information” or “reject” are available until the employer resubmits."}
                    </div>
                  ) : null}

                  {entries.length > 0 ? (
                    <div className="rounded-xl border border-warning/25 bg-warning-soft p-3">
                      <p className="text-xs font-semibold">Identity / role changes since the last review</p>
                      <ul className="mt-2 space-y-1 text-xs">
                        {entries.map((change, index) => (
                          <li key={`${String(change.field)}-${index}`}>
                            <span className="font-medium">{String(change.label ?? change.field)}:</span>{" "}
                            {formatValue(change.previous)} → {formatValue(change.current)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">Registration no.</dt>
                      <dd className="mt-1 font-mono text-xs">{row.company.registrationNumber ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">Registered address</dt>
                      <dd className="mt-1">{row.company.registeredAddress ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">Business email</dt>
                      <dd className="mt-1">{row.company.businessEmail ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">Own fleet</dt>
                      <dd className="mt-1">{row.company.operatesOwnFleet ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">Recruits directly</dt>
                      <dd className="mt-1">{row.company.recruitsDirectly ? "Yes" : "No"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">Contracting entity</dt>
                      <dd className="mt-1">{row.company.contractingEntity ?? "—"}</dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <dt className="text-[0.7rem] uppercase tracking-wider text-muted">
                        {recordKind === "employer_submission"
                          ? "Employer-submitted evidence"
                          : recordKind === "system_profile_change"
                            ? "System-generated profile-change record"
                            : "Historical verification record (provenance not recorded)"}
                      </dt>
                      {recordKind === "employer_submission" ? (
                        <dd className="mt-1 whitespace-pre-line rounded-xl bg-paper p-3 text-sm text-ink-soft">
                          {row.submission?.evidenceNotes ?? "No evidence notes were submitted."}
                        </dd>
                      ) : (
                        <dd className="mt-1 rounded-xl bg-paper p-3 text-sm text-ink-soft">
                          {recordKind === "system_profile_change"
                            ? "Created automatically when the company profile changed. This is not employer-submitted evidence."
                            : "No provenance is recorded for this record. It is not employer-submitted evidence and cannot advance verification without a fresh submission."}
                        </dd>
                      )}
                      <p className="mt-1 text-[0.7rem] text-muted">
                        Recorded {formatDate(row.submission?.createdAt ?? row.company.updatedAt)} ·
                        moderator-only.
                      </p>
                    </div>
                    {row.submission?.decisionNotes ? (
                      <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="text-[0.7rem] uppercase tracking-wider text-muted">
                          Moderator notes (private)
                        </dt>
                        <dd className="mt-1 whitespace-pre-line rounded-xl border border-warning/25 bg-warning-soft p-3 text-sm text-ink-soft">
                          {row.submission.decisionNotes}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  <div className="rounded-xl bg-paper p-4">
                    <p className="text-xs font-semibold text-ink-soft">Checklist before a decision</p>
                    <ul className="mt-2 grid gap-1 text-xs text-muted sm:grid-cols-2">
                      <li>· Registry extract matches the legal name and number</li>
                      <li>· Address is consistent with the registration</li>
                      <li>· Business email domain matches the company website</li>
                      <li>· Recruitment role is plausible for the fleet size</li>
                    </ul>
                  </div>

                  <form
                    action={decideVerificationAction}
                    className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[14rem_1fr_auto] sm:items-end"
                  >
                    <input type="hidden" name="companyId" value={row.company.id} />
                    <div>
                      <label htmlFor={`outcome-${row.company.id}`} className="mb-1 block text-xs font-medium">
                        Decision (next permitted stage only)
                      </label>
                      <select
                        id={`outcome-${row.company.id}`}
                        name="outcome"
                        required
                        defaultValue={outcomes[0]}
                        className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
                      >
                        {outcomes.map((outcome) => (
                          <option key={outcome} value={outcome}>
                            {OUTCOME_LABELS[outcome] ?? outcome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`notes-${row.company.id}`} className="mb-1 block text-xs font-medium">
                        Reasoning (recorded in the audit log)
                      </label>
                      <textarea
                        id={`notes-${row.company.id}`}
                        name="notes"
                        required
                        minLength={10}
                        maxLength={2000}
                        rows={2}
                        placeholder="What was checked, what matched, what was missing."
                        className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600"
                    >
                      Record decision
                    </button>
                  </form>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {recentChanges.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent identity and operational changes</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            {recentChanges.map((entry) => {
              const metadata = (entry.log.metadata ?? {}) as Record<string, unknown>;
              const changes = readChanges(metadata);
              return (
                <div key={entry.log.id} className="rounded-xl border border-line px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {typeof metadata.companyName === "string"
                        ? metadata.companyName
                        : "Company profile"}
                    </span>
                    <Badge tone={entry.log.action === "company.identity_changed" ? "warning" : "neutral"}>
                      {entry.log.action === "company.identity_changed" ? "Identity changed" : "Operational change"}
                    </Badge>
                    {metadata.reviewFlag === true ? <Badge tone="danger">Review flagged</Badge> : null}
                    <span className="ml-auto text-xs text-muted">{formatDate(entry.log.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {String(metadata.previousStatus ?? "—")} → {String(metadata.nextStatus ?? "—")}
                    {entry.actor?.email ? ` · ${entry.actor.email}` : ""}
                  </p>
                  {changes.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs">
                      {changes.slice(0, 4).map((change, index) => (
                        <li key={`${String(change.field)}-${index}`}>
                          <span className="font-medium">{String(change.label ?? change.field)}:</span>{" "}
                          {formatValue(change.previous)} → {formatValue(change.current)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface p-4 text-xs text-muted">
        <Badge tone="info">Reminder</Badge>
        Legal identity and recruitment role are separate checks. The full badge requires both. A company
        that changes its legal entity or becomes an agency loses the affected check immediately.
      </div>
    </div>
  );
}

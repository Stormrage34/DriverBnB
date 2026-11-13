import Link from "next/link";
import { BadgeCheck, Clock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { VerificationForm } from "@/components/verification-form";
import { VerificationBadge } from "@/components/verification-badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser, getVerificationSubmission } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { identityChecked, roleCheckLabel, roleChecked, allowedVerificationOutcomes, verificationRecordKind } from "@/lib/verification";

export const dynamic = "force-dynamic";

export default async function EmployerVerificationPage() {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) return null;

  const submission = await getVerificationSubmission(company.id);
  const pending = allowedVerificationOutcomes(company.verificationStatus).length > 0;
  const identityDone = identityChecked(company.verificationStatus, company.verificationVersion);
  const roleDone = roleChecked(company.verificationStatus, company.verificationVersion);
  const trusted = company.verificationVersion >= 1;
  const recordKind = submission
    ? verificationRecordKind(submission.submittedData)
    : null;

  return (
    <div>
      <PageHeader
        title="Verification"
        description="Legal identity and direct-employer status are checked separately from vacancy confirmation."
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Current status</CardTitle>
            <VerificationBadge status={company.verificationStatus} companyType={company.companyType} verificationVersion={company.verificationVersion} />
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-ink-soft">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className={`rounded-xl border px-3 py-2 text-xs ${identityDone ? "border-success/25 bg-success-soft" : "border-line bg-paper text-muted"}`}>
                <p className="font-semibold uppercase tracking-wider">Identity check</p>
                <p className="mt-1">{identityDone ? "Confirmed" : "Not yet confirmed"}</p>
              </div>
              <div className={`rounded-xl border px-3 py-2 text-xs ${roleDone ? "border-success/25 bg-success-soft" : "border-line bg-paper text-muted"}`}>
                <p className="font-semibold uppercase tracking-wider">Recruitment role</p>
                <p className="mt-1">{roleDone ? roleCheckLabel(company.companyType) : "Not yet confirmed"}</p>
              </div>
            </div>
            {company.verificationStatus === "verified" && trusted ? (
              <>
                <p className="flex items-start gap-2">
                  <BadgeCheck size={16} className="mt-0.5 shrink-0 text-success" />
                  Legal identity and {roleCheckLabel(company.companyType).toLowerCase()} were checked on{" "}
                  {formatDate(company.verifiedAt)}.
                </p>
                <p className="text-xs leading-relaxed text-muted">
                  You can submit updated evidence below without losing completed checks. Changing an
                  identity or classification field resets the affected check. Periodic checks may also
                  review the badge.
                </p>
                <Link href="/how-verification-works" className="text-xs font-medium text-brand underline-offset-4 hover:underline">
                  What the badge means →
                </Link>
              </>
            ) : pending ? (
              <>
                <p className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 shrink-0 text-warning" />
                  Your submission is in the moderation queue. Decisions are usually recorded within 5 working
                  days.
                </p>
                <p className="text-xs text-muted">
                  Submitted {formatDate(submission?.createdAt ?? company.updatedAt)}. A moderator may contact{" "}
                  {company.businessEmail ?? "your business email"} for the registration extract.
                </p>
                <p className="text-xs leading-relaxed text-muted">
                  You can continue publishing vacancies while the review is pending. They are labelled
                  “employer not verified” until the badge is granted. You can submit updated evidence below.
                </p>
              </>
            ) : company.verificationStatus === "verified" ? (
              <>
                <p className="flex items-start gap-2">
                  <Clock size={16} className="mt-0.5 shrink-0 text-warning" />
                  This company has a legacy verified status without a trusted identity snapshot.
                </p>
                <p className="text-xs leading-relaxed text-muted">
                  It is not shown as verified publicly and cannot publish as a verified employer. Submit
                  fresh evidence below; a moderator must review it before the badge can return.
                </p>
              </>
            ) : (
              <>
                <p className="flex items-start gap-2">
                  <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
                  Submit your registration details for a moderator to check. Verification is free and is
                  never influenced by your subscription plan.
                </p>
                <p className="text-xs text-muted">
                  You can publish vacancies before verification — they carry a clear label until checks are
                  complete.
                </p>
              </>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What we check</CardTitle>
          </CardHeader>
          <CardBody className="space-y-2 text-xs leading-relaxed text-ink-soft">
            <p>1. Legal name and registration number against the registry extract.</p>
            <p>2. Registered address consistency.</p>
            <p>3. Whether you operate your own fleet.</p>
            <p>4. Whether you recruit directly or act for another employer.</p>
            <p>5. The contracting legal entity shown on vacancies.</p>
            <p className="pt-1 text-muted">
              We do not check salary levels or management quality — that is what driver reviews are for.
            </p>
          </CardBody>
        </Card>
      </div>

      {submission && recordKind ? (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>
              {recordKind === "employer_submission"
                ? "Latest employer-submitted evidence"
                : recordKind === "system_profile_change"
                  ? "Profile-change record (system-generated)"
                  : "Historical verification record (provenance not recorded)"}
            </CardTitle>
          </CardHeader>
          <CardBody className="grid gap-4 text-sm sm:grid-cols-2">
            {recordKind === "employer_submission" ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Registration number</p>
                  <p className="mt-1 font-mono text-xs">{company.registrationNumber ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Contracting entity</p>
                  <p className="mt-1">{company.contractingEntity ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Recruits directly</p>
                  <p className="mt-1">{company.recruitsDirectly ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Own fleet</p>
                  <p className="mt-1">{company.operatesOwnFleet ? "Yes" : "No"}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase tracking-wider text-muted">Evidence notes</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">
                    {submission.evidenceNotes ?? "—"}
                  </p>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 rounded-xl bg-paper p-3 text-xs leading-relaxed text-ink-soft">
                {recordKind === "system_profile_change"
                  ? "This record was created automatically when the company profile changed. It is not employer-submitted evidence."
                  : "This record predates evidence provenance tracking. It is not treated as employer-submitted evidence and cannot advance verification without a fresh submission."}
              </div>
            )}
            <p className="sm:col-span-2 text-xs text-muted">
              Recorded {formatDate(submission.createdAt)}. Updating the form creates a new evidence
              record; completed checks are preserved unless identity or classification changes.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <VerificationForm company={company} />
    </div>
  );
}

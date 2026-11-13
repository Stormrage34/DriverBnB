import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireEmployerPage } from "@/lib/guards";
import { getCompanyForUser } from "@/lib/queries";
import { isCompanySuspended } from "@/lib/company-suspension";

export const dynamic = "force-dynamic";

export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireEmployerPage();
  const company = await getCompanyForUser(user.id);
  if (!company) redirect("/register?role=employer");
  const suspended = isCompanySuspended(company);

  return (
    <DashboardShell role="employer" userName={user.displayName} userEmail={user.email}>
      {!user.emailVerifiedAt ? (
        <div className="mb-4 rounded-2xl border border-warning/25 bg-warning-soft px-5 py-4 text-sm">
          <p className="font-semibold text-warning">
            Confirm your email before publishing vacancies or submitting verification evidence.
          </p>
          <p className="mt-1 text-ink-soft">
            Check your registered inbox for a confirmation link. If none arrives, request a new link or
            contact the pilot team.{" "}
            <Link href="/verify-email" className="font-medium underline underline-offset-4">
              Resend the confirmation link
            </Link>
            .
          </p>
        </div>
      ) : null}
      {suspended ? (
        <div className="mb-4 rounded-2xl border border-danger/25 bg-danger-soft px-5 py-4 text-sm">
          <p className="font-semibold text-danger">This company is suspended.</p>
          <p className="mt-1 text-ink-soft">
            Public company and vacancy pages are unavailable, and publishing, editing,
            reconfirmation and verification submissions are disabled. Recorded reason:{" "}
            {company.suspensionReason ?? "contact support for details"}.
          </p>
        </div>
      ) : null}
      {children}
    </DashboardShell>
  );
}

import Link from "next/link";
import { requireDriverPage } from "@/lib/guards";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await requireDriverPage();
  return (
    <DashboardShell role="driver" userName={user.displayName} userEmail={user.email}>
      {!user.emailVerifiedAt ? (
        <div className="mb-4 rounded-2xl border border-warning/25 bg-warning-soft px-5 py-4 text-sm">
          <p className="font-semibold text-warning">Confirm your email to unlock enquiries and reviews.</p>
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
      {children}
    </DashboardShell>
  );
}

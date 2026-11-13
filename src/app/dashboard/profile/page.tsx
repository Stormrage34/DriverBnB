import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { DriverProfileForm } from "@/components/driver-profile-form";
import { requireDriverPage } from "@/lib/guards";
import { getDriverProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DriverProfilePage() {
  const user = await requireDriverPage();
  const profile = await getDriverProfile(user.id);

  return (
    <div>
      <PageHeader
        title="My driver profile"
        description="Private by default. It makes your enquiries credible without exposing you to browsing employers."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand">
            <Lock size={16} />
          </span>
          <div>
            <p className="text-sm font-medium">Only you can see this profile</p>
            <p className="text-xs text-muted">
              Employers receive your message and the contact details you explicitly share — nothing else.
            </p>
          </div>
        </div>
        <Link href="/dashboard/settings" className="text-xs font-medium text-brand underline-offset-4 hover:underline">
          <ShieldCheck className="mr-1 inline" size={13} /> Privacy settings
        </Link>
      </div>

      <DriverProfileForm profile={profile} />
    </div>
  );
}

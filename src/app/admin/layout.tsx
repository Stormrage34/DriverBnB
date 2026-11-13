import { DashboardShell } from "@/components/dashboard-shell";
import { requireAdminPage } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  return (
    <DashboardShell role="admin" userName={user.displayName} userEmail={user.email}>
      {children}
    </DashboardShell>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath, HOME_BY_ROLE } from "@/lib/guards";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string; verified?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(HOME_BY_ROLE[user.role]);

  const { next, reset, verified } = await searchParams;
  const safeNext = safeNextPath(next);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to manage your profile, saved employers and enquiries.
      </p>
      {reset ? (
        <p className="mt-4 rounded-xl border border-success/20 bg-success-soft p-4 text-sm text-success">
          Your password was changed and every active session was signed out. Sign in with the new
          password.
        </p>
      ) : null}
      {verified ? (
        <p className="mt-4 rounded-xl border border-success/20 bg-success-soft p-4 text-sm text-success">
          Email confirmed. Sign in to continue.
        </p>
      ) : null}
      <div className="mt-6">
        <LoginForm next={safeNext ?? undefined} />
      </div>
      <div className="mt-8 rounded-xl border border-line bg-paper p-4 text-xs leading-relaxed text-muted">
        <p className="font-medium text-ink-soft">Employers</p>
        <p className="mt-1">
          Use the work email you registered with. Verification decisions and review responses are in your
          employer dashboard.
        </p>
      </div>
    </div>
  );
}

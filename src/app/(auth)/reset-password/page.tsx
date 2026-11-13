import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/email-verification-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
      {token ? (
        <>
          <p className="mt-2 text-sm text-muted">
            This link can be used once. Setting a new password signs out every active session.
          </p>
          <div className="mt-6">
            <ResetPasswordForm token={token} />
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-xl border border-danger/20 bg-danger-soft p-4 text-sm text-ink-soft">
          This reset link is incomplete or has expired.{" "}
          <Link href="/forgot-password" className="font-medium text-brand underline underline-offset-4">
            Request a new one
          </Link>
          .
        </p>
      )}
    </div>
  );
}

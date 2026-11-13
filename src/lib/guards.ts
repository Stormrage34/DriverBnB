import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

const HOME_BY_ROLE: Record<SessionUser["role"], string> = {
  driver: "/dashboard",
  employer: "/employer",
  admin: "/admin",
};

export async function requireDriverPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "driver") redirect(HOME_BY_ROLE[user.role]);
  return user;
}

export async function requireEmployerPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/employer");
  if (user.role !== "employer") redirect(HOME_BY_ROLE[user.role]);
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect(HOME_BY_ROLE[user.role]);
  if (!user.emailVerifiedAt) redirect("/verify-email?required=1");
  return user;
}

export function safeNextPath(value: FormDataEntryValue | string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || value.includes("\n")) return null;
  return value;
}

export { HOME_BY_ROLE };

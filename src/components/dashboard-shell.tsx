"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Bookmark,
  Building2,
  ClipboardList,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Truck,
  UserRound,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/app/(auth)/actions";
import { cn, initials } from "@/lib/utils";

const NAV: Record<string, Array<{ href: string; label: string; icon: typeof LayoutDashboard }>> = {
  driver: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/profile", label: "My profile", icon: UserRound },
    { href: "/dashboard/saved", label: "Saved", icon: Bookmark },
    { href: "/dashboard/applications", label: "My applications", icon: Send },
    { href: "/dashboard/reviews", label: "My reviews", icon: Star },
    { href: "/dashboard/settings", label: "Privacy & account", icon: Settings },
  ],
  employer: [
    { href: "/employer", label: "Overview", icon: LayoutDashboard },
    { href: "/employer/company", label: "Company profile", icon: Building2 },
    { href: "/employer/vacancies", label: "Vacancies", icon: Truck },
    { href: "/employer/enquiries", label: "Enquiries", icon: ClipboardList },
    { href: "/employer/reviews", label: "Reviews", icon: Star },
    { href: "/employer/verification", label: "Verification", icon: ShieldCheck },
    { href: "/employer/billing", label: "Plan & billing", icon: FileText },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/verifications", label: "Verifications", icon: BadgeCheck },
    { href: "/admin/companies", label: "Companies", icon: Building2 },
    { href: "/admin/vacancies", label: "Vacancies", icon: Truck },
    { href: "/admin/reviews", label: "Reviews", icon: Star },
    { href: "/admin/reports", label: "Reports", icon: Flag },
    { href: "/admin/users", label: "Users", icon: UserRound },
    { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  ],
};

export function DashboardShell({
  role,
  userName,
  userEmail,
  children,
}: {
  role: "driver" | "employer" | "admin";
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV[role];

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/employer" || href === "/admin") return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <span className="hidden rounded-full bg-paper px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted sm:inline">
              {role} workspace
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/jobs" className="hidden text-sm text-ink-soft hover:text-ink sm:block">
              Public site
            </Link>
            <div className="hidden items-center gap-2 border-l border-line pl-3 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-solid text-xs font-semibold text-white">
                {initials(userName)}
              </span>
              <div className="leading-tight">
                <p className="text-xs font-medium">{userName}</p>
                <p className="text-[0.65rem] text-muted">{userEmail}</p>
              </div>
            </div>
            <ThemeToggle />
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs text-muted hover:bg-ink/[0.05] hover:text-ink"
              >
                <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1" aria-label="Workspace">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                  isActive(item.href)
                    ? "bg-brand-solid text-white"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
                )}
              >
                <item.icon size={16} strokeWidth={1.8} />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <nav className="mb-4 flex gap-1 overflow-x-auto pb-1 lg:hidden" aria-label="Workspace mobile">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs",
                  isActive(item.href) ? "bg-brand-solid text-white" : "border border-line bg-surface text-ink-soft",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

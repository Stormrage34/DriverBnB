import Link from "next/link";
import { LogOut, Menu, UserRound } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/actions";

const NAV = [
  { href: "/jobs", label: "Find work" },
  { href: "/companies", label: "Employers" },
  { href: "/how-verification-works", label: "How verification works" },
  { href: "/for-employers", label: "For employers" },
];

const HOME_BY_ROLE = { driver: "/dashboard", employer: "/employer", admin: "/admin" } as const;

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-ink">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {user ? (
            <>
              <ButtonLink href={HOME_BY_ROLE[user.role]} variant="secondary" size="sm">
                <UserRound size={15} />
                {user.displayName.split(" ")[0]}
              </ButtonLink>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-muted transition hover:bg-ink/[0.04] hover:text-ink"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/register" variant="accent" size="sm">
                Create account
              </ButtonLink>
            </>
          )}
        </div>

        <details className="group relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-line bg-surface text-ink [&::-webkit-details-marker]:hidden">
            <Menu size={18} />
            <span className="sr-only">Open menu</span>
          </summary>
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 shadow-xl">
            <nav className="flex flex-col" aria-label="Mobile">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-paper">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-2 flex items-center justify-between border-t border-line px-3 pt-3">
              <span className="text-xs text-muted">Theme</span>
              <ThemeToggle />
            </div>
            <div className="mt-2 border-t border-line pt-3">
              {user ? (
                <>
                  <Link
                    href={HOME_BY_ROLE[user.role]}
                    className="block rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-paper"
                  >
                    My dashboard
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-muted hover:bg-paper">
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <div className="grid gap-2">
                  <ButtonLink href="/login" variant="secondary" size="sm">
                    Log in
                  </ButtonLink>
                  <ButtonLink href="/register" variant="accent" size="sm">
                    Create account
                  </ButtonLink>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}

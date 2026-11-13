import { UserRound } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { requireAdminPage } from "@/lib/guards";
import {
  ADMIN_USER_STATES,
  adminEnumFilter,
  adminPage,
  listAdminUsers,
  ADMIN_PAGE_SIZE,
} from "@/lib/admin-queries";
import { setUserActiveAction } from "@/app/admin/actions";
import { users } from "@/db/schema";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; state?: string; q?: string; page?: string }>;
}) {
  const admin = await requireAdminPage();
  const params = await searchParams;
  const role = adminEnumFilter(params.role, users.role.enumValues, "all");
  const state = adminEnumFilter(params.state, ADMIN_USER_STATES, "all");
  const q = params.q?.trim() ?? "";
  const page = adminPage(params.page);
  const result = await listAdminUsers({ role, state, q, page });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Suspend or restore an account. Suspension blocks every protected route immediately and deletes the account's issued sessions. Authentication secrets are never included in this list."
      />

      <Card className="mb-4">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div className="min-w-[14rem] flex-1">
              <label htmlFor="user-search" className="mb-1 block text-xs font-medium">
                Search email or display name
              </label>
              <input
                id="user-search"
                name="q"
                defaultValue={q}
                className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="user-role" className="mb-1 block text-xs font-medium">
                Role
              </label>
              <select
                id="user-role"
                name="role"
                defaultValue={role}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="all">All roles</option>
                {users.role.enumValues.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="user-state" className="mb-1 block text-xs font-medium">
                State
              </label>
              <select
                id="user-state"
                name="state"
                defaultValue={state}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="all">All states</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full bg-brand-solid px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              Filter
            </button>
          </form>
        </CardBody>
      </Card>

      {result.rows.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <UserRound size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">No users match</p>
            <p className="mt-1 text-sm text-muted">Try a different search, role or state.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {result.rows.map((account) => {
            const suspended = !account.isActive || account.suspendedReason !== null;
            const isSelf = account.id === admin.id;

            return (
              <Card key={account.id}>
                <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{account.displayName}</CardTitle>
                      <Badge tone="neutral">{account.role}</Badge>
                      <Badge tone={suspended ? "danger" : "success"}>
                        {suspended ? "Suspended" : "Active"}
                      </Badge>
                      {isSelf ? <Badge tone="info">You</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {account.email} · joined {formatDate(account.createdAt)} · last login{" "}
                      {account.lastLoginAt ? formatDate(account.lastLoginAt) : "never"}
                    </p>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3">
                  {account.suspendedReason ? (
                    <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-xs text-ink-soft">
                      Suspension reason: {account.suspendedReason}
                    </p>
                  ) : null}

                  {isSelf ? (
                    <p className="rounded-xl border border-line bg-paper p-3 text-xs text-muted">
                      You cannot suspend your own account.
                    </p>
                  ) : (
                    <form
                      action={setUserActiveAction}
                      className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-[1fr_auto] sm:items-end"
                    >
                      <input type="hidden" name="userId" value={account.id} />
                      <input
                        type="hidden"
                        name="outcome"
                        value={suspended ? "restore" : "suspend"}
                      />
                      <div>
                        <label
                          htmlFor={`user-reason-${account.id}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          {suspended ? "Restoration reason" : "Suspension reason"} (recorded in the
                          audit log)
                        </label>
                        <input
                          id={`user-reason-${account.id}`}
                          name="reason"
                          maxLength={500}
                          placeholder={
                            suspended
                              ? "What was reviewed and why access may return."
                              : "What policy was breached and what evidence was seen."
                          }
                          className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium text-white ${
                          suspended ? "bg-brand-solid hover:bg-brand-600" : "bg-danger-solid hover:brightness-95"
                        }`}
                      >
                        {suspended ? "Restore account" : "Suspend account"}
                      </button>
                    </form>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <Pagination
        page={result.page}
        perPage={ADMIN_PAGE_SIZE}
        total={result.total}
        basePath="/admin/users"
        searchParams={params}
      />
    </div>
  );
}

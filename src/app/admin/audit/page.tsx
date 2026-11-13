import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";
import { requireAdminPage } from "@/lib/guards";
import {
  ADMIN_AUDIT_ENTITIES,
  ADMIN_PAGE_SIZE,
  adminEnumFilter,
  adminPage,
  listAdminAuditLogs,
} from "@/lib/admin-queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; page?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const entity = adminEnumFilter(params.entity, ADMIN_AUDIT_ENTITIES, "all");
  const page = adminPage(params.page);
  const result = await listAdminAuditLogs({ entity, page });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Append-only record of moderation and security-relevant actions. This page is read-only; entries cannot be edited or deleted from the application."
      />

      <Card className="mb-4">
        <CardBody>
          <form className="flex flex-wrap items-end gap-3" method="get">
            <div>
              <label htmlFor="audit-entity" className="mb-1 block text-xs font-medium">
                Entity type
              </label>
              <select
                id="audit-entity"
                name="entity"
                defaultValue={entity}
                className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm"
              >
                <option value="all">All entities</option>
                {ADMIN_AUDIT_ENTITIES.map((value) => (
                  <option key={value} value={value}>
                    {value.replaceAll("_", " ")}
                  </option>
                ))}
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
            <ScrollText size={20} className="mx-auto text-muted" />
            <p className="mt-3 text-sm font-semibold">No audit entries match</p>
            <p className="mt-1 text-sm text-muted">Try a different entity filter.</p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="divide-y divide-line p-0">
            {result.rows.map(({ log, actor }) => (
              <div key={log.id} className="px-4 py-3 text-sm sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-medium">{log.action}</span>
                  <Badge tone="neutral">{log.entityType.replaceAll("_", " ")}</Badge>
                  {log.entityId ? (
                    <span className="font-mono text-[0.65rem] text-muted">{log.entityId}</span>
                  ) : null}
                  <span className="ml-auto shrink-0 text-xs text-muted">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  <span className="font-medium text-ink-soft">
                    {actor?.displayName ?? "system"}
                  </span>
                  {actor?.email ? ` · ${actor.email}` : ""} · IP {log.ipAddress ?? "not recorded"}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-brand">Metadata</summary>
                  <pre className="mt-2 overflow-x-auto rounded-xl bg-paper p-3 text-[0.7rem] leading-relaxed text-ink-soft">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      <Pagination
        page={result.page}
        perPage={ADMIN_PAGE_SIZE}
        total={result.total}
        basePath="/admin/audit"
        searchParams={params}
      />
    </div>
  );
}

import { db } from "@/lib/db";
import { auditLogs } from "@/db/schema";
import { requestContext } from "@/lib/auth";

export async function writeAudit(input: {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  let ip = "local";
  try {
    ip = (await requestContext()).ip;
  } catch {
    // Called outside a request scope (seed scripts, tests).
  }
  await db.insert(auditLogs).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    metadata: input.metadata ?? {},
    ipAddress: ip,
  });
}

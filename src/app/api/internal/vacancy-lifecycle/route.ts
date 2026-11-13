import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { processVacancyLifecycle } from "@/lib/vacancy-lifecycle";

export const dynamic = "force-dynamic";

function secretMatches(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Internal lifecycle trigger.
 *
 * There is no scheduler in this repository. A deployment may call this route
 * from its own cron/Job Scheduler once and only if it sets
 * VACANCY_LIFECYCLE_SECRET. Without that variable the route refuses to run.
 * POST only; it is idempotent and safe to retry.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.VACANCY_LIFECYCLE_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "lifecycle_not_configured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!token || !secretMatches(token, secret)) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  }

  const startedAt = Date.now();
  const result = await processVacancyLifecycle();
  console.info(
    JSON.stringify({
      event: "vacancy_lifecycle_run",
      trigger: "internal_route",
      durationMs: Date.now() - startedAt,
      ...result,
    }),
  );
  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}

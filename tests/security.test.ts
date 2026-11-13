import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

/**
 * H1 regression: reads must not be exported from a "use server" module.
 * A Server Action is an addressable endpoint; a read guarded only by an
 * unchecked helper return value is an authorization hole.
 */
describe("audit log access surface", () => {
  it("does not export getRecentAudit from the admin server-action module", () => {
    const actions = read("src/app/admin/actions.ts");
    expect(actions).toContain('"use server"');
    expect(actions).not.toMatch(/export\s+async\s+function\s+getRecentAudit/);
    expect(actions).not.toContain("getRecentAudit");
  });

  it("reads audit logs through the server-only query module", () => {
    const page = read("src/app/admin/page.tsx");
    expect(page).toContain("getAuditLogs");
    expect(page).toContain('from "@/lib/queries"');
    expect(page).not.toContain("getRecentAudit");
  });

  it("keeps the audit query out of any use-server module", () => {
    const queries = read("src/lib/queries.ts");
    expect(queries).toContain("export async function getAuditLogs");
    expect(queries.startsWith('"use server"')).toBe(false);
  });
});

/**
 * H3 regression: moderator-only notes must not prefill the employer's
 * evidence form, where they would be resubmitted as employer evidence.
 */
describe("verification evidence separation", () => {
  it("does not prefill the employer form with moderator notes", () => {
    const form = read("src/components/verification-form.tsx");
    expect(form).not.toContain("company.verificationNotes");
    expect(form).toContain('name="evidenceNotes"');
  });
});

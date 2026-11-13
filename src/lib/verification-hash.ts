import { createHash } from "node:crypto";
import type { IdentityValues } from "@/lib/verification";

/**
 * Server-only identity fingerprint.
 *
 * Kept out of `verification.ts` so shared presentation components can import the
 * status model without pulling `node:crypto` into a client bundle.
 */
export function identityHash(snapshot: IdentityValues): string {
  const ordered = Object.keys(snapshot)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = snapshot[key as keyof IdentityValues];
      return result;
    }, {});
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

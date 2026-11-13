import { createHash } from "node:crypto";

/** SHA-256 hex digest used for session and account tokens at rest. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

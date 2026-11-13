/**
 * Controlled operator verification (no HTTP endpoint, no token, no email).
 *
 * Admin bootstrap:
 *   npm run users:verify-email -- --admin-bootstrap \
 *     --email admin@example.eu --operator "Founder" \
 *     --reason "Verified mailbox control out of band" --confirm-control
 *
 * Invite-only pilot:
 *   npm run users:verify-email -- --pilot \
 *     --email driver@example.eu --operator "Founder" \
 *     --reason "Invite-only pilot, mailbox control confirmed out of band" --confirm-control
 */
import { operatorVerifyUserEmail, type OperatorVerificationMode } from "@/lib/operator-verification";
import { dbClient } from "@/lib/db";

function valueAfter(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

async function main() {
  const adminBootstrap = process.argv.includes("--admin-bootstrap");
  const pilot = process.argv.includes("--pilot");
  const confirmed = process.argv.includes("--confirm-control");

  if (adminBootstrap === pilot) {
    console.error("Choose exactly one mode: --admin-bootstrap or --pilot.");
    process.exit(2);
  }
  if (!confirmed) {
    console.error(
      "Refusing to run: --confirm-control is required. Only use it after independently confirming control of the exact mailbox.",
    );
    process.exit(2);
  }

  const email = valueAfter("--email");
  const operator = valueAfter("--operator");
  const reason = valueAfter("--reason");
  if (!email || !operator || !reason) {
    console.error("Usage: --email <address> --operator <name> --reason <text> --confirm-control");
    process.exit(2);
  }

  const mode: OperatorVerificationMode = adminBootstrap ? "admin_bootstrap" : "pilot";
  const result = await operatorVerifyUserEmail({ email, operator, reason, mode });
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

main()
  .then(async () => {
    await dbClient.end({ timeout: 5 });
  })
  .catch(async (error) => {
    console.error(error);
    await dbClient.end({ timeout: 5 }).catch(() => undefined);
    process.exit(1);
  });

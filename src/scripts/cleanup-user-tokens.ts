/**
 * Bounded cleanup of expired and consumed account tokens.
 * Never deletes a live token. Safe to run repeatedly.
 */
import { cleanupUserTokens } from "@/lib/user-tokens";
import { dbClient } from "@/lib/db";

async function main() {
  const removed = await cleanupUserTokens({ limit: 500 });
  console.log(JSON.stringify({ event: "user_token_cleanup", removed }, null, 2));
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

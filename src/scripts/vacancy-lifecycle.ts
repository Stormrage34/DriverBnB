/**
 * Manual vacancy lifecycle runner.
 *
 * Dry-run by default; pass --apply to mutate. Intended for local development
 * and tests. Production must schedule the POST route documented in README.
 */
import { processVacancyLifecycle } from "@/lib/vacancy-lifecycle";

async function main() {
  const apply = process.argv.includes("--apply");
  const startedAt = Date.now();
  const result = await processVacancyLifecycle({ dryRun: !apply });
  console.log(
    JSON.stringify(
      {
        event: "vacancy_lifecycle_run",
        trigger: "manual_script",
        durationMs: Date.now() - startedAt,
        ...result,
      },
      null,
      2,
    ),
  );
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to persist these transitions.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

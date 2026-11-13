import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres@127.0.0.1:55432/driverfirst_test";
const ADMIN_DATABASE_URL =
  process.env.TEST_DATABASE_ADMIN_URL ?? "postgres://postgres@127.0.0.1:55432/postgres";
const TEST_DATABASE_NAME = "driverfirst_test";

/**
 * Safety guard: tests must never point at the development or production database.
 * The helper creates and migrates a dedicated database only.
 */
function assertTestDatabase(url: string): void {
  if (!url.includes(TEST_DATABASE_NAME)) {
    throw new Error(
      `Refusing to run destructive test setup against a database that is not ${TEST_DATABASE_NAME}.`,
    );
  }
}

export async function ensureTestDatabase(): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);

  const admin = postgres(ADMIN_DATABASE_URL, { max: 1 });
  try {
    const existing = await admin`
      select 1 from pg_database where datname = ${TEST_DATABASE_NAME}
    `;
    if (existing.length === 0) {
      await admin.unsafe(`create database ${TEST_DATABASE_NAME}`);
    }
  } finally {
    await admin.end({ timeout: 5 });
  }

  const client = postgres(TEST_DATABASE_URL, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  } finally {
    await client.end({ timeout: 5 });
  }
}

export async function truncateAll(): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL);
  const client = postgres(TEST_DATABASE_URL, { max: 1 });
  try {
    await client.unsafe(`
      truncate table
        audit_logs,
        content_reports,
        enquiries,
        review_responses,
        driver_reviews,
        vacancy_reconfirmations,
        vacancies,
        company_verifications,
        company_subscriptions,
        companies,
        driver_profiles,
        sessions,
        user_tokens,
        users
      restart identity cascade
    `);
  } finally {
    await client.end({ timeout: 5 });
  }
}

export { TEST_DATABASE_URL };

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:55432/driverfirst";

const globalForDb = globalThis as unknown as {
  __driverCompassClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__driverCompassClient ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__driverCompassClient = client;
}

export const db = drizzle(client, { schema });
export const dbClient = client;
export { schema };

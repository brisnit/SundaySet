import "dotenv/config";
import { defineConfig } from "prisma/config";

import { resolveDirectUrl } from "./src/lib/db-url";

/**
 * CLI-only configuration (migrate / studio / db pull).
 *
 * `datasource.url` here is used by the schema engine, so it must be a DIRECT
 * connection — poolers such as PgBouncer cannot run migrations. The application
 * runtime does not read this file; it builds its own pooled connection in
 * src/lib/db.ts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: resolveDirectUrl(),
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});

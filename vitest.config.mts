import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // The database-backed suites all talk to one local Postgres through a
    // shared Prisma client. Running files in parallel interleaved queries on
    // the same connection and surfaced as Postgres 08P01 ("bind message
    // supplies N parameters, but prepared statement requires 0") roughly one
    // run in three. The whole suite runs in well under a second, so serialising
    // files costs nothing and removes the flake at its source.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

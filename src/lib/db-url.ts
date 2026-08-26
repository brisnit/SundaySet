/**
 * Resolves the Postgres connection strings.
 *
 * Vercel's Neon integration injects its own variable names (NEON_DATABASE_URL,
 * NEON_DATABASE_URL_UNPOOLED, ...) rather than the DATABASE_URL / DIRECT_URL
 * this app is written against, and those values are marked sensitive so they
 * cannot be read back and copied. Rather than duplicate secrets by hand, we
 * accept any of the names a Postgres provider is likely to set.
 *
 * Empty strings count as unset: a variable can exist with no value, and `??`
 * would happily return "".
 *
 * No imports — prisma.config.ts loads this outside the Next.js runtime.
 */
function first(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

/** Pooled connection, used by the running app. */
export function resolvePooledUrl(): string | undefined {
  return first(
    "DATABASE_URL",
    "NEON_DATABASE_URL",
    "POSTGRES_PRISMA_URL",
    "NEON_POSTGRES_PRISMA_URL",
    "POSTGRES_URL",
    "NEON_POSTGRES_URL",
  );
}

/**
 * Direct connection, for migrations — poolers cannot run them.
 * Falls back to the pooled URL, which is correct for a local single-node
 * Postgres where the two are the same.
 */
export function resolveDirectUrl(): string | undefined {
  return (
    first(
      "DIRECT_URL",
      "NEON_DATABASE_URL_UNPOOLED",
      "POSTGRES_URL_NON_POOLING",
      "NEON_POSTGRES_URL_NON_POOLING",
    ) ?? resolvePooledUrl()
  );
}

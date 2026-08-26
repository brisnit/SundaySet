import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { resolvePooledUrl } from "../src/lib/db-url";

/**
 * Seeds a brand new database, and only a brand new one.
 *
 * This runs on every deploy, so it must never touch data that already exists.
 * The seed itself deletes and recreates the Northminster demo church, which
 * would destroy real work if it ran against a live database — so the guard here
 * is "no churches at all", not "no demo church".
 *
 * Once anything exists, this is a no-op and the deploy carries on.
 */
async function main() {
  const url = resolvePooledUrl();
  if (!url) {
    console.log("[bootstrap] No database configured — skipping.");
    return;
  }

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const churches = await db.church.count();
    if (churches > 0) {
      console.log(
        `[bootstrap] Database already has ${churches} church(es) — leaving it alone.`,
      );
      return;
    }
    console.log("[bootstrap] Empty database — seeding demo data.");
  } finally {
    await db.$disconnect();
  }

  // Imported lazily so the seed only connects when it is actually going to run.
  await import("./seed");
}

main().catch((e) => {
  console.error("[bootstrap] failed:", e);
  process.exit(1);
});

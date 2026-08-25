import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { NotFoundError, type ChurchContext } from "@/lib/data/context";
import { getSongById, listSongs, songLibraryStats } from "@/lib/data/songs";
import { getServiceById, listServices } from "@/lib/data/services";
import { getTeamMemberById, listTeamMembers } from "@/lib/data/team";

/**
 * Cross-tenant isolation against real data.
 *
 * Two churches are created with deliberately identical-looking records. Every
 * read from one church's context must be blind to the other's rows — and a
 * direct lookup of a known foreign id must be indistinguishable from the record
 * not existing at all.
 *
 * Skipped (loudly) when no database is reachable; tests/tenant-scoping.test.ts
 * enforces the same invariant structurally in every environment.
 */
const SLUG_A = "vitest-isolation-alpha";
const SLUG_B = "vitest-isolation-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn(
    "\n[tenant-isolation] No database reachable — skipping integration checks." +
      "\n  Start one with: npx prisma dev --name setmeister\n",
  );
}

type Fixture = { ctx: ChurchContext; songId: string; serviceId: string; memberId: string };

async function seedChurch(slug: string, name: string): Promise<Fixture> {
  const church = await db.church.create({
    data: { name, slug, timezone: "America/New_York" },
  });
  const user = await db.user.create({
    data: { email: `${slug}@example.test`, name: `${name} Leader` },
  });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });

  // Same title in both churches: isolation must not depend on data differing.
  const song = await db.song.create({
    data: {
      churchId: church.id,
      title: "Goodness of God",
      artist: "Bethel Music",
      songTypes: ["MID_TEMPO"],
      themes: ["faithfulness"],
    },
  });
  const service = await db.service.create({
    data: { churchId: church.id, date: new Date(Date.UTC(2026, 8, 6)), startTime: "10:00" },
  });
  const member = await db.teamMember.create({
    data: { churchId: church.id, name: "Alex Musician" },
  });

  return {
    ctx: {
      userId: user.id,
      user: { id: user.id, name: user.name, email: user.email, image: null },
      churchId: church.id,
      church: {
        id: church.id,
        name: church.name,
        slug: church.slug,
        timezone: church.timezone,
        logoUrl: null,
      },
      role: "OWNER",
    },
    songId: song.id,
    serviceId: service.id,
    memberId: member.id,
  };
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
}

describe.skipIf(!dbReachable)("cross-tenant isolation", () => {
  let alpha: Fixture;
  let beta: Fixture;

  beforeAll(async () => {
    await purge();
    alpha = await seedChurch(SLUG_A, "Alpha Church");
    beta = await seedChurch(SLUG_B, "Beta Church");
  });

  afterAll(async () => {
    await purge();
    // No $disconnect() here: the Prisma client is a module-level singleton shared
    // with every other test file, and Vitest runs files in parallel. Disconnecting
    // when this file finishes tore the pool out from under the others. The pool
    // closes on process exit.
  });

  it("lists only the caller's own songs", async () => {
    const songs = await listSongs(alpha.ctx);
    expect(songs.map((s) => s.id)).toEqual([alpha.songId]);
    expect(songs.map((s) => s.id)).not.toContain(beta.songId);
  });

  it("treats another church's song id as not found", async () => {
    await expect(getSongById(alpha.ctx, beta.songId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("treats another church's service id as not found", async () => {
    await expect(
      getServiceById(alpha.ctx, beta.serviceId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("treats another church's team member id as not found", async () => {
    await expect(
      getTeamMemberById(alpha.ctx, beta.memberId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("gives the same error for a foreign id and a nonexistent id", async () => {
    const foreign = await getSongById(alpha.ctx, beta.songId).catch((e) => e);
    const missing = await getSongById(alpha.ctx, "does-not-exist").catch((e) => e);
    // Identical failures — a probe cannot distinguish "not yours" from "no such row".
    expect(foreign.name).toBe(missing.name);
    expect(foreign.message).toBe(missing.message);
  });

  it("scopes list queries for services and team members", async () => {
    expect((await listServices(beta.ctx)).map((s) => s.id)).toEqual([
      beta.serviceId,
    ]);
    expect((await listTeamMembers(beta.ctx)).map((m) => m.id)).toEqual([
      beta.memberId,
    ]);
  });

  it("counts only the caller's library", async () => {
    const stats = await songLibraryStats(alpha.ctx);
    expect(stats.total).toBe(1);
  });

  it("sees its own record from its own context", async () => {
    const song = await getSongById(beta.ctx, beta.songId);
    expect(song.id).toBe(beta.songId);
  });
});

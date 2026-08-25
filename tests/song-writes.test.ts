import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { NotFoundError, type ChurchContext } from "@/lib/data/context";
import {
  addSongFromCatalog,
  createSong,
  deleteSong,
  getSongById,
  listSongs,
  setSongStatus,
  updateSong,
  upsertSongChart,
} from "@/lib/data/songs";
import type { SongInput } from "@/lib/validation/song";

const SLUG_A = "vitest-writes-alpha";
const SLUG_B = "vitest-writes-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[song-writes] No database reachable — skipping.\n");
}

const input = (over: Partial<SongInput> = {}): SongInput => ({
  title: "Test Song",
  artist: "Test Artist",
  ccliNumber: undefined,
  defaultKey: "G",
  churchKey: undefined,
  alternateKeys: [],
  bpm: 72,
  tempoCategory: "MEDIUM",
  songTypes: ["MID_TEMPO"],
  themes: ["hope"],
  difficulty: "MODERATE",
  familiarity: "NEW",
  status: "ACTIVE",
  leadVocalistPreference: undefined,
  lyrics: undefined,
  notes: undefined,
  spotifyUrl: undefined,
  appleMusicUrl: undefined,
  youtubeUrl: undefined,
  ...over,
});

async function makeChurch(slug: string): Promise<ChurchContext> {
  const church = await db.church.create({ data: { name: slug, slug } });
  const user = await db.user.create({ data: { email: `${slug}@example.test` } });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });
  return {
    userId: user.id,
    user: { id: user.id, name: null, email: user.email, image: null },
    churchId: church.id,
    church: {
      id: church.id, name: church.name, slug: church.slug,
      timezone: church.timezone, logoUrl: null,
    },
    role: "OWNER",
  };
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
  await db.catalogSong.deleteMany({ where: { source: "vitest" } });
}

describe.skipIf(!dbReachable)("song writes", () => {
  let alpha: ChurchContext;
  let beta: ChurchContext;

  beforeAll(async () => {
    await purge();
    alpha = await makeChurch(SLUG_A);
    beta = await makeChurch(SLUG_B);
  });
  afterAll(async () => {
    await purge();
    // No $disconnect() here: the Prisma client is a module-level singleton shared
    // with every other test file, and Vitest runs files in parallel. Disconnecting
    // when this file finishes tore the pool out from under the others. The pool
    // closes on process exit.
  });

  it("creates a song scoped to the caller's church", async () => {
    const song = await createSong(alpha, input({ title: "Created Song" }));
    expect(song.churchId).toBe(alpha.churchId);
    expect((await listSongs(beta)).map((s) => s.title)).not.toContain("Created Song");
  });

  it("defaults the church key to the original key", async () => {
    const song = await createSong(alpha, input({ title: "Key Default", defaultKey: "A" }));
    expect(song.churchKey).toBe("A");
  });

  it("updates a song the church owns", async () => {
    const song = await createSong(alpha, input({ title: "To Update" }));
    await updateSong(alpha, song.id, input({ title: "Updated", themes: ["grace"] }));
    const after = await getSongById(alpha, song.id);
    expect(after.title).toBe("Updated");
    expect(after.themes).toEqual(["grace"]);
  });

  it("REFUSES to update another church's song", async () => {
    const song = await createSong(alpha, input({ title: "Alpha Only" }));
    await expect(
      updateSong(beta, song.id, input({ title: "Hijacked" })),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await getSongById(alpha, song.id)).title).toBe("Alpha Only");
  });

  it("REFUSES to delete another church's song", async () => {
    const song = await createSong(alpha, input({ title: "Do Not Delete" }));
    await expect(deleteSong(beta, song.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getSongById(alpha, song.id)).id).toBe(song.id);
  });

  it("REFUSES to write a chart onto another church's song", async () => {
    const song = await createSong(alpha, input({ title: "Chart Guard" }));
    await expect(
      upsertSongChart(beta, song.id, { key: "G", capo: undefined, sections: [] }),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await db.songChart.findUnique({ where: { songId: song.id } })).toBeNull();
  });

  it("retiring also marks the song retired for the AI", async () => {
    const song = await createSong(alpha, input({ title: "Retire Me", familiarity: "CORE" }));
    await setSongStatus(alpha, song.id, "RETIRED");
    const after = await getSongById(alpha, song.id);
    expect(after.status).toBe("RETIRED");
    expect(after.familiarity).toBe("RETIRED");
  });

  it("saves and replaces a structured chart", async () => {
    const song = await createSong(alpha, input({ title: "Charted" }));
    await upsertSongChart(alpha, song.id, {
      key: "G", capo: 2,
      sections: [{ label: "Verse 1", type: "VERSE", lines: [{ chords: "G  C", lyrics: "hello" }] }],
    });
    let chart = await db.songChart.findUnique({ where: { songId: song.id } });
    expect(chart?.capo).toBe(2);

    // Upsert must replace, not accumulate.
    await upsertSongChart(alpha, song.id, {
      key: "A", capo: undefined,
      sections: [{ label: "Chorus", type: "CHORUS", lines: [] }],
    });
    chart = await db.songChart.findUnique({ where: { songId: song.id } });
    expect(chart?.key).toBe("A");
    expect(JSON.stringify(chart?.sections)).toContain("Chorus");
    expect(JSON.stringify(chart?.sections)).not.toContain("Verse 1");
  });

  it("adding the same catalog song twice is idempotent", async () => {
    const catalog = await db.catalogSong.create({
      data: { title: "Catalog Pick", artist: "Someone", source: "vitest", themes: [], songTypes: [] },
    });
    const first = await addSongFromCatalog(alpha, catalog.id);
    const second = await addSongFromCatalog(alpha, catalog.id);
    expect(second.id).toBe(first.id);
    const matches = (await listSongs(alpha)).filter((s) => s.title === "Catalog Pick");
    expect(matches).toHaveLength(1);
  });

  it("two churches can each add the same catalog song independently", async () => {
    const catalog = await db.catalogSong.create({
      data: { title: "Shared Pick", artist: "Someone", source: "vitest", themes: [], songTypes: [] },
    });
    const a = await addSongFromCatalog(alpha, catalog.id);
    const b = await addSongFromCatalog(beta, catalog.id);
    expect(a.id).not.toBe(b.id);
    expect(a.churchId).toBe(alpha.churchId);
    expect(b.churchId).toBe(beta.churchId);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { type ChurchContext } from "@/lib/data/context";
import { createSong, listSongs, updateSong } from "@/lib/data/songs";
import { GENRES, GENRE_VALUES, genreLabel, genreLabels } from "@/lib/genres";
import { songInputSchema, type SongInput } from "@/lib/validation/song";

const SLUG_A = "vitest-genre-alpha";
const SLUG_B = "vitest-genre-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[genres] No database reachable — skipping.\n");
}

const input = (over: Partial<SongInput> = {}): SongInput => ({
  title: "Genre Song",
  artist: "Tester",
  ccliNumber: undefined,
  defaultKey: "G",
  churchKey: undefined,
  alternateKeys: [],
  bpm: 72,
  tempoCategory: "MEDIUM",
  songTypes: [],
  genres: [],
  themes: [],
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
}

// ---------------------------------------------------------------------------
// Validation — no database needed
// ---------------------------------------------------------------------------

describe("genre validation", () => {
  const form = (genres: unknown) => ({
    title: "X", songTypes: [], genres, themes: "", alternateKeys: "",
  });

  it("accepts several genres at once", () => {
    const r = songInputSchema.safeParse(form(["WORSHIP", "GOSPEL"]));
    expect(r.success && r.data.genres).toEqual(["WORSHIP", "GOSPEL"]);
  });

  it("defaults to an empty list — genres are optional", () => {
    const r = songInputSchema.safeParse({
      title: "X", songTypes: [], themes: "", alternateKeys: "",
    });
    expect(r.success && r.data.genres).toEqual([]);
  });

  it("accepts an explicitly empty list", () => {
    const r = songInputSchema.safeParse(form([]));
    expect(r.success && r.data.genres).toEqual([]);
  });

  it.each([
    ["JAZZ_FUSION", "not in the enum"],
    ["worship", "wrong case"],
    ["", "empty string"],
    ["<script>", "junk"],
  ])("rejects invalid genre %s (%s)", (bad) => {
    expect(songInputSchema.safeParse(form([bad])).success).toBe(false);
  });

  it("rejects a valid genre mixed with an invalid one", () => {
    expect(songInputSchema.safeParse(form(["WORSHIP", "NOPE"])).success).toBe(false);
  });
});

describe("genre labels", () => {
  it("renders names that titleCase could not", () => {
    expect(genreLabel("RNB")).toBe("R&B");
    expect(genreLabel("HIP_HOP")).toBe("Hip-Hop");
  });

  it("labels every enum value", () => {
    for (const g of GENRE_VALUES) {
      expect(genreLabel(g).length).toBeGreaterThan(0);
      expect(genreLabel(g)).not.toContain("_");
    }
  });

  it("returns labels in the canonical order, not storage order", () => {
    expect(genreLabels(["ROCK", "WORSHIP"])).toEqual(["Worship", "Rock"]);
  });

  it("has no duplicate values", () => {
    expect(new Set(GENRE_VALUES).size).toBe(GENRES.length);
  });
});

// ---------------------------------------------------------------------------
// Writes and filtering
// ---------------------------------------------------------------------------

describe.skipIf(!dbReachable)("song genres", () => {
  let alpha: ChurchContext;
  let beta: ChurchContext;

  beforeAll(async () => {
    await purge();
    alpha = await makeChurch(SLUG_A);
    beta = await makeChurch(SLUG_B);
  });
  afterAll(async () => {
    await purge();
  });

  const titles = (rows: Awaited<ReturnType<typeof listSongs>>) =>
    rows.map((r) => r.title);

  it("creates a song with multiple genres", async () => {
    const song = await createSong(
      alpha,
      input({ title: "Multi", genres: ["WORSHIP", "ROCK"] }),
    );
    expect(song.genres).toEqual(["WORSHIP", "ROCK"]);
  });

  it("creates a song with no genres at all", async () => {
    const song = await createSong(alpha, input({ title: "Bare" }));
    expect(song.genres).toEqual([]);
  });

  it("adds a genre on update without losing the existing ones", async () => {
    const song = await createSong(
      alpha, input({ title: "Adding", genres: ["WORSHIP"] }),
    );
    await updateSong(alpha, song.id, input({ title: "Adding", genres: ["WORSHIP", "SOUL"] }));
    const after = await db.song.findFirstOrThrow({ where: { id: song.id } });
    expect(after.genres).toEqual(["WORSHIP", "SOUL"]);
  });

  it("removes a genre on update", async () => {
    const song = await createSong(
      alpha, input({ title: "Removing", genres: ["WORSHIP", "POP", "ROCK"] }),
    );
    await updateSong(alpha, song.id, input({ title: "Removing", genres: ["ROCK"] }));
    const after = await db.song.findFirstOrThrow({ where: { id: song.id } });
    expect(after.genres).toEqual(["ROCK"]);
  });

  it("clears every genre on update", async () => {
    const song = await createSong(
      alpha, input({ title: "Clearing", genres: ["JAZZ"] }),
    );
    await updateSong(alpha, song.id, input({ title: "Clearing", genres: [] }));
    const after = await db.song.findFirstOrThrow({ where: { id: song.id } });
    expect(after.genres).toEqual([]);
  });

  it("leaves other song fields untouched when genres change", async () => {
    const song = await createSong(
      alpha,
      input({ title: "Untouched", genres: ["POP"], themes: ["hope"], songTypes: ["UPBEAT"] }),
    );
    await updateSong(
      alpha, song.id,
      input({ title: "Untouched", genres: ["POP", "ROCK"], themes: ["hope"], songTypes: ["UPBEAT"] }),
    );
    const after = await db.song.findFirstOrThrow({ where: { id: song.id } });
    expect(after.themes).toEqual(["hope"]);
    expect(after.songTypes).toEqual(["UPBEAT"]);
  });

  describe("filtering", () => {
    beforeAll(async () => {
      await createSong(alpha, input({ title: "Filter Rock", artist: "A", genres: ["ROCK"] }));
      await createSong(alpha, input({ title: "Filter Worship Rock", artist: "B", genres: ["WORSHIP", "ROCK"] }));
      await createSong(alpha, input({ title: "Filter Jazz", artist: "C", genres: ["JAZZ"] }));
      await createSong(alpha, input({ title: "Filter None", artist: "D", genres: [] }));
    });

    it("matches a song carrying the genre among several", async () => {
      const rows = await listSongs(alpha, { genres: ["ROCK"] });
      const found = titles(rows);
      expect(found).toContain("Filter Rock");
      expect(found).toContain("Filter Worship Rock");
      expect(found).not.toContain("Filter Jazz");
      expect(found).not.toContain("Filter None");
    });

    it("returns nothing for a genre no song has", async () => {
      expect(await listSongs(alpha, { genres: ["CLASSICAL"] })).toEqual([]);
    });

    it("combines genre with text search, narrowing rather than widening", async () => {
      const rows = await listSongs(alpha, { genres: ["ROCK"], search: "Worship" });
      expect(titles(rows)).toEqual(["Filter Worship Rock"]);
    });

    it("combines genre with a song type filter", async () => {
      // BLUES is used by no other fixture, so this asserts the AND precisely
      // without depending on what other tests happened to create.
      await createSong(alpha, input({
        title: "Blues Upbeat", artist: "E",
        genres: ["BLUES"], songTypes: ["UPBEAT"],
      }));
      await createSong(alpha, input({
        title: "Blues Reflective", artist: "F",
        genres: ["BLUES"], songTypes: ["REFLECTIVE"],
      }));

      const rows = await listSongs(alpha, { genres: ["BLUES"], songTypes: ["UPBEAT"] });
      expect(titles(rows)).toEqual(["Blues Upbeat"]);
    });

    it("ignores the genre filter when none is given", async () => {
      const all = await listSongs(alpha, {});
      expect(all.length).toBeGreaterThan(4);
    });

    it("exposes genres on every listed song", async () => {
      const rows = await listSongs(alpha, { search: "Filter Worship Rock" });
      expect(rows[0].genres).toEqual(["WORSHIP", "ROCK"]);
    });
  });

  describe("tenant isolation is unchanged", () => {
    it("does not return another church's songs when filtering by genre", async () => {
      await createSong(beta, input({ title: "Beta Rock", genres: ["ROCK"] }));
      const mine = await listSongs(alpha, { genres: ["ROCK"] });
      expect(titles(mine)).not.toContain("Beta Rock");

      const theirs = await listSongs(beta, { genres: ["ROCK"] });
      expect(titles(theirs)).toEqual(["Beta Rock"]);
    });
  });

  describe("songs that predate the migration", () => {
    it("reads as an empty list, not null, and can be given genres later", async () => {
      // Simulates a row written before the column existed.
      const song = await createSong(alpha, input({ title: "Legacy" }));
      await db.$executeRaw`UPDATE "Song" SET genres = NULL WHERE id = ${song.id}`;

      const rows = await listSongs(alpha, { search: "Legacy" });
      expect(rows[0].genres).toEqual([]);

      await updateSong(alpha, song.id, input({ title: "Legacy", genres: ["FOLK"] }));
      const after = await db.song.findFirstOrThrow({ where: { id: song.id } });
      expect(after.genres).toEqual(["FOLK"]);
    });
  });
});

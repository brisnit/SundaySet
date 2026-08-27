import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { ChurchContext } from "@/lib/data/context";
import { addSongFromExternal, findDuplicate } from "@/lib/data/external-songs";
import type { ExternalSong } from "@/lib/music";

const SLUG_A = "vitest-external-alpha";
const SLUG_B = "vitest-external-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[external-songs] No database reachable — skipping.\n");
}

const external = (over: Partial<ExternalSong> = {}): ExternalSong => ({
  provider: "musicbrainz",
  externalId: "mbid-purple-rain",
  title: "Purple Rain",
  artist: "Prince",
  album: "Purple Rain",
  releaseYear: 1984,
  durationMs: 520000,
  isrc: "USWB19902312",
  genres: ["ROCK", "POP"],
  ...over,
});

async function makeChurch(slug: string) {
  const church = await db.church.create({ data: { name: slug, slug } });
  const user = await db.user.create({ data: { email: `${slug}@example.test` } });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });
  const ctx: ChurchContext = {
    userId: user.id,
    user: { id: user.id, name: null, email: user.email, image: null, avatarColor: null },
    churchId: church.id,
    church: {
      id: church.id, name: church.name, slug: church.slug,
      timezone: church.timezone, logoUrl: null,
    },
    role: "OWNER",
  };
  return ctx;
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
}

describe.skipIf(!dbReachable)("adding a song from search", () => {
  let a: ChurchContext;
  let b: ChurchContext;

  beforeAll(async () => {
    await purge();
    a = await makeChurch(SLUG_A);
    b = await makeChurch(SLUG_B);
  });
  afterAll(purge);

  beforeEach(async () => {
    await db.song.deleteMany({ where: { churchId: { in: [a.churchId, b.churchId] } } });
  });

  it("stores the metadata a provider legitimately supplies", async () => {
    const result = await addSongFromExternal(a, external());
    expect(result.added).toBe(true);

    const song = await db.song.findUniqueOrThrow({ where: { id: result.songId } });
    expect(song.title).toBe("Purple Rain");
    expect(song.artist).toBe("Prince");
    expect(song.externalProvider).toBe("musicbrainz");
    expect(song.externalId).toBe("mbid-purple-rain");
    expect(song.isrc).toBe("USWB19902312");
    expect(song.releaseYear).toBe(1984);
    expect(song.durationMs).toBe(520000);
    expect(song.genres).toEqual(["ROCK", "POP"]);
    expect(song.familiarity).toBe("NEW");
  });

  // The rule from §9 of the audit, made executable. If someone ever wires
  // lyrics into the importer, this fails.
  it("NEVER writes lyrics, even when the payload carries some", async () => {
    const smuggled = {
      ...external(),
      lyrics: "Purple rain, purple rain",
    } as ExternalSong & { lyrics: string };

    const result = await addSongFromExternal(a, smuggled);
    const song = await db.song.findUniqueOrThrow({ where: { id: result.songId } });
    expect(song.lyrics).toBeNull();
  });

  it("leaves key and BPM empty when the provider has none", async () => {
    const result = await addSongFromExternal(a, external());
    const song = await db.song.findUniqueOrThrow({ where: { id: result.songId } });
    expect(song.defaultKey).toBeNull();
    expect(song.churchKey).toBeNull();
    expect(song.bpm).toBeNull();
  });

  it("never creates a CatalogSong row", async () => {
    const before = await db.catalogSong.count();
    await addSongFromExternal(a, external());
    expect(await db.catalogSong.count()).toBe(before);

    const song = await db.song.findFirstOrThrow({ where: { churchId: a.churchId } });
    expect(song.catalogSongId).toBeNull();
  });

  describe("duplicate detection", () => {
    it("is certain when the provider id matches", async () => {
      await addSongFromExternal(a, external());
      const verdict = await findDuplicate(a, external());
      expect(verdict.kind).toBe("exact");
      if (verdict.kind === "exact") expect(verdict.reason).toBe("external-id");
    });

    it("is certain when the ISRC matches under a different provider id", async () => {
      await addSongFromExternal(a, external());
      const verdict = await findDuplicate(a, external({ externalId: "some-other-id" }));
      expect(verdict.kind).toBe("exact");
      if (verdict.kind === "exact") expect(verdict.reason).toBe("isrc");
    });

    it("is only probable when the names match but nothing else does", async () => {
      await addSongFromExternal(a, external());
      const verdict = await findDuplicate(
        a,
        external({ externalId: "other", isrc: undefined, title: "Purple Rain (Live)" }),
      );
      expect(verdict.kind).toBe("probable");
    });

    it("is none for a genuinely different song", async () => {
      await addSongFromExternal(a, external());
      const verdict = await findDuplicate(
        a,
        external({ externalId: "other", isrc: undefined, title: "Purple Haze", artist: "Jimi Hendrix" }),
      );
      expect(verdict.kind).toBe("none");
    });

    it("refuses to duplicate on a certain match, so a double tap is safe", async () => {
      const first = await addSongFromExternal(a, external());
      const second = await addSongFromExternal(a, external());

      expect(second.added).toBe(false);
      expect(second.songId).toBe(first.songId);
      expect(await db.song.count({ where: { churchId: a.churchId } })).toBe(1);
    });

    it("allows a probable match through, because the user was asked first", async () => {
      await addSongFromExternal(a, external());
      const second = await addSongFromExternal(
        a,
        external({ externalId: "other", isrc: undefined, title: "Purple Rain (Live)" }),
      );
      expect(second.added).toBe(true);
      expect(await db.song.count({ where: { churchId: a.churchId } })).toBe(2);
    });
  });

  // Tenancy: one workspace's library must be invisible to another's search.
  it("does not see another workspace's songs when checking for duplicates", async () => {
    await addSongFromExternal(a, external());

    expect((await findDuplicate(b, external())).kind).toBe("none");

    const inB = await addSongFromExternal(b, external());
    expect(inB.added).toBe(true);

    expect(await db.song.count({ where: { churchId: a.churchId } })).toBe(1);
    expect(await db.song.count({ where: { churchId: b.churchId } })).toBe(1);
  });
});

describe.skipIf(!dbReachable)("duplicates against hand-entered songs", () => {
  let ctx: ChurchContext;

  beforeAll(async () => {
    await db.church.deleteMany({ where: { slug: "vitest-external-hand" } });
    await db.user.deleteMany({ where: { email: "vitest-external-hand@example.test" } });
    const church = await db.church.create({
      data: { name: "vitest-external-hand", slug: "vitest-external-hand" },
    });
    const user = await db.user.create({
      data: { email: "vitest-external-hand@example.test" },
    });
    await db.membership.create({
      data: { userId: user.id, churchId: church.id, role: "OWNER" },
    });
    ctx = {
      userId: user.id,
      user: { id: user.id, name: null, email: user.email, image: null, avatarColor: null },
      churchId: church.id,
      church: {
        id: church.id, name: church.name, slug: church.slug,
        timezone: church.timezone, logoUrl: null,
      },
      role: "OWNER",
    };
  });

  afterAll(async () => {
    await db.church.deleteMany({ where: { slug: "vitest-external-hand" } });
    await db.user.deleteMany({ where: { email: "vitest-external-hand@example.test" } });
  });

  /**
   * The case that made the first version of this useless: a song typed in by
   * hand credits the performer, while the provider credits the writers. Exact
   * artist equality missed it and offered to add a second copy.
   */
  it("spots a hand-entered song when the provider adds co-writers", async () => {
    await db.song.create({
      data: { churchId: ctx.churchId, title: "House of the Lord", artist: "Phil Wickham" },
    });

    const verdict = await findDuplicate(ctx, {
      provider: "musicbrainz",
      externalId: "work-house",
      title: "House of the Lord",
      artist: "Phil Wickham & Jonathan Smith",
    });

    expect(verdict.kind).toBe("probable");
  });

  it("does not confuse two different songs that share a title", async () => {
    await db.song.create({
      data: { churchId: ctx.churchId, title: "Jolene", artist: "Dolly Parton" },
    });

    const verdict = await findDuplicate(ctx, {
      provider: "musicbrainz",
      externalId: "work-jolene-other",
      title: "Jolene",
      artist: "Ray LaMontagne",
    });

    expect(verdict.kind).toBe("none");
  });
});

describe.skipIf(!dbReachable)("adding anyway over an identical hand-entered song", () => {
  let ctx: ChurchContext;

  beforeAll(async () => {
    await db.church.deleteMany({ where: { slug: "vitest-external-clash" } });
    await db.user.deleteMany({ where: { email: "vitest-external-clash@example.test" } });
    const church = await db.church.create({
      data: { name: "vitest-external-clash", slug: "vitest-external-clash" },
    });
    const user = await db.user.create({
      data: { email: "vitest-external-clash@example.test" },
    });
    await db.membership.create({
      data: { userId: user.id, churchId: church.id, role: "OWNER" },
    });
    ctx = {
      userId: user.id,
      user: { id: user.id, name: null, email: user.email, image: null, avatarColor: null },
      churchId: church.id,
      church: {
        id: church.id, name: church.name, slug: church.slug,
        timezone: church.timezone, logoUrl: null,
      },
      role: "OWNER",
    };
  });

  afterAll(async () => {
    await db.church.deleteMany({ where: { slug: "vitest-external-clash" } });
    await db.user.deleteMany({ where: { email: "vitest-external-clash@example.test" } });
  });

  /**
   * A name match is only ever a hint, so the user can add anyway — and then the
   * raw title and artist can collide with the database's own uniqueness rule.
   * That has to end on a song page, not a stack trace.
   */
  it("returns the existing song rather than throwing a constraint error", async () => {
    const hand = await db.song.create({
      data: { churchId: ctx.churchId, title: "Purple Rain", artist: "Prince" },
    });

    const result = await addSongFromExternal(ctx, {
      provider: "musicbrainz",
      externalId: "work-purple-rain",
      title: "Purple Rain",
      artist: "Prince",
    });

    expect(result.added).toBe(false);
    expect(result.songId).toBe(hand.id);
    expect(await db.song.count({ where: { churchId: ctx.churchId } })).toBe(1);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { NotFoundError, type ChurchContext } from "@/lib/data/context";
import { createService } from "@/lib/data/services";
import {
  addSongToService,
  DuplicateSongError,
  getSetlist,
  listAddableSongs,
  moveServiceSong,
  removeSongFromService,
  setServiceSongKey,
} from "@/lib/data/setlist";
import { parseServiceDate, type ServiceInput } from "@/lib/validation/service";

const SLUG_A = "vitest-set-alpha";
const SLUG_B = "vitest-set-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[setlist] No database reachable — skipping.\n");
}

const serviceInput = (): ServiceInput => ({
  date: parseServiceDate("2026-09-06"),
  serviceTypeId: undefined,
  startTime: "10:00",
  callTime: undefined,
  title: "Setlist Test",
  notes: undefined,
  status: "DRAFT",
});

async function makeChurch(slug: string) {
  const church = await db.church.create({ data: { name: slug, slug } });
  const user = await db.user.create({ data: { email: `${slug}@example.test` } });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });
  const ctx: ChurchContext = {
    userId: user.id,
    user: { id: user.id, name: null, email: user.email, image: null },
    churchId: church.id,
    church: {
      id: church.id, name: church.name, slug: church.slug,
      timezone: church.timezone, logoUrl: null,
    },
    role: "OWNER",
  };
  const songs = await Promise.all(
    ["Alpha Song", "Bravo Song", "Charlie Song", "Delta Song"].map((title, i) =>
      db.song.create({
        data: {
          churchId: church.id,
          title,
          artist: "Tester",
          churchKey: i === 0 ? "G" : null,
          defaultKey: "D",
          songTypes: [],
          themes: [],
        },
      }),
    ),
  );
  return { ctx, songs };
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
}

const titles = (rows: Awaited<ReturnType<typeof getSetlist>>) =>
  rows.map((r) => r.title);
const positions = (rows: Awaited<ReturnType<typeof getSetlist>>) =>
  rows.map((r) => r.position);

describe.skipIf(!dbReachable)("setlist", () => {
  let alpha: Awaited<ReturnType<typeof makeChurch>>;
  let beta: Awaited<ReturnType<typeof makeChurch>>;
  let serviceId: string;

  beforeAll(async () => {
    await purge();
    alpha = await makeChurch(SLUG_A);
    beta = await makeChurch(SLUG_B);
  });
  afterAll(async () => {
    await purge();
  });

  // Each test gets a fresh service so ordering tests do not interfere.
  async function freshService(ctx = alpha.ctx) {
    const s = await createService(ctx, serviceInput());
    return s.id;
  }

  describe("adding", () => {
    it("appends songs in the order they are added, numbered from 1", async () => {
      serviceId = await freshService();
      await addSongToService(alpha.ctx, serviceId, alpha.songs[0].id);
      await addSongToService(alpha.ctx, serviceId, alpha.songs[1].id);

      const rows = await getSetlist(alpha.ctx, serviceId);
      expect(titles(rows)).toEqual(["Alpha Song", "Bravo Song"]);
      expect(positions(rows)).toEqual([1, 2]);
    });

    it("defaults the key to the key the church plays it in", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id); // churchKey G
      await addSongToService(alpha.ctx, id, alpha.songs[1].id); // no churchKey, defaultKey D
      const rows = await getSetlist(alpha.ctx, id);
      expect(rows[0].key).toBe("G");
      expect(rows[1].key).toBe("D");
    });

    it("rejects the same song twice in one service", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      await expect(
        addSongToService(alpha.ctx, id, alpha.songs[0].id),
      ).rejects.toBeInstanceOf(DuplicateSongError);
      expect(await getSetlist(alpha.ctx, id)).toHaveLength(1);
    });

    it("rejects an unknown song id", async () => {
      const id = await freshService();
      await expect(
        addSongToService(alpha.ctx, id, "no-such-song"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects an unknown service id", async () => {
      await expect(
        addSongToService(alpha.ctx, "no-such-service", alpha.songs[0].id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("tenancy", () => {
    it("REFUSES to add another church's song to your service", async () => {
      const id = await freshService();
      await expect(
        addSongToService(alpha.ctx, id, beta.songs[0].id),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(await getSetlist(alpha.ctx, id)).toHaveLength(0);
    });

    it("REFUSES to add a song to another church's service", async () => {
      const id = await freshService(beta.ctx);
      await expect(
        addSongToService(alpha.ctx, id, alpha.songs[0].id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("REFUSES to remove a row from another church's service", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      const [row] = await getSetlist(alpha.ctx, id);
      await expect(
        removeSongFromService(beta.ctx, row.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(await getSetlist(alpha.ctx, id)).toHaveLength(1);
    });

    it("REFUSES to change the key on another church's row", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      const [row] = await getSetlist(alpha.ctx, id);
      await expect(
        setServiceSongKey(beta.ctx, row.id, "A"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect((await getSetlist(alpha.ctx, id))[0].key).toBe("G");
    });

    it("REFUSES to reorder another church's set", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      await addSongToService(alpha.ctx, id, alpha.songs[1].id);
      const [first] = await getSetlist(alpha.ctx, id);
      await expect(
        moveServiceSong(beta.ctx, first.id, "down"),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(titles(await getSetlist(alpha.ctx, id))).toEqual([
        "Alpha Song", "Bravo Song",
      ]);
    });

    it("does not leak another church's set through getSetlist", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      expect(await getSetlist(beta.ctx, id)).toEqual([]);
    });
  });

  describe("key", () => {
    it("changes the key", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      const [row] = await getSetlist(alpha.ctx, id);
      await setServiceSongKey(alpha.ctx, row.id, "Bb");
      expect((await getSetlist(alpha.ctx, id))[0].key).toBe("Bb");
    });

    it("clears the key when set to null", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      const [row] = await getSetlist(alpha.ctx, id);
      await setServiceSongKey(alpha.ctx, row.id, null);
      expect((await getSetlist(alpha.ctx, id))[0].key).toBeNull();
    });

    it("rejects an unknown row id", async () => {
      await expect(
        setServiceSongKey(alpha.ctx, "no-such-row", "C"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("reordering", () => {
    async function threeSongs() {
      const id = await freshService();
      for (const s of alpha.songs.slice(0, 3)) {
        await addSongToService(alpha.ctx, id, s.id);
      }
      return id;
    }

    it("moves a song down and renumbers without gaps", async () => {
      const id = await threeSongs();
      const rows = await getSetlist(alpha.ctx, id);
      await moveServiceSong(alpha.ctx, rows[0].id, "down");

      const after = await getSetlist(alpha.ctx, id);
      expect(titles(after)).toEqual(["Bravo Song", "Alpha Song", "Charlie Song"]);
      expect(positions(after)).toEqual([1, 2, 3]);
    });

    it("moves a song up", async () => {
      const id = await threeSongs();
      const rows = await getSetlist(alpha.ctx, id);
      await moveServiceSong(alpha.ctx, rows[2].id, "up");
      expect(titles(await getSetlist(alpha.ctx, id))).toEqual([
        "Alpha Song", "Charlie Song", "Bravo Song",
      ]);
    });

    it("is a no-op at the top", async () => {
      const id = await threeSongs();
      const rows = await getSetlist(alpha.ctx, id);
      await moveServiceSong(alpha.ctx, rows[0].id, "up");
      expect(titles(await getSetlist(alpha.ctx, id))).toEqual([
        "Alpha Song", "Bravo Song", "Charlie Song",
      ]);
    });

    it("is a no-op at the bottom", async () => {
      const id = await threeSongs();
      const rows = await getSetlist(alpha.ctx, id);
      await moveServiceSong(alpha.ctx, rows[2].id, "down");
      expect(positions(await getSetlist(alpha.ctx, id))).toEqual([1, 2, 3]);
    });

    it("survives repeated moves without a unique-constraint clash", async () => {
      // @@unique([serviceId, position]) is checked per statement, so renumber
      // parks rows in negative slots before writing final positions.
      const id = await threeSongs();
      for (let i = 0; i < 6; i++) {
        const rows = await getSetlist(alpha.ctx, id);
        await moveServiceSong(alpha.ctx, rows[0].id, "down");
      }
      const after = await getSetlist(alpha.ctx, id);
      expect(positions(after)).toEqual([1, 2, 3]);
      expect(new Set(titles(after)).size).toBe(3);
    });
  });

  describe("removing", () => {
    it("removes a song and closes the gap in positions", async () => {
      const id = await freshService();
      for (const s of alpha.songs.slice(0, 3)) {
        await addSongToService(alpha.ctx, id, s.id);
      }
      const rows = await getSetlist(alpha.ctx, id);
      await removeSongFromService(alpha.ctx, rows[1].id);

      const after = await getSetlist(alpha.ctx, id);
      expect(titles(after)).toEqual(["Alpha Song", "Charlie Song"]);
      expect(positions(after)).toEqual([1, 2]);
    });

    it("frees the song to be added again afterwards", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      const [row] = await getSetlist(alpha.ctx, id);
      await removeSongFromService(alpha.ctx, row.id);
      await expect(
        addSongToService(alpha.ctx, id, alpha.songs[0].id),
      ).resolves.toBeTruthy();
    });

    it("rejects an unknown row id", async () => {
      await expect(
        removeSongFromService(alpha.ctx, "no-such-row"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("listAddableSongs", () => {
    it("excludes songs already in the set", async () => {
      const id = await freshService();
      await addSongToService(alpha.ctx, id, alpha.songs[0].id);
      const addable = await listAddableSongs(alpha.ctx, id);
      expect(addable.map((s) => s.title)).not.toContain("Alpha Song");
      expect(addable.map((s) => s.title)).toContain("Bravo Song");
    });

    it("only offers this church's songs", async () => {
      const id = await freshService();
      const addable = await listAddableSongs(alpha.ctx, id);
      expect(addable.every((s) => s.artist === "Tester")).toBe(true);
      expect(addable).toHaveLength(4);
    });

    it("excludes retired songs", async () => {
      const id = await freshService();
      await db.song.updateMany({
        where: { id: alpha.songs[3].id },
        data: { status: "RETIRED" },
      });
      const addable = await listAddableSongs(alpha.ctx, id);
      expect(addable.map((s) => s.title)).not.toContain("Delta Song");
      await db.song.updateMany({
        where: { id: alpha.songs[3].id },
        data: { status: "ACTIVE" },
      });
    });
  });
});

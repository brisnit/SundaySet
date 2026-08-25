import "server-only";

import { db } from "@/lib/db";

import { NotFoundError, scope, scopedById, type ChurchContext } from "./context";

/**
 * Setlist reads and writes.
 *
 * ServiceSong carries no churchId, so every query reaches tenancy through its
 * parent: `service: scope(ctx)`. That is the same pattern SongAttachment uses.
 *
 * Two constraints from the schema shape everything here:
 *   @@unique([serviceId, songId])    — a song appears at most once per service
 *   @@unique([serviceId, position])  — positions are unique, so reordering has
 *                                      to move rows out of the way first
 */

/** Raised when a song is already in the service. */
export class DuplicateSongError extends Error {
  constructor() {
    super("That song is already in this set.");
    this.name = "DuplicateSongError";
  }
}

const PRISMA_UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === PRISMA_UNIQUE_VIOLATION
  );
}

const rowShape = {
  song: {
    select: {
      id: true,
      title: true,
      artist: true,
      churchKey: true,
      defaultKey: true,
      bpm: true,
      chart: { select: { id: true } },
      attachments: { select: { id: true }, take: 1 },
    },
  },
};

export type SetlistRow = {
  id: string;
  position: number;
  key: string | null;
  songId: string;
  title: string;
  artist: string | null;
  bpm: number | null;
  hasChart: boolean;
};

export async function getSetlist(
  ctx: ChurchContext,
  serviceId: string,
): Promise<SetlistRow[]> {
  const rows = await db.serviceSong.findMany({
    where: { serviceId, service: scope(ctx) },
    include: rowShape,
    orderBy: { position: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    position: r.position,
    key: r.key,
    songId: r.song.id,
    title: r.song.title,
    artist: r.song.artist,
    bpm: r.song.bpm,
    hasChart: Boolean(r.song.chart) || r.song.attachments.length > 0,
  }));
}

async function assertServiceOwned(ctx: ChurchContext, serviceId: string) {
  const owned = await db.service.findFirst({
    where: scopedById(ctx, serviceId),
    select: { id: true },
  });
  if (!owned) throw new NotFoundError("Service");
}

/** Appends to the end of the set. */
export async function addSongToService(
  ctx: ChurchContext,
  serviceId: string,
  songId: string,
) {
  await assertServiceOwned(ctx, serviceId);

  // The song must be this church's too, or a service could reference another
  // church's repertoire.
  const song = await db.song.findFirst({
    where: scopedById(ctx, songId),
    select: { id: true, churchKey: true, defaultKey: true },
  });
  if (!song) throw new NotFoundError("Song");

  const last = await db.serviceSong.findFirst({
    where: { serviceId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  try {
    return await db.serviceSong.create({
      data: {
        serviceId,
        songId,
        position: (last?.position ?? 0) + 1,
        // Default to the key this church actually plays it in.
        key: song.churchKey ?? song.defaultKey,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DuplicateSongError();
    throw e;
  }
}

/** Resolves a row and its service, scoped to the church. */
async function findRow(ctx: ChurchContext, serviceSongId: string) {
  const row = await db.serviceSong.findFirst({
    where: { id: serviceSongId, service: scope(ctx) },
    select: { id: true, serviceId: true, position: true },
  });
  if (!row) throw new NotFoundError("Setlist item");
  return row;
}

export async function setServiceSongKey(
  ctx: ChurchContext,
  serviceSongId: string,
  key: string | null,
) {
  const { count } = await db.serviceSong.updateMany({
    where: { id: serviceSongId, service: scope(ctx) },
    data: { key },
  });
  if (count === 0) throw new NotFoundError("Setlist item");
}

/**
 * Removes a song and closes the gap, so positions stay 1..n with no holes.
 * Renumbering runs in the same transaction as the delete.
 */
export async function removeSongFromService(
  ctx: ChurchContext,
  serviceSongId: string,
) {
  const row = await findRow(ctx, serviceSongId);

  await db.$transaction(async (tx) => {
    await tx.serviceSong.deleteMany({ where: { id: row.id } });
    const remaining = await tx.serviceSong.findMany({
      where: { serviceId: row.serviceId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    await renumber(tx, remaining);
  });
}

/**
 * Writes positions 1..n.
 *
 * Two phases, because @@unique([serviceId, position]) is checked per statement:
 * everything moves to a negative slot first, which cannot collide with the
 * live 1..n range, then down into its final position.
 */
type TxClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

async function renumber(tx: TxClient, rows: Array<{ id: string }>) {
  for (const [i, r] of rows.entries()) {
    await tx.serviceSong.updateMany({
      where: { id: r.id },
      data: { position: -(i + 1) },
    });
  }
  for (const [i, r] of rows.entries()) {
    await tx.serviceSong.updateMany({
      where: { id: r.id },
      data: { position: i + 1 },
    });
  }
}

export type MoveDirection = "up" | "down";

/** Swaps a row with its neighbour. A no-op at either end. */
export async function moveServiceSong(
  ctx: ChurchContext,
  serviceSongId: string,
  direction: MoveDirection,
) {
  const row = await findRow(ctx, serviceSongId);

  const ordered = await db.serviceSong.findMany({
    where: { serviceId: row.serviceId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  const index = ordered.findIndex((r) => r.id === row.id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= ordered.length) return;

  const reordered = [...ordered];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  await db.$transaction(async (tx) => {
    await renumber(tx, reordered);
  });
}

/** Songs available to add: this church's active repertoire, minus what is already in. */
export async function listAddableSongs(ctx: ChurchContext, serviceId: string) {
  const [songs, existing] = await Promise.all([
    db.song.findMany({
      where: { ...scope(ctx), status: "ACTIVE" },
      select: {
        id: true,
        title: true,
        artist: true,
        churchKey: true,
        defaultKey: true,
        bpm: true,
        songTypes: true,
        themes: true,
        familiarity: true,
        lastPlayedOn: true,
        chart: { select: { id: true } },
      },
      orderBy: { title: "asc" },
    }),
    db.serviceSong.findMany({
      where: { serviceId, service: scope(ctx) },
      select: { songId: true },
    }),
  ]);

  const used = new Set(existing.map((e) => e.songId));
  return songs
    .filter((s) => !used.has(s.id))
    .map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      key: s.churchKey ?? s.defaultKey,
      bpm: s.bpm,
      songTypes: s.songTypes,
      themes: s.themes,
      familiarity: s.familiarity,
      lastPlayedOn: s.lastPlayedOn,
      hasChart: Boolean(s.chart),
    }));
}

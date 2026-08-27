import "server-only";

import { cache } from "react";

import type { Familiarity, Genre, SongStatus, SongType } from "@/generated/prisma/enums";
import type { ChartInput, SongInput } from "@/lib/validation/song";
import { db } from "@/lib/db";
import { classifyUsage, type UsageVerdict } from "@/lib/domain/song-usage";

import { NotFoundError, scope, scopedById, type ChurchContext } from "./context";

export type SongSort = "title" | "artist" | "recently-played" | "least-played" | "added";

export type SongFilters = {
  search?: string;
  songTypes?: SongType[];
  /** Matches a song carrying ANY of these — genres are not exclusive. */
  genres?: Genre[];
  familiarity?: Familiarity[];
  status?: SongStatus;
  sort?: SongSort;
};

export type SongListItem = {
  id: string;
  title: string;
  artist: string | null;
  churchKey: string | null;
  defaultKey: string | null;
  bpm: number | null;
  songTypes: SongType[];
  genres: Genre[];
  themes: string[];
  familiarity: Familiarity;
  status: SongStatus;
  lastPlayedOn: Date | null;
  uses90d: number;
  usesYtd: number;
  usage: UsageVerdict;
  hasChart: boolean;
};

function startOfYear(today: Date): Date {
  return new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
}

function daysAgo(today: Date, days: number): Date {
  return new Date(today.getTime() - days * 86_400_000);
}

/**
 * Play counts for the whole library in two aggregate queries rather than one
 * per song, so the Songs page stays a constant number of round trips.
 */
async function usageCounts(ctx: ChurchContext, today: Date) {
  const [recent, ytd] = await Promise.all([
    db.songUsage.groupBy({
      by: ["songId"],
      where: { ...scope(ctx), playedOn: { gte: daysAgo(today, 90) } },
      _count: { _all: true },
    }),
    db.songUsage.groupBy({
      by: ["songId"],
      where: { ...scope(ctx), playedOn: { gte: startOfYear(today) } },
      _count: { _all: true },
    }),
  ]);

  return {
    uses90d: new Map(recent.map((r) => [r.songId, r._count._all])),
    usesYtd: new Map(ytd.map((r) => [r.songId, r._count._all])),
  };
}

export async function listSongs(
  ctx: ChurchContext,
  filters: SongFilters = {},
  today: Date = new Date(),
): Promise<SongListItem[]> {
  const { search, songTypes, genres, familiarity, status, sort = "title" } = filters;

  const songs = await db.song.findMany({
    where: {
      ...scope(ctx),
      ...(status ? { status } : {}),
      ...(songTypes?.length ? { songTypes: { hasSome: songTypes } } : {}),
      // hasSome, so picking Rock finds "Worship + Rock" too. Combined with the
      // other filters by AND, which is what "narrow it down" should mean.
      ...(genres?.length ? { genres: { hasSome: genres } } : {}),
      ...(familiarity?.length ? { familiarity: { in: familiarity } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { artist: { contains: search, mode: "insensitive" as const } },
              { themes: { has: search.toLowerCase() } },
            ],
          }
        : {}),
    },
    include: { chart: { select: { id: true } } },
    orderBy:
      sort === "artist"
        ? [{ artist: "asc" }, { title: "asc" }]
        : sort === "recently-played"
          ? [{ lastPlayedOn: "desc" }]
          : sort === "least-played"
            ? [{ lastPlayedOn: "asc" }]
            : sort === "added"
              ? [{ addedAt: "desc" }]
              : [{ title: "asc" }],
  });

  const counts = await usageCounts(ctx, today);

  return songs.map((s) => {
    const uses90d = counts.uses90d.get(s.id) ?? 0;
    const usesYtd = counts.usesYtd.get(s.id) ?? 0;
    return {
      id: s.id,
      title: s.title,
      artist: s.artist,
      churchKey: s.churchKey,
      defaultKey: s.defaultKey,
      bpm: s.bpm,
      songTypes: s.songTypes,
      genres: s.genres,
      themes: s.themes,
      familiarity: s.familiarity,
      status: s.status,
      lastPlayedOn: s.lastPlayedOn,
      uses90d,
      usesYtd,
      usage: classifyUsage(
        { lastPlayedOn: s.lastPlayedOn, uses90d, usesYtd },
        today,
      ),
      hasChart: Boolean(s.chart),
    };
  });
}

/**
 * Wrapped in React `cache` because generateMetadata and the page body both read
 * the same song — two identical cross-region queries per view.
 *
 * `today` is excluded from the signature on purpose: a `new Date()` default
 * would be a different value on each call and the memo would never hit. Usage
 * is classified against the request's own clock inside.
 */
export const getSongById = cache(async (ctx: ChurchContext, id: string) => {
  const today = new Date();
  const song = await db.song.findFirst({
    where: scopedById(ctx, id),
    include: {
      chart: true,
      attachments: true,
      usages: { orderBy: { playedOn: "desc" }, take: 20 },
    },
  });
  if (!song) throw new NotFoundError("Song");

  const uses90d = song.usages.filter(
    (u) => u.playedOn >= daysAgo(today, 90),
  ).length;
  const usesYtd = song.usages.filter(
    (u) => u.playedOn >= startOfYear(today),
  ).length;

  return {
    ...song,
    uses90d,
    usesYtd,
    usage: classifyUsage(
      { lastPlayedOn: song.lastPlayedOn, uses90d, usesYtd },
      today,
    ),
  };
});

export async function songLibraryStats(ctx: ChurchContext) {
  const [total, active, hymns, charts] = await Promise.all([
    db.song.count({ where: scope(ctx) }),
    db.song.count({ where: { ...scope(ctx), status: "ACTIVE" } }),
    db.song.count({
      where: { ...scope(ctx), status: "ACTIVE", songTypes: { has: "HYMN" } },
    }),
    db.song.count({ where: { ...scope(ctx), chart: { isNot: null } } }),
  ]);
  return { total, active, hymns, charts, missingCharts: active - charts };
}

// ---------------------------------------------------------------------------
// Writes
//
// These use updateMany / deleteMany with a scoped `where` rather than
// update / delete, which demand a unique selector and would therefore key on a
// bare id. A scoped bulk operation simply affects zero rows when the record
// belongs to another church, so a wrong id can never mutate someone else's data.
// ---------------------------------------------------------------------------

/** Thrown when a workspace already has a song with this exact title and artist. */
export class DuplicateSongError extends Error {
  constructor() {
    super("Duplicate song");
    this.name = "DuplicateSongError";
  }
}

export async function createSong(ctx: ChurchContext, input: SongInput) {
  try {
    return await db.song.create({
      data: {
        ...input,
        churchId: ctx.churchId,
        churchKey: input.churchKey ?? input.defaultKey,
      },
    });
  } catch (e) {
    // @@unique([churchId, title, artist]). Adding a song you already have is an
    // ordinary thing to do by accident, not a crash — it deserves a sentence,
    // not a stack trace. Prisma raises P2002 for a unique violation.
    if (
      e !== null &&
      typeof e === "object" &&
      (e as { code?: string }).code === "P2002"
    ) {
      throw new DuplicateSongError();
    }
    throw e;
  }
}

export async function updateSong(
  ctx: ChurchContext,
  id: string,
  input: SongInput,
) {
  const { count } = await db.song.updateMany({
    where: scopedById(ctx, id),
    data: input,
  });
  if (count === 0) throw new NotFoundError("Song");
}

export async function setSongStatus(
  ctx: ChurchContext,
  id: string,
  status: SongStatus,
) {
  const { count } = await db.song.updateMany({
    where: scopedById(ctx, id),
    data: { status, ...(status === "RETIRED" ? { familiarity: "RETIRED" } : {}) },
  });
  if (count === 0) throw new NotFoundError("Song");
}

export async function deleteSong(ctx: ChurchContext, id: string) {
  const { count } = await db.song.deleteMany({ where: scopedById(ctx, id) });
  if (count === 0) throw new NotFoundError("Song");
}

/**
 * Add a Discover catalog song to this church's library.
 * Returns the existing row when it is already there, so the button is idempotent.
 */
export async function addSongFromCatalog(
  ctx: ChurchContext,
  catalogSongId: string,
) {
  const catalog = await db.catalogSong.findUnique({ where: { id: catalogSongId } });
  if (!catalog) throw new NotFoundError("Catalog song");

  const existing = await db.song.findFirst({
    where: { ...scope(ctx), title: catalog.title, artist: catalog.artist },
  });
  if (existing) return existing;

  return db.song.create({
    data: {
      churchId: ctx.churchId,
      catalogSongId: catalog.id,
      title: catalog.title,
      artist: catalog.artist,
      ccliNumber: catalog.ccliNumber,
      defaultKey: catalog.defaultKey,
      churchKey: catalog.defaultKey,
      bpm: catalog.bpm,
      tempoCategory: catalog.tempoCategory,
      songTypes: catalog.songTypes,
      themes: catalog.themes,
      difficulty: catalog.difficulty,
      spotifyUrl: catalog.spotifyUrl,
      appleMusicUrl: catalog.appleMusicUrl,
      youtubeUrl: catalog.youtubeUrl,
      familiarity: "NEW",
      status: "ACTIVE",
    },
  });
}

export async function upsertSongChart(
  ctx: ChurchContext,
  songId: string,
  input: ChartInput,
) {
  // Ownership is proven before touching the chart, which is keyed by songId.
  const song = await db.song.findFirst({
    where: scopedById(ctx, songId),
    select: { id: true },
  });
  if (!song) throw new NotFoundError("Song");

  const data = {
    format: "STRUCTURED" as const,
    key: input.key,
    capo: input.capo,
    sections: input.sections,
  };

  // Provenance. This chart was written by a person in the SetMeister editor,
  // and `editedByUser` stays true forever after: once someone has been through
  // a chart, no future importer or transcriber gets to call it unreviewed.
  return db.songChart.upsert({
    where: { songId },
    create: { songId, ...data, source: "USER_CREATED", editedByUser: true },
    update: { ...data, editedByUser: true },
  });
}

/** Full play history for the song detail page. */
export async function getSongUsageHistory(ctx: ChurchContext, songId: string) {
  return db.songUsage.findMany({
    where: { ...scope(ctx), songId },
    include: { service: { select: { id: true, date: true } } },
    orderBy: { playedOn: "desc" },
    take: 60,
  });
}

export async function addSongAttachment(
  ctx: ChurchContext,
  songId: string,
  file: { url: string; filename: string; mimeType: string; sizeBytes: number },
) {
  const song = await db.song.findFirst({
    where: scopedById(ctx, songId),
    select: { id: true },
  });
  if (!song) throw new NotFoundError("Song");

  return db.songAttachment.create({
    data: {
      songId,
      kind: "PDF",
      url: file.url,
      filename: file.filename,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      uploadedById: ctx.userId,
    },
  });
}

/** Returns the stored URL so the caller can remove the blob too. */
export async function deleteSongAttachment(ctx: ChurchContext, id: string) {
  const attachment = await db.songAttachment.findFirst({
    where: { id, song: scope(ctx) },
    select: { id: true, url: true },
  });
  if (!attachment) throw new NotFoundError("Attachment");

  await db.songAttachment.delete({ where: { id: attachment.id } });
  return attachment.url;
}

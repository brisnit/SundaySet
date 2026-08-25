import "server-only";

import type { Familiarity, SongStatus, SongType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { classifyUsage, type UsageVerdict } from "@/lib/domain/song-usage";

import { NotFoundError, scope, scopedById, type ChurchContext } from "./context";

export type SongSort = "title" | "artist" | "recently-played" | "least-played" | "added";

export type SongFilters = {
  search?: string;
  songTypes?: SongType[];
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
  const { search, songTypes, familiarity, status, sort = "title" } = filters;

  const songs = await db.song.findMany({
    where: {
      ...scope(ctx),
      ...(status ? { status } : {}),
      ...(songTypes?.length ? { songTypes: { hasSome: songTypes } } : {}),
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

export async function getSongById(
  ctx: ChurchContext,
  id: string,
  today: Date = new Date(),
) {
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
}

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

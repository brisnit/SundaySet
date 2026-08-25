import "server-only";

import type { SongType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  findSimilar,
  scoreCandidate,
  type Candidate,
  type ChurchTaste,
} from "@/lib/domain/recommend";

import { scope, type ChurchContext } from "./context";

export type DiscoverSong = Candidate & {
  defaultKey: string | null;
  bpm: number | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
  youtubeUrl: string | null;
  inLibrary: boolean;
  score: number;
  reasons: string[];
  similarTo: string[];
};

/** The church's taste, derived from its profile plus what it actually sings. */
async function churchTaste(ctx: ChurchContext): Promise<{
  taste: ChurchTaste;
  library: Array<{ title: string; themes: string[] }>;
  libraryTitles: Set<string>;
}> {
  const [profile, songs] = await Promise.all([
    db.worshipProfile.findUnique({ where: { churchId: ctx.churchId } }),
    db.song.findMany({
      where: { ...scope(ctx), status: "ACTIVE" },
      select: { title: true, artist: true, themes: true },
    }),
  ]);

  const themeCounts = new Map<string, number>();
  for (const s of songs) {
    for (const t of s.themes) {
      themeCounts.set(t, (themeCounts.get(t) ?? 0) + 1);
    }
  }

  return {
    taste: {
      preferredArtists: profile?.preferredArtists ?? [],
      avoidArtists: profile?.avoidArtists ?? [],
      avoidSongs: profile?.avoidSongs ?? [],
      difficulty: profile?.difficulty ?? "MODERATE",
      libraryThemes: [...themeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([t]) => t),
      libraryArtists: [
        ...new Set(songs.map((s) => s.artist).filter((a): a is string => Boolean(a))),
      ],
    },
    library: songs.map((s) => ({ title: s.title, themes: s.themes })),
    libraryTitles: new Set(songs.map((s) => s.title.toLowerCase())),
  };
}

async function scored(ctx: ChurchContext): Promise<DiscoverSong[]> {
  const { taste, library, libraryTitles } = await churchTaste(ctx);
  const catalog = await db.catalogSong.findMany({ orderBy: { popularity: "desc" } });

  return catalog.map((c) => {
    const candidate: Candidate = {
      id: c.id,
      title: c.title,
      artist: c.artist,
      themes: c.themes,
      songTypes: c.songTypes,
      difficulty: c.difficulty,
      popularity: c.popularity,
    };
    const { score, reasons } = scoreCandidate(candidate, taste);
    return {
      ...candidate,
      defaultKey: c.defaultKey,
      bpm: c.bpm,
      spotifyUrl: c.spotifyUrl,
      appleMusicUrl: c.appleMusicUrl,
      youtubeUrl: c.youtubeUrl,
      inLibrary: libraryTitles.has(c.title.toLowerCase()),
      score,
      reasons,
      similarTo: findSimilar(candidate, library),
    };
  });
}

export type DiscoverSection = {
  key: string;
  title: string;
  blurb?: string;
  songs: DiscoverSong[];
};

export async function getDiscover(ctx: ChurchContext) {
  const all = await scored(ctx);
  const fresh = all.filter((s) => !s.inLibrary);

  const byType = (t: SongType, from: DiscoverSong[] = all) =>
    from.filter((s) => s.songTypes.includes(t));

  const sections: DiscoverSection[] = [
    {
      key: "for-you",
      title: "Recommended for your church",
      blurb: "Scored against your style profile and the themes you sing most.",
      songs: [...fresh].sort((a, b) => b.score - a.score).slice(0, 8),
    },
    {
      key: "trending",
      title: "Trending",
      songs: [...fresh].sort((a, b) => b.popularity - a.popularity).slice(0, 8),
    },
    {
      key: "hymns",
      title: "Modern hymns",
      songs: byType("HYMN", fresh).slice(0, 8),
    },
    {
      key: "communion",
      title: "Communion",
      songs: byType("COMMUNION").slice(0, 8),
    },
    {
      key: "easter",
      title: "Easter",
      songs: byType("EASTER").slice(0, 8),
    },
    {
      key: "christmas",
      title: "Christmas & Advent",
      songs: [...byType("CHRISTMAS"), ...byType("ADVENT")].slice(0, 8),
    },
  ].filter((s) => s.songs.length > 0);

  // The headline pick: the strongest match the church does not already have.
  const hot = [...fresh].sort((a, b) => b.score - a.score)[0];

  return { sections, hot };
}

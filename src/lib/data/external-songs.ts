import "server-only";

import { db } from "@/lib/db";
import type { ExternalSong } from "@/lib/music";
import { artistsPlausiblyMatch, normalizeTitle } from "@/lib/music/normalize";

import { scope, type ChurchContext } from "./context";

/**
 * Adding a song found through search.
 *
 * Two rules govern everything here.
 *
 * The first is that a provider result NEVER becomes a CatalogSong. CatalogSong
 * is SetMeister's curated recommendation shelf — small, editorial, hand-scored,
 * and shared across every workspace. Provider search is the open music
 * universe. A Song is what one workspace actually owns. Blurring those would
 * put uncurated rows into everyone's recommendations and collide on
 * CatalogSong's global title+artist uniqueness.
 *
 * The second is that no import ever writes lyrics. Metadata — titles, artists,
 * dates, identifiers — is factual and safe to hold. Lyrics are somebody's
 * copyrighted work, and the fact that a provider could hand them over would not
 * make it lawful for us to keep them. `Song.lyrics` stays user-entered, always.
 * There is a test asserting exactly that.
 */

export type DuplicateVerdict =
  | { kind: "none" }
  | {
      /** Certain. The same recording, by identifier. */
      kind: "exact";
      reason: "external-id" | "isrc";
      song: { id: string; title: string; artist: string | null };
    }
  | {
      /** Probable. The same words, possibly a different recording. */
      kind: "probable";
      reason: "title-artist";
      song: { id: string; title: string; artist: string | null };
    };

/**
 * Is this song already in the workspace?
 *
 * Tiered, because certainty should change the interface rather than be averaged
 * away. An identifier match is a fact and the UI can simply refuse to duplicate
 * it. A normalized name match is a guess — a live cut, a cover, a re-recording
 * are all genuinely different songs to a band — so that case asks rather than
 * decides. Nothing is ever merged automatically.
 */
export async function findDuplicate(
  ctx: ChurchContext,
  external: ExternalSong,
): Promise<DuplicateVerdict> {
  const select = { id: true, title: true, artist: true } as const;

  const byExternalId = await db.song.findFirst({
    where: {
      ...scope(ctx),
      externalProvider: external.provider,
      externalId: external.externalId,
    },
    select,
  });
  if (byExternalId) {
    return { kind: "exact", reason: "external-id", song: byExternalId };
  }

  if (external.isrc) {
    const byIsrc = await db.song.findFirst({
      where: { ...scope(ctx), isrc: external.isrc },
      select,
    });
    if (byIsrc) return { kind: "exact", reason: "isrc", song: byIsrc };
  }

  // Name matching runs in memory. A workspace holds tens of songs, so the
  // comparison is cheap, and doing it here avoids storing normalized columns
  // that would have to be kept in step with the normalizer forever.
  //
  // The title must match exactly once normalized; the artist only has to be
  // plausible. Requiring both to be identical missed the common case outright,
  // because a library credits the performer and a provider credits the writers.
  const wantedTitle = normalizeTitle(external.title);
  const all = await db.song.findMany({ where: scope(ctx), select });
  const named = all.find(
    (s) =>
      normalizeTitle(s.title) === wantedTitle &&
      artistsPlausiblyMatch(s.artist, external.artist),
  );
  if (named) return { kind: "probable", reason: "title-artist", song: named };

  return { kind: "none" };
}

export type AddResult =
  | { added: true; songId: string }
  | { added: false; reason: "duplicate"; songId: string };

/**
 * Create a workspace song from a search result.
 *
 * An identifier match is refused rather than duplicated, so the button is
 * idempotent under a double tap or a stale page. A name-only match is allowed
 * through, because by the time this is called the user has been shown the
 * possible match and chosen to add anyway.
 */
export async function addSongFromExternal(
  ctx: ChurchContext,
  external: ExternalSong,
): Promise<AddResult> {
  const duplicate = await findDuplicate(ctx, external);
  if (duplicate.kind === "exact") {
    return { added: false, reason: "duplicate", songId: duplicate.song.id };
  }

  try {
    return await create(ctx, external);
  } catch (e) {
    // @@unique([churchId, title, artist]). Reachable when a name match was only
    // "probable" — a hint, so the user could add anyway — but the raw strings
    // turn out to be identical. Hand back the row they already have rather than
    // failing: the outcome they wanted is a song page, and there is one.
    if (e !== null && typeof e === "object" && (e as { code?: string }).code === "P2002") {
      const existing = await db.song.findFirst({
        where: { ...scope(ctx), title: external.title, artist: external.artist },
        select: { id: true },
      });
      if (existing) return { added: false, reason: "duplicate", songId: existing.id };
    }
    throw e;
  }
}

async function create(
  ctx: ChurchContext,
  external: ExternalSong,
): Promise<AddResult> {
  const song = await db.song.create({
    data: {
      churchId: ctx.churchId,
      title: external.title,
      artist: external.artist,
      // Album is shown in search results as context but not stored: §13 of the
      // approved schema change did not add a column for it, and nothing in the
      // product reads one.
      externalProvider: external.provider,
      externalId: external.externalId,
      isrc: external.isrc ?? null,
      releaseYear: external.releaseYear ?? null,
      durationMs: external.durationMs ?? null,
      genres: external.genres ?? [],
      // Key and BPM come from the provider only when it genuinely has them.
      // MusicBrainz does not, so these stay empty for the user to fill in.
      defaultKey: external.defaultKey ?? null,
      churchKey: external.defaultKey ?? null,
      bpm: external.bpm ?? null,
      familiarity: "NEW",
      status: "ACTIVE",
      // lyrics is deliberately absent. Do not add it here.
    },
    select: { id: true },
  });

  return { added: true, songId: song.id };
}

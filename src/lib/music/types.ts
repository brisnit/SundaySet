import type { Genre } from "@/generated/prisma/enums";

/**
 * One song as a metadata provider describes it.
 *
 * Facts only. Titles, artists, dates and identifiers are factual and safe to
 * hold; lyrics, chords and artwork are not, and none of them appear here. That
 * omission is deliberate and load-bearing — see `addSongFromExternal`.
 *
 * `key` and `bpm` are optional because most legitimate metadata sources do not
 * carry them. A provider that cannot supply them leaves them undefined rather
 * than guessing: a wrong BPM is worse than a missing one, because a missing one
 * gets filled in and a wrong one gets played.
 */
export type ExternalSong = {
  /** Provider name, e.g. "musicbrainz". Stored so a result can be traced back. */
  provider: string;
  /** The provider's stable id for this recording. */
  externalId: string;
  title: string;
  artist: string;
  album?: string;
  releaseYear?: number;
  durationMs?: number;
  /** International Standard Recording Code, where the provider has one. */
  isrc?: string;
  /** Normalized to SetMeister's own enum. Raw provider tags never escape the adapter. */
  genres?: Genre[];
  defaultKey?: string;
  bpm?: number;
};

export type SearchOptions = {
  limit: number;
  signal?: AbortSignal;
};

/**
 * A source of song metadata.
 *
 * Deliberately one method. Everything a caller needs is a query in and
 * normalized results out, so swapping MusicBrainz for something else is a file,
 * not a refactor.
 */
export type SongSearchProvider = {
  readonly name: string;
  search(query: string, options: SearchOptions): Promise<ExternalSong[]>;
};

/** Thrown when a provider fails in a way worth telling the user about. */
export class SearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchError";
  }
}

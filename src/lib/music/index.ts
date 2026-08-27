import "server-only";

import type { Genre } from "@/generated/prisma/enums";
import { env } from "@/lib/env";

import { createMockProvider } from "./mock";
import { createMusicBrainzProvider } from "./musicbrainz";
import { SearchError, type ExternalSong, type SongSearchProvider } from "./types";

export { SearchError } from "./types";
export type { ExternalSong, SongSearchProvider } from "./types";

/**
 * Search results change slowly and repeat constantly — everyone typing
 * "purple rain" wants the same answer, and a person backspacing a character
 * asks for the previous query again. Ten minutes of memory keeps us well inside
 * the provider's rate limit and makes the second search of a session instant.
 *
 * Per-instance and in-memory on purpose: nothing here is worth a database
 * table, and nothing here should outlive a deploy.
 */
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 200;

type Entry = { at: number; results: ExternalSong[] };
const cache = new Map<string, Entry>();

function cacheKey(provider: string, query: string, limit: number) {
  return `${provider}:${limit}:${query.trim().toLowerCase()}`;
}

/** Exposed for tests. */
export function clearSearchCache() {
  cache.clear();
}

let provider: SongSearchProvider | undefined;

export function getSongSearch(): SongSearchProvider {
  if (provider) return provider;
  const contact = env().MUSICBRAINZ_CONTACT;
  provider = contact
    ? createMusicBrainzProvider(contact)
    : createMockProvider();
  return provider;
}

/** Exposed for tests, which swap providers between cases. */
export function __setSongSearch(next: SongSearchProvider | undefined) {
  provider = next;
  cache.clear();
}

/**
 * What the UI needs to know about search without knowing what search is.
 *
 * `usingDemoCatalogue` is true when no contact string is configured. Search
 * still works — it just answers from a small fixed list — so the page says so
 * rather than pretending to cover every song ever recorded.
 */
export function songSearchStatus() {
  const configured = Boolean(env().MUSICBRAINZ_CONTACT);
  return {
    available: true,
    usingDemoCatalogue: !configured,
    reason: configured
      ? null
      : "Set MUSICBRAINZ_CONTACT to search the full catalogue.",
  };
}

export type SearchOutcome =
  | { ok: true; results: ExternalSong[] }
  | { ok: false; message: string };

/**
 * Search, cached and never throwing.
 *
 * A provider outage has to leave the rest of Add Song working, so every failure
 * comes back as a message the page can render next to a form that still
 * submits. Nothing here escalates into a 500.
 */
export async function searchSongs(
  query: string,
  limit = 8,
): Promise<SearchOutcome> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { ok: true, results: [] };

  const search = getSongSearch();
  const key = cacheKey(search.name, trimmed, limit);

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ok: true, results: hit.results };

  try {
    const results = await search.search(trimmed, { limit });

    if (cache.size >= MAX_ENTRIES) {
      // Map preserves insertion order, so the oldest key is the first one.
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), results });

    return { ok: true, results };
  } catch (e) {
    if (e instanceof SearchError) return { ok: false, message: e.message };
    return { ok: false, message: "Song search is unavailable right now." };
  }
}

/**
 * Well-known songs in one genre.
 *
 * Same cache, same rate limit and the same promise never to throw: a genre
 * tile that cannot load says so and leaves the rest of the page working.
 */
export async function browseGenre(
  genre: Genre,
  limit = 24,
): Promise<SearchOutcome> {
  const search = getSongSearch();
  if (!search.browseGenre) {
    return { ok: false, message: "Browsing by genre is not available right now." };
  }

  const key = `${search.name}:genre:${limit}:${genre}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return { ok: true, results: hit.results };

  try {
    const results = await search.browseGenre(genre, { limit });
    if (cache.size >= MAX_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { at: Date.now(), results });
    return { ok: true, results };
  } catch (e) {
    if (e instanceof SearchError) return { ok: false, message: e.message };
    return { ok: false, message: "Browsing by genre is unavailable right now." };
  }
}

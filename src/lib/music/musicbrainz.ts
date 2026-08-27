import "server-only";

import { SearchError, type ExternalSong, type SearchOptions, type SongSearchProvider } from "./types";

const ENDPOINT = "https://musicbrainz.org/ws/2/work";

/**
 * MusicBrainz, searched by WORK rather than by recording.
 *
 * A work is a composition; a recording is one performance of it. SetMeister's
 * Song is a composition — a band plays "Purple Rain", not one specific master
 * of it — so work is the entity that matches, and it is also the only one that
 * ranks usefully.
 *
 * Recording search was tried first and cannot be made to work. MusicBrainz
 * holds every recording ever catalogued and carries no popularity data, so a
 * search for "Purple Rain" returns 305,000 hits with near-identical relevance
 * scores and Prince's original at rank 24, behind a string of covers and
 * karaoke tracks. Narrowing the query to official album releases pushed it out
 * of the top 25 entirely. Work search returns the right song first, every time.
 *
 * The cost of that choice is that a work credits its WRITERS, not its
 * performers. For most of what a band plays those are the same people, and
 * where they are not the credit is still true — which is why the UI says
 * "Written by" rather than passing a songwriter off as the recording artist.
 */

/**
 * MusicBrainz allows roughly one request per second per IP, and that budget
 * belongs to the whole server rather than to any one visitor — which is exactly
 * why search runs here and not in the browser. Requests queue behind this gate
 * instead of racing and being refused.
 */
let nextSlot = 0;
async function rateLimit(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1100;
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

/** Exposed for tests, which must not inherit a queue from an earlier case. */
export function resetRateLimit() {
  nextSlot = 0;
}

type MbRelation = {
  type?: string;
  artist?: { name?: string };
};

type MbWork = {
  id: string;
  title?: string;
  score?: number;
  disambiguation?: string;
  relations?: MbRelation[];
};

/**
 * Who the song is by.
 *
 * Composer first, then lyricist, then writer — a song usually credits several
 * people in each role and the first is the one anyone would name. Duplicates
 * are collapsed because MusicBrainz lists Prince twice for "Purple Rain", once
 * as composer and once as lyricist.
 */
function creditedWriter(relations: MbRelation[] | undefined): string {
  const names = (type: string) =>
    (relations ?? [])
      .filter((r) => r.type === type && r.artist?.name)
      .map((r) => r.artist!.name!);

  const ordered = [...names("composer"), ...names("lyricist"), ...names("writer")];

  // MusicBrainz uses a literal "[traditional]" placeholder artist for folk and
  // public-domain material. Printed as-is it looks like a bug.
  const unique = [...new Set(ordered)].map((n) =>
    n === "[traditional]" ? "Traditional" : n,
  );

  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0];
  // Two names read fine; beyond that a list stops being useful on a phone.
  if (unique.length === 2) return `${unique[0]} & ${unique[1]}`;
  return `${unique[0]} & others`;
}

function toExternalSong(work: MbWork): ExternalSong | null {
  const title = work.title?.trim();
  if (!title) return null;

  const artist = creditedWriter(work.relations);
  if (!artist) return null;

  return {
    provider: "musicbrainz",
    externalId: work.id,
    title,
    artist,
    // A work carries no release date, no album and no tags. Rather than invent
    // them from an arbitrary recording, they stay empty for the user to fill
    // in — the same way every song already in the library works.
  };
}

/**
 * Re-rank by how much of the query each result actually accounts for.
 *
 * MusicBrainz matches a bare multi-word query loosely across fields, so
 * "Jolene Dolly Parton" put a song *called* "Dolly Parton" above Jolene itself.
 * Counting how many of the query's words appear in the title or the credit
 * fixes that: Jolene by Dolly Parton accounts for all three, the impostor for
 * two. Ties fall back to the provider's own relevance score, which is what
 * keeps Prince ahead of the other "Purple Rain" writers.
 */
function words(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function rank(songs: Array<{ song: ExternalSong; score: number }>, query: string) {
  const wanted = new Set(words(query));
  if (wanted.size === 0) return songs.map((s) => s.song);

  const scored = songs
    .map((entry) => {
      const have = new Set(words(`${entry.song.title} ${entry.song.artist}`));
      let covered = 0;
      for (const w of wanted) if (have.has(w)) covered++;
      return { ...entry, coverage: covered / wanted.size };
    })
    .sort((a, b) => b.coverage - a.coverage || b.score - a.score);

  // Once something accounts for the whole query, anything that accounts for
  // less is noise. Searching "Purple Rain" otherwise returns Purple Haze and
  // four unrelated songs called "Purple" below the song you asked for — a
  // longer list that is worse at its job.
  const best = scored[0]?.coverage ?? 0;
  return scored.filter((e) => e.coverage >= best).map((e) => e.song);
}

/** Same song, same writer, listed twice. Keep the better-scoring one. */
function dedupe(songs: ExternalSong[]): ExternalSong[] {
  const seen = new Set<string>();
  const out: ExternalSong[] = [];
  for (const song of songs) {
    const key = `${song.title.toLowerCase()}|${song.artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(song);
  }
  return out;
}

export function createMusicBrainzProvider(contact: string): SongSearchProvider {
  const userAgent = `SetMeister/1.0 ( ${contact} )`;

  return {
    name: "musicbrainz",

    async search(query: string, { limit, signal }: SearchOptions) {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const url = new URL(ENDPOINT);
      url.searchParams.set("query", trimmed);
      url.searchParams.set("fmt", "json");
      // Ask for extra: deduplicating writers collapses the list, and works
      // without any writer credit are dropped entirely.
      url.searchParams.set("limit", String(Math.min(100, limit * 3)));

      // MusicBrainz answers 503 fairly readily even inside the documented rate,
      // and a single dropped connection is not worth surfacing either. Both get
      // one more go before the user is told anything.
      let res: Response | undefined;
      let networkFailed = false;
      for (let attempt = 0; attempt < 2; attempt++) {
        await rateLimit();
        networkFailed = false;
        try {
          res = await fetch(url, {
            headers: { "User-Agent": userAgent, Accept: "application/json" },
            signal: signal ?? AbortSignal.timeout(9000),
          });
        } catch {
          networkFailed = true;
          continue;
        }
        if (res.status !== 503) break;
      }

      if (networkFailed) {
        // A timeout or a dead network is not a bug in SetMeister, and the page
        // must keep working: the caller turns this into a message, not a 500.
        throw new SearchError("Song search is unreachable right now.");
      }
      if (!res || res.status === 503) {
        throw new SearchError("Song search is busy right now. Try again in a moment.");
      }
      if (!res.ok) {
        throw new SearchError("Song search is unavailable right now.");
      }

      const body = (await res.json()) as { works?: MbWork[] };
      const scored = (body.works ?? [])
        .map((work) => {
          const song = toExternalSong(work);
          return song ? { song, score: work.score ?? 0 } : null;
        })
        .filter((s): s is { song: ExternalSong; score: number } => s !== null);

      return dedupe(rank(scored, trimmed)).slice(0, limit);
    },
  };
}

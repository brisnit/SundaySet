import { afterEach, describe, expect, it, vi } from "vitest";

import { mapGenres } from "@/lib/music/genre-map";
import {
  artistsPlausiblyMatch,
  matchKey,
  normalizeArtist,
  normalizeTitle,
} from "@/lib/music/normalize";
import { createMockProvider, MOCK_CATALOGUE } from "@/lib/music/mock";
import { SearchError } from "@/lib/music/types";
import {
  clearSearchCache,
  searchSongs,
  __setSongSearch,
} from "@/lib/music";

afterEach(() => {
  __setSongSearch(undefined);
  clearSearchCache();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Normalization — the fiddly part, and where duplicate detection lives or dies
// ---------------------------------------------------------------------------

describe("title normalization", () => {
  const same = (a: string, b: string) =>
    expect(normalizeTitle(a)).toBe(normalizeTitle(b));

  it("ignores case and punctuation", () => {
    same("Purple Rain", "purple rain!");
    same("Don't Stop Believin'", "Dont Stop Believin");
  });

  it("treats curly and straight apostrophes as the same character", () => {
    same("Don’t Stop", "Don't Stop");
  });

  it("strips diacritics", () => {
    same("Créep", "Creep");
  });

  it("drops qualifiers that do not change which song it is", () => {
    same("Purple Rain (Live)", "Purple Rain");
    same("Purple Rain [Remastered 2015]", "Purple Rain");
    same("Purple Rain - 2015 Remaster", "Purple Rain");
    same("Purple Rain (Radio Edit)", "Purple Rain");
    same("Purple Rain (feat. Someone)", "Purple Rain");
  });

  it("keeps genuinely different titles apart", () => {
    expect(normalizeTitle("Purple Rain")).not.toBe(normalizeTitle("Purple Haze"));
    // A parenthetical that is part of the name is not noise.
    expect(normalizeTitle("Sign o' the Times")).not.toBe(normalizeTitle("Sign"));
  });
});

describe("artist normalization", () => {
  it("collapses ampersands and the leading article", () => {
    expect(normalizeArtist("Simon & Garfunkel")).toBe(
      normalizeArtist("Simon and Garfunkel"),
    );
    expect(normalizeArtist("The Beatles")).toBe(normalizeArtist("Beatles"));
  });

  it("drops featured credits", () => {
    expect(normalizeArtist("Prince feat. Someone")).toBe(normalizeArtist("Prince"));
    expect(normalizeArtist("Prince ft. Someone")).toBe(normalizeArtist("Prince"));
  });

  it("keeps different artists apart", () => {
    expect(normalizeArtist("Prince")).not.toBe(normalizeArtist("Prince Royce"));
  });
});

describe("matchKey", () => {
  it("pairs title and artist, tolerating a missing artist", () => {
    expect(matchKey("Purple Rain", "Prince")).toBe(
      matchKey("Purple Rain (Live)", "Prince"),
    );
    expect(matchKey("Purple Rain", null)).not.toBe(matchKey("Purple Rain", "Prince"));
  });
});

describe("plausible artist matching", () => {
  it("accepts a credit that adds co-writers to the performer", () => {
    // The case that mattered: the library credits who plays it, the provider
    // credits who wrote it.
    expect(artistsPlausiblyMatch("Phil Wickham", "Phil Wickham & Jonathan Smith")).toBe(true);
    expect(artistsPlausiblyMatch("Prince", "Prince")).toBe(true);
  });

  it("rejects two genuinely different acts", () => {
    expect(artistsPlausiblyMatch("Dolly Parton", "Ray LaMontagne")).toBe(false);
    expect(artistsPlausiblyMatch("Prince", "Jimi Hendrix")).toBe(false);
  });

  it("does not match on a shared filler word alone", () => {
    expect(artistsPlausiblyMatch("The Worship Band", "Worship Collective")).toBe(false);
  });

  it("treats an unattributed side as plausible, since the title is all there is", () => {
    expect(artistsPlausiblyMatch(null, "Prince")).toBe(true);
    expect(artistsPlausiblyMatch("Prince", "")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Genre mapping — provider tags must never reach the database raw
// ---------------------------------------------------------------------------

describe("genre mapping", () => {
  it("maps tags it recognises onto our enum", () => {
    expect(mapGenres(["rock"])).toContain("ROCK");
    expect(mapGenres(["hip hop"])).toContain("HIP_HOP");
    expect(mapGenres(["hip-hop"])).toContain("HIP_HOP");
    expect(mapGenres(["r&b"])).toContain("RNB");
  });

  it("prefers the more specific match", () => {
    expect(mapGenres(["synth-pop"])).toEqual(["ELECTRONIC"]);
    expect(mapGenres(["alt-rock"])).toEqual(["ALTERNATIVE"]);
  });

  it("drops anything it does not recognise rather than guessing", () => {
    expect(mapGenres(["melodic death metal from finland"])).toEqual(["ROCK"]);
    expect(mapGenres(["zzzz not a genre"])).toEqual([]);
    expect(mapGenres([""])).toEqual([]);
  });

  it("caps the list so a card stays readable", () => {
    expect(
      mapGenres(["rock", "pop", "jazz", "blues", "folk", "country"]).length,
    ).toBeLessThanOrEqual(4);
  });
});

// ---------------------------------------------------------------------------
// The search surface
// ---------------------------------------------------------------------------

describe("searchSongs", () => {
  it("returns nothing for a query too short to be meaningful", async () => {
    __setSongSearch(createMockProvider());
    expect(await searchSongs("a")).toEqual({ ok: true, results: [] });
  });

  it("finds by title or by artist", async () => {
    __setSongSearch(createMockProvider());
    const byTitle = await searchSongs("purple rain");
    expect(byTitle.ok && byTitle.results[0].title).toBe("Purple Rain");

    const byArtist = await searchSongs("dolly");
    expect(byArtist.ok && byArtist.results[0].artist).toBe("Dolly Parton");
  });

  it("caches, so a repeated query does not hit the provider twice", async () => {
    const search = vi.fn(async () => MOCK_CATALOGUE.slice(0, 1));
    __setSongSearch({ name: "spy", search });

    await searchSongs("purple rain");
    await searchSongs("Purple Rain");
    await searchSongs("  purple rain  ");

    expect(search).toHaveBeenCalledTimes(1);
  });

  // A provider outage must leave Add Song working, so nothing here throws.
  it("turns a provider failure into a message rather than an exception", async () => {
    __setSongSearch({
      name: "broken",
      search: async () => {
        throw new SearchError("Song search is unreachable right now.");
      },
    });
    const outcome = await searchSongs("anything");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.message).toMatch(/unreachable/i);
  });

  it("survives a provider that throws something unexpected", async () => {
    __setSongSearch({
      name: "worse",
      search: async () => {
        throw new TypeError("undefined is not a function");
      },
    });
    const outcome = await searchSongs("anything");
    expect(outcome.ok).toBe(false);
  });

  it("does not cache a failure", async () => {
    let calls = 0;
    __setSongSearch({
      name: "flaky",
      search: async () => {
        calls++;
        if (calls === 1) throw new SearchError("down");
        return MOCK_CATALOGUE.slice(0, 1);
      },
    });
    expect((await searchSongs("purple rain")).ok).toBe(false);
    expect((await searchSongs("purple rain")).ok).toBe(true);
    expect(calls).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Nothing a provider returns may carry lyrics
// ---------------------------------------------------------------------------

describe("provider results", () => {
  it("has no lyrics field anywhere in the mock catalogue", () => {
    for (const song of MOCK_CATALOGUE) {
      expect(Object.keys(song)).not.toContain("lyrics");
    }
  });
});

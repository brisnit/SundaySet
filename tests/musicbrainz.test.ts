import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMusicBrainzProvider, resetRateLimit } from "@/lib/music/musicbrainz";
import { SearchError } from "@/lib/music/types";

/**
 * The provider is tested against a stubbed fetch rather than the live service.
 *
 * MusicBrainz allows one request a second, so a test suite that called it for
 * real would be slow, flaky and rude. The fixtures below are trimmed from
 * actual responses.
 */

const work = (over: Record<string, unknown> = {}) => ({
  id: "work-1",
  title: "Purple Rain",
  score: 100,
  type: "Song",
  relations: [
    { type: "lyricist", artist: { name: "Prince" } },
    { type: "composer", artist: { name: "Prince" } },
    { type: "performance" },
  ],
  ...over,
});

function stubFetch(...responses: Array<{ status: number; body?: unknown }>) {
  const calls: string[] = [];
  let i = 0;
  const fn = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push(String(input));
    void init;
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body ?? {},
    } as Response;
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}

const provider = () => createMusicBrainzProvider("test@example.com");

beforeEach(() => resetRateLimit());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetRateLimit();
});

describe("musicbrainz provider", () => {
  it("identifies itself, because anonymous agents get throttled", async () => {
    const { fn } = stubFetch({ status: 200, body: { works: [work()] } });
    await provider().search("purple rain", { limit: 5 });

    const headers = fn.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers["User-Agent"]).toContain("SetMeister");
    expect(headers["User-Agent"]).toContain("test@example.com");
  });

  it("searches works, not recordings", async () => {
    const { calls } = stubFetch({ status: 200, body: { works: [work()] } });
    await provider().search("purple rain", { limit: 5 });
    expect(calls[0]).toContain("/ws/2/work");
    expect(calls[0]).not.toContain("/ws/2/recording");
  });

  it("credits the writer, collapsing the same person listed twice", async () => {
    stubFetch({ status: 200, body: { works: [work()] } });
    const [song] = await provider().search("purple rain", { limit: 5 });
    expect(song.artist).toBe("Prince");
    expect(song.title).toBe("Purple Rain");
    expect(song.externalId).toBe("work-1");
    expect(song.provider).toBe("musicbrainz");
  });

  it("joins two writers and summarises more than two", async () => {
    const two = work({
      relations: [
        { type: "composer", artist: { name: "Phil Wickham" } },
        { type: "composer", artist: { name: "Jonathan Smith" } },
      ],
    });
    const many = work({
      id: "w2",
      relations: ["A", "B", "C", "D"].map((n) => ({
        type: "composer",
        artist: { name: n },
      })),
    });
    stubFetch({ status: 200, body: { works: [two] } });
    expect((await provider().search("q", { limit: 5 }))[0].artist).toBe(
      "Phil Wickham & Jonathan Smith",
    );

    resetRateLimit();
    stubFetch({ status: 200, body: { works: [many] } });
    expect((await provider().search("q", { limit: 5 }))[0].artist).toBe("A & others");
  });

  it("renders the [traditional] placeholder as a word, not a bug", async () => {
    stubFetch({
      status: 200,
      body: {
        works: [
          work({ title: "Amazing Grace", relations: [{ type: "composer", artist: { name: "[traditional]" } }] }),
        ],
      },
    });
    expect((await provider().search("amazing grace", { limit: 5 }))[0].artist).toBe(
      "Traditional",
    );
  });

  it("drops works with no writer credit rather than showing a blank artist", async () => {
    stubFetch({
      status: 200,
      body: { works: [work({ relations: [{ type: "performance" }] }), work({ id: "w2" })] },
    });
    const results = await provider().search("purple rain", { limit: 5 });
    expect(results).toHaveLength(1);
    expect(results[0].externalId).toBe("w2");
  });

  // The bug that made "Jolene Dolly Parton" rank a song called "Dolly Parton"
  // above Jolene itself.
  it("ranks the result that accounts for more of the query first", async () => {
    stubFetch({
      status: 200,
      body: {
        works: [
          work({ id: "impostor", title: "Dolly Parton", score: 100,
                 relations: [{ type: "composer", artist: { name: "Yuko" } }] }),
          work({ id: "real", title: "Jolene", score: 92,
                 relations: [{ type: "composer", artist: { name: "Dolly Parton" } }] }),
        ],
      },
    });
    const results = await provider().search("Jolene Dolly Parton", { limit: 5 });
    expect(results[0].externalId).toBe("real");
  });

  it("falls back to the provider's own score when coverage ties", async () => {
    stubFetch({
      status: 200,
      body: {
        works: [
          work({ id: "low", score: 80, relations: [{ type: "composer", artist: { name: "Someone" } }] }),
          work({ id: "high", score: 100, relations: [{ type: "composer", artist: { name: "Prince" } }] }),
        ],
      },
    });
    const results = await provider().search("Purple Rain", { limit: 5 });
    expect(results[0].externalId).toBe("high");
  });

  it("collapses the same song credited to the same writer twice", async () => {
    stubFetch({ status: 200, body: { works: [work(), work({ id: "dupe" })] } });
    expect(await provider().search("purple rain", { limit: 5 })).toHaveLength(1);
  });

  it("honours the limit", async () => {
    const works = Array.from({ length: 20 }, (_, i) =>
      work({ id: `w${i}`, title: `Song ${i}` }),
    );
    stubFetch({ status: 200, body: { works } });
    expect(await provider().search("song", { limit: 3 })).toHaveLength(3);
  });

  it("retries a 503, because it means try again rather than it failed", async () => {
    const { fn } = stubFetch(
      { status: 503 },
      { status: 200, body: { works: [work()] } },
    );
    const results = await provider().search("purple rain", { limit: 5 });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
  });

  it("gives up on a persistent 503 with a message a person can act on", async () => {
    stubFetch({ status: 503 }, { status: 503 });
    await expect(provider().search("q", { limit: 5 })).rejects.toBeInstanceOf(SearchError);
    await expect(provider().search("q", { limit: 5 })).rejects.toThrow(/busy/i);
  });

  it("reports an unreachable service rather than crashing the page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("network"); }));
    await expect(provider().search("q", { limit: 5 })).rejects.toThrow(/unreachable/i);
  });

  it("returns nothing for a blank query without calling out at all", async () => {
    const { fn } = stubFetch({ status: 200, body: { works: [work()] } });
    expect(await provider().search("   ", { limit: 5 })).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it("never produces a lyrics field", async () => {
    stubFetch({ status: 200, body: { works: [work()] } });
    const [song] = await provider().search("purple rain", { limit: 5 });
    expect(Object.keys(song)).not.toContain("lyrics");
  });

  it("leaves key and BPM undefined — MusicBrainz does not carry them", async () => {
    stubFetch({ status: 200, body: { works: [work()] } });
    const [song] = await provider().search("purple rain", { limit: 5 });
    expect(song.defaultKey).toBeUndefined();
    expect(song.bpm).toBeUndefined();
  });
});

describe("result tightening", () => {
  it("drops partial matches once something accounts for the whole query", async () => {
    stubFetch({
      status: 200,
      body: {
        works: [
          work({ id: "full", title: "Purple Rain", score: 100,
                 relations: [{ type: "composer", artist: { name: "Prince" } }] }),
          work({ id: "partial", title: "Purple Haze", score: 100,
                 relations: [{ type: "composer", artist: { name: "Jimi Hendrix" } }] }),
          work({ id: "weak", title: "Purple", score: 100,
                 relations: [{ type: "composer", artist: { name: "Someone" } }] }),
        ],
      },
    });
    const results = await provider().search("Purple Rain", { limit: 8 });
    expect(results.map((r) => r.externalId)).toEqual(["full"]);
  });

  it("keeps everything when nothing accounts for more than anything else", async () => {
    stubFetch({
      status: 200,
      body: {
        works: [
          work({ id: "a", title: "Purple Rain", relations: [{ type: "composer", artist: { name: "Prince" } }] }),
          work({ id: "b", title: "Purple Rain", relations: [{ type: "composer", artist: { name: "Someone Else" } }] }),
        ],
      },
    });
    const results = await provider().search("Purple Rain", { limit: 8 });
    expect(results).toHaveLength(2);
  });
});

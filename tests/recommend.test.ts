import { describe, expect, it } from "vitest";

import {
  findSimilar,
  scoreCandidate,
  type Candidate,
  type ChurchTaste,
} from "@/lib/domain/recommend";

const taste: ChurchTaste = {
  preferredArtists: ["Phil Wickham", "Elevation Worship"],
  avoidArtists: ["Loud Band"],
  avoidSongs: ["A Song We Dislike"],
  difficulty: "MODERATE",
  libraryThemes: ["faithfulness", "grace", "hope", "praise"],
  libraryArtists: ["Chris Tomlin", "Hillsong Worship"],
};

const base: Candidate = {
  id: "c1",
  title: "Some New Song",
  artist: "Unknown Artist",
  themes: ["faithfulness"],
  songTypes: ["MID_TEMPO"],
  difficulty: "MODERATE",
  popularity: 50,
};

describe("scoreCandidate", () => {
  it("vetoes an avoided artist outright, however popular", () => {
    const r = scoreCandidate(
      { ...base, artist: "Loud Band", popularity: 100 },
      taste,
    );
    expect(r.score).toBe(0);
    expect(r.reasons).toEqual(["On your avoid list"]);
  });

  it("vetoes an avoided song by title", () => {
    expect(
      scoreCandidate({ ...base, title: "A Song We Dislike" }, taste).score,
    ).toBe(0);
  });

  it("rewards a preferred artist more than one merely in the library", () => {
    const preferred = scoreCandidate({ ...base, artist: "Phil Wickham" }, taste);
    const known = scoreCandidate({ ...base, artist: "Chris Tomlin" }, taste);
    expect(preferred.score).toBeGreaterThan(known.score);
    expect(known.score).toBeGreaterThan(scoreCandidate(base, taste).score);
  });

  it("rewards overlap with themes the church already sings", () => {
    const many = scoreCandidate(
      { ...base, themes: ["faithfulness", "grace", "hope"] },
      taste,
    );
    const none = scoreCandidate({ ...base, themes: ["obscure"] }, taste);
    expect(many.score).toBeGreaterThan(none.score);
    expect(many.reasons.join(" ")).toMatch(/faithfulness/);
  });

  it("flags a song harder than the church usually plays", () => {
    const r = scoreCandidate({ ...base, difficulty: "ADVANCED" }, {
      ...taste,
      difficulty: "SIMPLE",
    });
    expect(r.reasons.join(" ")).toMatch(/harder/i);
  });

  it("keeps popularity a weak signal on its own", () => {
    // A globally popular song that fits nothing about this church should not
    // read as a strong match.
    const r = scoreCandidate(
      { ...base, popularity: 100, themes: ["obscure"], artist: "Nobody" },
      taste,
    );
    expect(r.score).toBeLessThan(50);
  });

  it("never leaves the 0-100 range", () => {
    const best = scoreCandidate(
      {
        ...base,
        artist: "Phil Wickham",
        popularity: 100,
        themes: ["faithfulness", "grace", "hope", "praise"],
        songTypes: ["HYMN"],
      },
      taste,
    );
    expect(best.score).toBeGreaterThan(80);
    expect(best.score).toBeLessThanOrEqual(100);
  });
});

describe("findSimilar", () => {
  const library = [
    { title: "Goodness of God", themes: ["faithfulness", "goodness"] },
    { title: "Same God", themes: ["faithfulness", "prayer"] },
    { title: "House of the Lord", themes: ["joy"] },
  ];

  it("ranks by number of shared themes", () => {
    expect(
      findSimilar({ themes: ["faithfulness", "prayer"] }, library),
    ).toEqual(["Same God", "Goodness of God"]);
  });

  it("excludes songs with nothing in common", () => {
    expect(findSimilar({ themes: ["joy"] }, library)).toEqual([
      "House of the Lord",
    ]);
  });

  it("returns nothing when there is no overlap", () => {
    expect(findSimilar({ themes: ["nothing"] }, library)).toEqual([]);
  });
});

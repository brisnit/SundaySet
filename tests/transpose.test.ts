import { describe, expect, it } from "vitest";

import {
  formatChord,
  keyPitch,
  parseChord,
  parseNote,
  semitonesBetween,
  spellingForKey,
} from "@/lib/music/chords";
import {
  chordToNashville,
  isChordRow,
  nashvilleChordRow,
  nashvilleSections,
  resolveDisplayKey,
  transposeChartText,
  transposeChord,
  transposeChordRow,
  transposeSections,
} from "@/lib/music/transpose";

// ---------------------------------------------------------------------------
// Parsing — what counts as a chord and, more importantly, what does not
// ---------------------------------------------------------------------------

describe("parseChord", () => {
  const ok = (t: string) => expect(parseChord(t), t).not.toBeNull();
  const no = (t: string) => expect(parseChord(t), t).toBeNull();

  it("reads plain triads", () => {
    ["C", "G", "F#", "Bb", "A", "Eb"].forEach(ok);
  });

  it("reads minors, sevenths and extensions", () => {
    ["Am", "Cmaj7", "G7", "Dm7", "F#m7b5", "C13", "Bdim", "Caug", "E7#9",
     "Amaj9", "Gsus4", "Dsus2", "Cadd9", "Bm11", "F°7", "C+", "Cmin",
     "Gmajor", "Dminor", "Cno3", "Galt"].forEach(ok);
  });

  it("reads slash chords", () => {
    const c = parseChord("C#m7/G#");
    expect(c).not.toBeNull();
    expect(c!.quality).toBe("m7");
    expect(c!.bassPitch).toBe(keyPitch("G#"));
  });

  it("refuses ordinary words that happen to start with a note letter", () => {
    ["Go", "And", "Every", "Fall", "Give", "Be", "Come", "Deep", "Away"].forEach(no);
  });

  it("refuses chart furniture", () => {
    ["N.C.", "x2", "|", "D.C.", "(x4)", "Chorus", "Riff", "-", "%"].forEach(no);
  });

  it("refuses lower-case roots, which are lyrics", () => {
    ["c", "am", "g7"].forEach(no);
  });

  it("refuses a broken slash", () => {
    ["C/", "C/x", "C/H"].forEach(no);
  });

  it("accepts unicode accidentals", () => {
    expect(parseChord("F♯m")?.rootPitch).toBe(parseChord("F#m")?.rootPitch);
    expect(parseChord("B♭")?.rootPitch).toBe(parseChord("Bb")?.rootPitch);
  });
});

describe("parseNote", () => {
  it("maps enharmonics to the same pitch", () => {
    expect(parseNote("C#")).toBe(parseNote("Db"));
    expect(parseNote("E#")).toBe(parseNote("F"));
    expect(parseNote("Cb")).toBe(parseNote("B"));
    expect(parseNote("B#")).toBe(parseNote("C"));
  });
  it("rejects non-notes", () => {
    ["H", "", "x", "Cmaj"].forEach((t) => expect(parseNote(t), t).toBeNull());
  });
});

// ---------------------------------------------------------------------------
// Spelling
// ---------------------------------------------------------------------------

describe("enharmonic spelling", () => {
  it("takes its lead from the key you chose", () => {
    expect(spellingForKey("Eb")).toBe("flat");
    expect(spellingForKey("D#")).toBe("sharp");
    expect(spellingForKey("Bb")).toBe("flat");
    expect(spellingForKey("A")).toBe("sharp");
  });

  it("treats F as the one natural key that takes flats", () => {
    expect(spellingForKey("F")).toBe("flat");
    expect(spellingForKey("C")).toBe("sharp");
    expect(spellingForKey("G")).toBe("sharp");
  });

  it("reads a minor key the same way as its letter", () => {
    expect(spellingForKey("Ebm")).toBe("flat");
    expect(spellingForKey("F#m")).toBe("sharp");
    expect(spellingForKey("Dm")).toBe("sharp");
  });

  // The whole point: a chart should never be full of theory-correct ugliness.
  it("never produces E#, B#, Cb or Fb", () => {
    const keys = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb",
                  "G", "G#", "Ab", "A", "A#", "Bb", "B"];
    for (const from of keys) {
      for (const to of keys) {
        const semis = semitonesBetween(from, to)!;
        const row = transposeChordRow("C C# D Eb E F F# G Ab A Bb B", semis, spellingForKey(to));
        expect(row, `${from} -> ${to}`).not.toMatch(/\b(E#|B#|Cb|Fb)\b/);
        expect(row, `${from} -> ${to}`).not.toMatch(/(##|bb)/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Transposing chords
// ---------------------------------------------------------------------------

describe("transposeChord", () => {
  it("moves the root and keeps everything else", () => {
    expect(transposeChord("Cmaj7", 2, "sharp")).toBe("Dmaj7");
    expect(transposeChord("Am", 3, "sharp")).toBe("Cm");
    expect(transposeChord("F#m7b5", 1, "sharp")).toBe("Gm7b5");
    expect(transposeChord("G13#11", 5, "sharp")).toBe("C13#11");
    expect(transposeChord("Bsus4", 1, "sharp")).toBe("Csus4");
  });

  // The example from the brief.
  it("moves a slash chord's root and bass together", () => {
    expect(transposeChord("C#m7/G#", 2, "sharp")).toBe("D#m7/A#");
    expect(transposeChord("C#m7/G#", 2, "flat")).toBe("Ebm7/Bb");
    expect(transposeChord("C/G", 5, "sharp")).toBe("F/C");
    expect(transposeChord("D/F#", -2, "flat")).toBe("C/E");
  });

  it("wraps around the octave", () => {
    expect(transposeChord("B", 1, "sharp")).toBe("C");
    expect(transposeChord("C", -1, "flat")).toBe("B");
    expect(transposeChord("A", 12, "sharp")).toBe("A");
  });

  it("leaves a quality containing accidentals alone", () => {
    expect(transposeChord("C7b9", 2, "sharp")).toBe("D7b9");
    expect(transposeChord("Cmaj7#5", 2, "sharp")).toBe("Dmaj7#5");
  });

  it("returns null rather than mangling a non-chord", () => {
    expect(transposeChord("N.C.", 2, "sharp")).toBeNull();
    expect(transposeChord("Go", 2, "sharp")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Rows — where the alignment lives
// ---------------------------------------------------------------------------

describe("transposeChordRow", () => {
  it("transposes every chord in a row", () => {
    expect(transposeChordRow("C  F  G", 2, "sharp")).toBe("D  G  A");
  });

  it("keeps chords over the same columns when the names are the same width", () => {
    const row = "G      D/F#   Em";
    const out = transposeChordRow(row, 2, "sharp");
    expect(out).toBe("A      E/G#   F#m");
    expect(out.indexOf("E/G#")).toBe(row.indexOf("D/F#"));
  });

  it("pads back out when a chord gets shorter", () => {
    // C# (2 chars) down to C (1 char): the next chord must not drift left.
    const row = "C#     F#";
    const out = transposeChordRow(row, -1, "sharp");
    expect(out).toBe("C      F");
    expect(out.indexOf("F")).toBe(row.indexOf("F#"));
  });

  it("gives up the least possible space when a chord gets longer", () => {
    const row = "C D";
    const out = transposeChordRow(row, 1, "sharp");
    // C#/D# both grow; the single separating space is preserved.
    expect(out).toBe("C# D#");
  });

  it("never lets two chords run together", () => {
    const out = transposeChordRow("C D E F G A B", 1, "sharp");
    expect(out).not.toMatch(/[A-G][#b][A-G]/);
    expect(out.split(/\s+/).filter(Boolean)).toHaveLength(7);
  });

  it("preserves leading indentation", () => {
    expect(transposeChordRow("    C   G", 2, "sharp")).toBe("    D   A");
  });

  it("leaves bar lines and repeat marks in place", () => {
    expect(transposeChordRow("| C | G | Am | F |", 2, "sharp")).toBe(
      "| D | A | Bm | G |",
    );
    expect(transposeChordRow("C  G  (x2)", 2, "sharp")).toBe("D  A  (x2)");
    expect(transposeChordRow("N.C.   C", 2, "sharp")).toBe("N.C.   D");
  });

  it("returns a row with nothing recognisable completely untouched", () => {
    const row = "   this is not a chart at all   ";
    expect(transposeChordRow(row, 5, "sharp")).toBe(row);
  });

  it("handles an empty row", () => {
    expect(transposeChordRow("", 2, "sharp")).toBe("");
    expect(transposeChordRow("   ", 2, "sharp")).toBe("   ");
  });

  it("re-spells without moving when the interval is zero", () => {
    expect(transposeChordRow("C# F#", 0, "flat")).toBe("Db Gb");
  });
});

// ---------------------------------------------------------------------------
// Whole charts
// ---------------------------------------------------------------------------

const chart = () => [
  {
    label: "Verse 1",
    lines: [
      { chords: "G       C       D", lyrics: "Amazing grace how sweet" },
      { chords: "Em      C       G", lyrics: "the sound that saved" },
    ],
  },
  {
    label: "Chorus",
    lines: [
      { chords: "C/E     G/B     Am7", lyrics: "was blind but now" },
      { chords: "", lyrics: "a line with no chords" },
    ],
  },
];

describe("transposeSections", () => {
  it("moves every chord and no lyric", () => {
    const out = transposeSections(chart(), "G", "A");
    expect(out[0].lines[0].chords).toBe("A       D       E");
    expect(out[1].lines[0].chords).toBe("D/F#    A/C#    Bm7");

    const before = chart();
    out.forEach((s, i) =>
      s.lines.forEach((l, j) =>
        expect(l.lyrics).toBe(before[i].lines[j].lyrics),
      ),
    );
  });

  it("writes flats when the target key is flat", () => {
    const out = transposeSections(chart(), "G", "Eb");
    expect(out[0].lines[0].chords).toBe("Eb      Ab      Bb");
  });

  it("writes sharps when the target key is sharp", () => {
    const out = transposeSections(chart(), "G", "D#");
    expect(out[0].lines[0].chords).toBe("D#      G#      A#");
  });

  it("does nothing at all when a key is missing or unreadable", () => {
    expect(transposeSections(chart(), null, "A")).toEqual(chart());
    expect(transposeSections(chart(), "G", null)).toEqual(chart());
    expect(transposeSections(chart(), "G", "Sunshine")).toEqual(chart());
    expect(transposeSections(chart(), "", "")).toEqual(chart());
  });

  it("returns the same chart when the key has not changed", () => {
    expect(transposeSections(chart(), "G", "G")).toEqual(chart());
  });

  it("handles minor keys by their letter", () => {
    const out = transposeSections(chart(), "Em", "F#m");
    expect(out[0].lines[0].chords).toBe("A       D       E");
  });

  it("round-trips back to where it started", () => {
    const there = transposeSections(chart(), "G", "B");
    const back = transposeSections(there, "B", "G");
    expect(back).toEqual(chart());
  });
});

// ---------------------------------------------------------------------------
// Nashville numbers
// ---------------------------------------------------------------------------

describe("nashville numbers", () => {
  const tonicOf = (k: string) => semitonesBetween("C", k)!;

  it("numbers the degrees of the key", () => {
    const g = tonicOf("G");
    expect(chordToNashville("G", g)).toBe("1");
    expect(chordToNashville("Am", g)).toBe("2m");
    expect(chordToNashville("C", g)).toBe("4");
    expect(chordToNashville("D7", g)).toBe("57");
    expect(chordToNashville("Em", g)).toBe("6m");
  });

  it("marks chords from outside the key with an accidental", () => {
    const c = tonicOf("C");
    expect(chordToNashville("Bb", c)).toBe("b7");
    expect(chordToNashville("Eb", c)).toBe("b3");
    expect(chordToNashville("F#dim", c)).toBe("b5dim");
  });

  it("numbers a slash bass too", () => {
    expect(chordToNashville("C/E", tonicOf("C"))).toBe("1/3");
    expect(chordToNashville("G/B", tonicOf("G"))).toBe("1/3");
  });

  it("keeps alignment and leaves non-chords alone", () => {
    expect(nashvilleChordRow("| G | C | D |", tonicOf("G"))).toBe("| 1 | 4 | 5 |");
    expect(nashvilleChordRow("N.C.  G", tonicOf("G"))).toBe("N.C.  1");
  });

  it("does not touch lyrics", () => {
    const out = nashvilleSections(chart(), "G");
    expect(out[0].lines[0].lyrics).toBe("Amazing grace how sweet");
    expect(out[0].lines[0].chords).toBe("1       4       5");
  });

  it("does nothing without a key", () => {
    expect(nashvilleSections(chart(), null)).toEqual(chart());
  });
});

// ---------------------------------------------------------------------------
// Which key wins
// ---------------------------------------------------------------------------

describe("resolveDisplayKey", () => {
  it("prefers the set, then the chart, then the song", () => {
    expect(resolveDisplayKey({ setKey: "A", chartKey: "G", songKey: "F" })).toBe("A");
    expect(resolveDisplayKey({ setKey: null, chartKey: "G", songKey: "F" })).toBe("G");
    expect(resolveDisplayKey({ setKey: null, chartKey: null, songKey: "F" })).toBe("F");
    expect(resolveDisplayKey({})).toBeNull();
  });

  it("ignores blank strings, which forms are full of", () => {
    expect(resolveDisplayKey({ setKey: "  ", chartKey: "G" })).toBe("G");
  });
});

// ---------------------------------------------------------------------------
// Nothing is ever silently damaged
// ---------------------------------------------------------------------------

describe("safety", () => {
  const nasty = [
    "", "   ", "N.C.", "|", "|| : C : ||", "x2", "(x4)", "D.S. al Coda",
    "Repeat 3x", "let ring", "Capo 2", "→", "C  —  G", "??", "Verse 1:",
    "1. C", "[Intro]", "8 bars", "Ab/// Bb///", "%", "C.G.D.A.E",
  ];

  it("never loses characters it does not understand", () => {
    for (const row of nasty) {
      const out = transposeChordRow(row, 3, "sharp");
      // Every non-chord word survives verbatim.
      for (const word of row.split(/\s+/).filter(Boolean)) {
        if (parseChord(word) === null) expect(out, row).toContain(word);
      }
    }
  });

  it("is stable when applied twice through the same total interval", () => {
    const once = transposeChordRow("C  Am  F  G7", 7, "sharp");
    const twice = transposeChordRow(
      transposeChordRow("C  Am  F  G7", 3, "sharp"),
      4,
      "sharp",
    );
    expect(twice).toBe(once);
  });

  it("survives a chord row much longer than its lyric row", () => {
    const row = "C" + " ".repeat(200) + "G";
    const out = transposeChordRow(row, 2, "sharp");
    expect(out).toBe("D" + " ".repeat(200) + "A");
  });

  it("formats what it parses, for every chord in every key", () => {
    const roots = ["C", "C#", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    const qualities = ["", "m", "7", "maj7", "m7", "sus4", "dim", "aug", "add9", "m7b5", "13"];
    for (const r of roots) {
      for (const q of qualities) {
        const chord = parseChord(`${r}${q}`);
        expect(chord, `${r}${q}`).not.toBeNull();
        const out = formatChord(chord!, "sharp");
        expect(parseChord(out), out).not.toBeNull();
        expect(out.endsWith(q)).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Editing free text — the editor works on a block, not on parsed lines
// ---------------------------------------------------------------------------

describe("isChordRow", () => {
  it("recognises rows of chords", () => {
    [
      "G       C       D",
      "Am",
      "| C | G | Am | F |",
      "C/E  G/B  Am7",
      "G  D  Em  C   (x2)",
    ].forEach((r) => expect(isChordRow(r), r).toBe(true));
  });

  it("does not mistake lyrics for chords", () => {
    [
      "Amazing grace how sweet the sound",
      "A long time ago in a place far away",
      "And can it be that I should gain",
      "Be Thou my vision",
      "Come thou fount of every blessing",
      "",
      "   ",
      "How great is our God",
    ].forEach((r) => expect(isChordRow(r), r).toBe(false));
  });

  // The specific trap: a lyric line starting with a capital A.
  it("refuses a lyric that merely begins with a chord-shaped word", () => {
    expect(isChordRow("A long time ago")).toBe(false);
  });
});

describe("transposeChartText", () => {
  const body = [
    "G       C       D",
    "Amazing grace how sweet the sound",
    "Em      C       G",
    "That saved a wretch like me",
  ].join("\n");

  it("rewrites the chord rows and nothing else", () => {
    const out = transposeChartText(body, 2, "sharp");
    expect(out.split("\n")).toEqual([
      "A       D       E",
      "Amazing grace how sweet the sound",
      "F#m     D       A",
      "That saved a wretch like me",
    ]);
  });

  it("keeps blank lines and line count exactly", () => {
    const withGaps = "G\n\nC\n\n\nD";
    const out = transposeChartText(withGaps, 2, "sharp");
    expect(out.split("\n")).toEqual(["A", "", "D", "", "", "E"]);
  });

  it("leaves a body with no chords completely alone", () => {
    const words = "just some words\nand some more";
    expect(transposeChartText(words, 5, "sharp")).toBe(words);
  });

  it("handles an empty body", () => {
    expect(transposeChartText("", 2, "sharp")).toBe("");
  });
});

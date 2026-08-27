/**
 * Reading and writing chord symbols.
 *
 * Pure functions over strings — no database, no React, no formatting opinions
 * beyond the notation itself. Everything in the transposition engine is built
 * on top of this file.
 *
 * The guiding rule throughout: anything not confidently recognised as a chord
 * is left exactly as it was found. A chart may contain bar lines, repeat marks,
 * "N.C.", performance notes or plain typos, and none of those should be
 * quietly rewritten into something else.
 */

/** The twelve pitch classes, spelled with sharps and with flats. */
const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** Semitones above C for each natural note. */
const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export type Accidental = "" | "#" | "##" | "b" | "bb";

export type Chord = {
  /** Semitones above C, 0-11. */
  rootPitch: number;
  /** Everything between the root and the slash: "m7", "sus4", "maj7#11", "". */
  quality: string;
  /** Semitones above C for a slash bass, when there is one. */
  bassPitch?: number;
};

/**
 * Chord qualities are open-ended in practice, so rather than enumerate them
 * this allows only the characters real qualities are built from. That is what
 * keeps ordinary words out: "Go" parses as G followed by "o", "o" is not in the
 * set, so it is not a chord and is left alone. "Am", "Cmaj7", "F#m7b5",
 * "Csus2", "G13#11" and "Bdim7" all pass.
 */
const QUALITY_RE = /^(?:maj|major|min|minor|m|M|dim|aug|sus|add|alt|no|°|ø|Δ|\+|-|\d|#|b|\(|\))*$/;

const ACCIDENTAL_RE = /^(?:##|bb|#|b|♯♯|♭♭|♯|♭)?/;

function normalizeAccidental(raw: string): Accidental {
  const map: Record<string, Accidental> = {
    "": "", "#": "#", "##": "##", b: "b", bb: "bb",
    "♯": "#", "♯♯": "##", "♭": "b", "♭♭": "bb",
  };
  return map[raw] ?? "";
}

function accidentalOffset(a: Accidental): number {
  return { "": 0, "#": 1, "##": 2, b: -1, bb: -2 }[a];
}

/** A note name like "C", "F#", "Bb" to a pitch class, or null. */
export function parseNote(text: string): number | null {
  const letter = text[0]?.toUpperCase();
  if (letter === undefined || !(letter in NATURAL)) return null;

  const rest = text.slice(1);
  const accidental = normalizeAccidental(ACCIDENTAL_RE.exec(rest)?.[0] ?? "");
  // Anything after the accidental means this is not a bare note.
  if (rest.length !== (ACCIDENTAL_RE.exec(rest)?.[0] ?? "").length) return null;

  return (((NATURAL[letter] + accidentalOffset(accidental)) % 12) + 12) % 12;
}

/**
 * Parse a chord symbol. Returns null for anything that is not clearly one,
 * which is the caller's signal to leave the text untouched.
 */
export function parseChord(text: string): Chord | null {
  if (!text) return null;

  // A slash chord splits at the first slash: "C/G", "F#m7/C#".
  const slash = text.indexOf("/");
  const head = slash === -1 ? text : text.slice(0, slash);
  const tail = slash === -1 ? null : text.slice(slash + 1);

  const letter = head[0];
  if (letter === undefined || !(letter.toUpperCase() in NATURAL)) return null;
  // Chord roots are capitalised. Lower case is a lyric, not a chord.
  if (letter !== letter.toUpperCase()) return null;

  const afterLetter = head.slice(1);
  const accidentalText = ACCIDENTAL_RE.exec(afterLetter)?.[0] ?? "";
  const accidental = normalizeAccidental(accidentalText);
  const quality = afterLetter.slice(accidentalText.length);

  if (!QUALITY_RE.test(quality)) return null;

  let bassPitch: number | undefined;
  if (tail !== null) {
    const bass = parseNote(tail);
    // "C/" or "C/x" is not a chord we understand.
    if (bass === null) return null;
    bassPitch = bass;
  }

  const rootPitch =
    (((NATURAL[letter.toUpperCase()] + accidentalOffset(accidental)) % 12) + 12) % 12;

  return { rootPitch, quality, bassPitch };
}

/**
 * How a key wants its accidentals spelled.
 *
 * The key you chose is the spelling you get: pick Eb and the chart is written
 * in flats, pick D# and it is written in sharps. Among the natural keys only F
 * conventionally takes flats.
 *
 * Only the twelve ordinary names are ever produced, so a chart never fills up
 * with E#, B#, Cb or Fb — which is technically correct in a handful of keys and
 * unreadable on a music stand in all of them.
 */
export type Spelling = "sharp" | "flat";

export function spellingForKey(key: string | null | undefined): Spelling {
  const trimmed = (key ?? "").trim();
  if (!trimmed) return "sharp";

  // Strip a minor suffix: "Ebm" and "Eb" want the same accidentals.
  const root = trimmed.replace(/(m|min|minor)$/i, "");
  if (/[b♭]/.test(root.slice(1))) return "flat";
  if (/[#♯]/.test(root.slice(1))) return "sharp";
  return root.toUpperCase().startsWith("F") ? "flat" : "sharp";
}

export function pitchName(pitch: number, spelling: Spelling): string {
  const index = ((pitch % 12) + 12) % 12;
  return spelling === "flat" ? FLAT_NAMES[index] : SHARP_NAMES[index];
}

/** A parsed chord back to text. */
export function formatChord(chord: Chord, spelling: Spelling): string {
  const root = pitchName(chord.rootPitch, spelling);
  const bass =
    chord.bassPitch === undefined ? "" : `/${pitchName(chord.bassPitch, spelling)}`;
  return `${root}${chord.quality}${bass}`;
}

/** The pitch class a key is centred on, or null if it is not a key name. */
export function keyPitch(key: string | null | undefined): number | null {
  const trimmed = (key ?? "").trim();
  if (!trimmed) return null;
  const root = trimmed.replace(/(m|min|minor)$/i, "");
  return parseNote(root);
}

/** Semitones from one key to another, always 0-11. */
export function semitonesBetween(from: string, to: string): number | null {
  const a = keyPitch(from);
  const b = keyPitch(to);
  if (a === null || b === null) return null;
  return (((b - a) % 12) + 12) % 12;
}

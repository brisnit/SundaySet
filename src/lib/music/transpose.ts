import {
  formatChord,
  parseChord,
  pitchName,
  semitonesBetween,
  spellingForKey,
  type Spelling,
} from "./chords";

/**
 * Transposition.
 *
 * A chart is stored as rows of chords paired with rows of lyrics, and the two
 * are held apart on purpose. That means transposing never touches a word: it
 * rewrites the chord row and leaves the lyric row byte-for-byte identical.
 *
 * The hard part is not the notes. It is that a chord row is *positional* — a
 * chord means something because of the column it sits in, above the syllable it
 * is played on. Turn G into Ab and the row grows a character, and without care
 * every chord after it slides off its word. So each chord is put back at the
 * column it came from wherever that is still possible.
 */

/**
 * Candidate chords inside a row.
 *
 * Bounded by whitespace or by the punctuation charts actually use — bar lines,
 * brackets, commas — so "| C | G7 |" and "(Am)" both work while "N.C." and
 * "x2" are never mistaken for chords.
 */
const TOKEN_RE = /[^\s|(){}\[\],]+/g;

type Replacement = { start: number; end: number; text: string };

/**
 * Rewrite every chord in a row, keeping the columns.
 *
 * Anything that does not parse as a chord is copied across untouched, which is
 * the whole safety story: an unrecognised token cannot be damaged because it is
 * never rewritten.
 */
function rewriteRow(
  row: string,
  rewrite: (chordText: string) => string | null,
): string {
  const replacements: Replacement[] = [];

  for (const match of row.matchAll(TOKEN_RE)) {
    const text = match[0];
    const start = match.index;
    const next = rewrite(text);
    if (next !== null && next !== text) {
      replacements.push({ start, end: start + text.length, text: next });
    }
  }

  if (replacements.length === 0) return row;

  let out = "";
  let cursor = 0;

  for (const r of replacements) {
    // Carry across anything in the gap that is not whitespace — bar lines,
    // brackets, "N.C." — but drop its trailing spaces, because those are the
    // slack this chord's column is allowed to reclaim.
    const gap = row.slice(cursor, r.start);
    out += gap.replace(/[ \t]+$/, "");

    if (out.length < r.start) {
      // Put the chord back in the column it came from. This is the common
      // case: a chord that grew ate into the gap, and one that shrank left
      // slack, and either way the chord after it belongs where it was.
      out += " ".repeat(r.start - out.length);
    } else if (out.length > 0 && !/\s$/.test(out)) {
      // No slack left — the previous chord is wide enough to reach this one.
      // Give up a single space so they cannot run together, and accept that
      // everything after this point shifts right.
      out += " ";
    }

    out += r.text;
    cursor = r.end;
  }

  return out + row.slice(cursor);
}

/** Transpose one chord symbol. Returns null when it is not a chord. */
export function transposeChord(
  text: string,
  semitones: number,
  spelling: Spelling,
): string | null {
  const chord = parseChord(text);
  if (!chord) return null;

  return formatChord(
    {
      rootPitch: chord.rootPitch + semitones,
      quality: chord.quality,
      bassPitch:
        chord.bassPitch === undefined ? undefined : chord.bassPitch + semitones,
    },
    spelling,
  );
}

/** Transpose a whole chord row, preserving its alignment. */
export function transposeChordRow(
  row: string,
  semitones: number,
  spelling: Spelling,
): string {
  if (semitones % 12 === 0) {
    // Still re-spell: moving between Eb and D# is zero semitones but a
    // different chart.
    return rewriteRow(row, (t) => transposeChord(t, 0, spelling));
  }
  return rewriteRow(row, (t) => transposeChord(t, semitones, spelling));
}

/**
 * Is this line a row of chords rather than a line of words?
 *
 * Needed by the editor, which works on free text rather than parsed lines. It
 * has to be conservative in one particular direction: rewriting a lyric by
 * mistake is unrecoverable, while missing an unusual chord row only means the
 * user fixes one line by hand.
 *
 * A capitalised "A" at the start of a lyric is the obvious trap — "A long time
 * ago" begins with something that parses as a chord. Requiring most of the
 * line to be chords rules that out, because the other three words are not.
 */
export function isChordRow(line: string): boolean {
  const tokens = [...line.matchAll(TOKEN_RE)].map((m) => m[0]);
  if (tokens.length === 0) return false;

  const chords = tokens.filter((t) => parseChord(t) !== null).length;
  if (chords === 0) return false;

  return chords / tokens.length >= 0.6;
}

/**
 * Transpose a chords-over-lyrics block of text.
 *
 * Line-oriented rather than parsed-and-rebuilt, because a parse/serialise
 * round-trip is not lossless — two chord rows in a row come back with a blank
 * line between them. Walking the lines leaves everything it does not rewrite
 * exactly as it was.
 */
export function transposeChartText(
  body: string,
  semitones: number,
  spelling: Spelling,
): string {
  return body
    .split("\n")
    .map((line) => (isChordRow(line) ? transposeChordRow(line, semitones, spelling) : line))
    .join("\n");
}

export type ChartLine = { chords: string; lyrics: string };
export type ChartSectionLike = { lines: ChartLine[] };

/**
 * Transpose a whole chart from one key to another.
 *
 * Returns the sections unchanged when either key is missing or unreadable —
 * a chart with no stated key cannot be moved to another one, and guessing
 * would be worse than doing nothing.
 */
export function transposeSections<T extends ChartSectionLike>(
  sections: T[],
  fromKey: string | null | undefined,
  toKey: string | null | undefined,
): T[] {
  const semitones = fromKey && toKey ? semitonesBetween(fromKey, toKey) : null;
  if (semitones === null) return sections;

  const spelling = spellingForKey(toKey);
  if (semitones === 0 && spellingForKey(fromKey) === spelling) return sections;

  return sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({
      ...line,
      chords: transposeChordRow(line.chords, semitones, spelling),
      // Untouched, always.
      lyrics: line.lyrics,
    })),
  }));
}

// ---------------------------------------------------------------------------
// Nashville numbers
// ---------------------------------------------------------------------------

/**
 * The Nashville Number System writes chords as scale degrees, so one chart
 * works in every key. It falls straight out of the same parser: instead of
 * naming the transposed pitch, name its distance from the tonic.
 */
const DEGREE_BY_SEMITONE = [
  "1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7",
];

function degreeFor(pitch: number, tonic: number): string {
  return DEGREE_BY_SEMITONE[(((pitch - tonic) % 12) + 12) % 12];
}

/** One chord as a number. Returns null when it is not a chord. */
export function chordToNashville(text: string, tonic: number): string | null {
  const chord = parseChord(text);
  if (!chord) return null;

  const root = degreeFor(chord.rootPitch, tonic);
  const bass =
    chord.bassPitch === undefined ? "" : `/${degreeFor(chord.bassPitch, tonic)}`;
  return `${root}${chord.quality}${bass}`;
}

/** A chord row as numbers, alignment preserved exactly as for notes. */
export function nashvilleChordRow(row: string, tonic: number): string {
  return rewriteRow(row, (t) => chordToNashville(t, tonic));
}

export function nashvilleSections<T extends ChartSectionLike>(
  sections: T[],
  key: string | null | undefined,
): T[] {
  const tonic = key ? (semitonesBetween("C", key) ?? null) : null;
  if (tonic === null) return sections;

  return sections.map((section) => ({
    ...section,
    lines: section.lines.map((line) => ({
      ...line,
      chords: nashvilleChordRow(line.chords, tonic),
      lyrics: line.lyrics,
    })),
  }));
}

/**
 * The key a chart should be shown in, and how to get there.
 *
 * One place decides this so the print view, the musician's phone view and the
 * editor cannot drift apart: a set's chosen key wins, otherwise the chart's own
 * key, otherwise the key the workspace usually plays it in.
 */
export function resolveDisplayKey(opts: {
  setKey?: string | null;
  chartKey?: string | null;
  songKey?: string | null;
}): string | null {
  return opts.setKey?.trim() || opts.chartKey?.trim() || opts.songKey?.trim() || null;
}

export { pitchName, spellingForKey, semitonesBetween };

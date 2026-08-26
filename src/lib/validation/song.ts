import { z } from "zod";

import { blankToUndefined, optionalFormText } from "./form";

const KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B",
] as const;

export const MUSICAL_KEYS = KEYS;

const optionalUrl = optionalFormText(2000).refine(
  (v) => v === undefined || /^https?:\/\/\S+$/.test(v),
  { message: "Enter a full URL starting with http:// or https://" },
);

/** Comma-separated free text → a clean, de-duplicated, lowercase list. */
const commaList = z
  .unknown()
  .optional()
  .transform((raw) => (blankToUndefined(raw) as string | undefined))
  .transform((v) =>
    Array.from(
      new Set(
        (v ?? "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      ),
    ),
  );

/** Keys stay in their written case — "Bb" is not "bb". */
const keyList = z
  .unknown()
  .optional()
  .transform((raw) => (blankToUndefined(raw) as string | undefined))
  .transform((v) =>
    Array.from(
      new Set(
        (v ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ),
  );

export const songInputSchema = z.object({
  title: z.string().trim().min(1, "Give the song a title").max(200),
  artist: optionalFormText(160),
  ccliNumber: optionalFormText(32),
  defaultKey: optionalFormText(8),
  churchKey: optionalFormText(8),
  alternateKeys: keyList,
  bpm: z
    .unknown()
    .optional()
    .transform((v) => {
      const blank = blankToUndefined(v);
      return blank === undefined ? undefined : Number(blank);
    })
    .refine((v) => v === undefined || (Number.isFinite(v) && v > 20 && v < 300), {
      message: "BPM should be between 20 and 300",
    }),
  tempoCategory: z.enum(["FAST", "MEDIUM", "SLOW"]).optional(),
  songTypes: z
    .array(
      z.enum([
        "UPBEAT", "MID_TEMPO", "REFLECTIVE", "HYMN", "COMMUNION", "EASTER",
        "CHRISTMAS", "ADVENT", "RESPONSE", "BAPTISM", "PRAYER", "OFFERING",
      ]),
    )
    .default([]),
  themes: commaList,
  difficulty: z.enum(["SIMPLE", "MODERATE", "ADVANCED"]).default("MODERATE"),
  familiarity: z
    .enum(["NEW", "LEARNING", "FAMILIAR", "CORE", "RETIRED"])
    .default("NEW"),
  status: z.enum(["ACTIVE", "RETIRED"]).default("ACTIVE"),
  leadVocalistPreference: optionalFormText(120),
  lyrics: optionalFormText(20000),
  notes: optionalFormText(4000),
  spotifyUrl: optionalUrl,
  appleMusicUrl: optionalUrl,
  youtubeUrl: optionalUrl,
});

export type SongInput = z.infer<typeof songInputSchema>;

/** One line of a chart: a chord row sitting above its lyric row. */
const chartLine = z.object({
  chords: z.string().max(400).default(""),
  lyrics: z.string().max(400).default(""),
});

export const chartSectionSchema = z.object({
  label: z.string().trim().min(1).max(60),
  type: z.enum([
    "VERSE", "PRECHORUS", "CHORUS", "BRIDGE", "INTRO", "OUTRO",
    "TAG", "INSTRUMENTAL", "OTHER",
  ]),
  lines: z.array(chartLine).default([]),
  notes: z.string().trim().max(500).optional(),
});

export type ChartSection = z.infer<typeof chartSectionSchema>;

export const chartInputSchema = z.object({
  key: optionalFormText(8),
  capo: z
    .unknown()
    .optional()
    .transform((v) => {
      const blank = blankToUndefined(v);
      return blank === undefined ? undefined : Number(blank);
    })
    .refine((v) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 11), {
      message: "Capo must be between 0 and 11",
    }),
  sections: z.array(chartSectionSchema).default([]),
});

export type ChartInput = z.infer<typeof chartInputSchema>;

/**
 * Parse a pasted "chords over lyrics" block into structured lines.
 *
 * Worship leaders paste charts in this shape, and keeping the pairing explicit
 * (rather than storing one blob) is what lets transposition rewrite the chord
 * row later without touching lyrics.
 */
export function parseChartBody(body: string): Array<{ chords: string; lyrics: string }> {
  const rows = body.replace(/\r\n/g, "\n").split("\n");
  const lines: Array<{ chords: string; lyrics: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const current = rows[i];
    const next = rows[i + 1];
    if (looksLikeChordRow(current) && next !== undefined && !looksLikeChordRow(next)) {
      lines.push({ chords: current, lyrics: next });
      i++;
    } else if (looksLikeChordRow(current)) {
      lines.push({ chords: current, lyrics: "" });
    } else {
      lines.push({ chords: "", lyrics: current });
    }
  }
  return lines;
}

/** A row of chord symbols and whitespace, nothing else. */
export function looksLikeChordRow(row: string): boolean {
  const tokens = row.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  return tokens.every((t) =>
    /^[A-G](#|b)?(maj|min|m|sus|add|dim|aug|M)?\d*(\/[A-G](#|b)?)?$/.test(t),
  );
}

/** Structured lines back to an editable text block. */
export function serializeChartBody(
  lines: Array<{ chords: string; lyrics: string }>,
): string {
  return lines
    .flatMap((l) => (l.chords ? [l.chords, l.lyrics] : [l.lyrics]))
    .join("\n");
}

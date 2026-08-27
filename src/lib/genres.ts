import type { Genre } from "@/generated/prisma/enums";

/**
 * Genres, in the order they are offered.
 *
 * Grouped roughly by how a musician would look for them rather than
 * alphabetically: what this app is most used for first, then the broad popular
 * genres, then the rest. `titleCase` cannot render "R&B" or "Hip-Hop", so
 * labels are explicit.
 */
export const GENRES: ReadonlyArray<{ value: Genre; label: string }> = [
  { value: "WORSHIP", label: "Worship" },
  { value: "GOSPEL", label: "Gospel" },
  { value: "TRADITIONAL", label: "Traditional" },
  { value: "POP", label: "Pop" },
  { value: "ROCK", label: "Rock" },
  { value: "ALTERNATIVE", label: "Alternative" },
  { value: "INDIE", label: "Indie" },
  { value: "RNB", label: "R&B" },
  { value: "SOUL", label: "Soul" },
  { value: "FUNK", label: "Funk" },
  { value: "HIP_HOP", label: "Hip-Hop" },
  { value: "COUNTRY", label: "Country" },
  { value: "FOLK", label: "Folk" },
  { value: "ACOUSTIC", label: "Acoustic" },
  { value: "JAZZ", label: "Jazz" },
  { value: "BLUES", label: "Blues" },
  { value: "ELECTRONIC", label: "Electronic" },
  { value: "CLASSICAL", label: "Classical" },
  { value: "OTHER", label: "Other" },
];

export const GENRE_VALUES = GENRES.map((g) => g.value) as [Genre, ...Genre[]];

const LABELS = new Map(GENRES.map((g) => [g.value, g.label]));

export function genreLabel(value: Genre): string {
  return LABELS.get(value) ?? value;
}

/** Labels in the canonical order above, not the order they were stored. */
export function genreLabels(values: Genre[]): string[] {
  return GENRES.filter((g) => values.includes(g.value)).map((g) => g.label);
}

/**
 * The genres offered on Home.
 *
 * A curated dozen rather than all nineteen: the grid is meant to be scanned in
 * one look, and the long tail is reachable by searching. Worship leads because
 * it is what most of these workspaces are for, then the broad popular genres.
 */
export const HOME_GENRES: ReadonlyArray<{ genre: Genre; label: string }> = [
  "WORSHIP", "GOSPEL", "POP", "ROCK",
  "RNB", "SOUL", "HIP_HOP", "COUNTRY",
  "JAZZ", "FOLK", "ELECTRONIC", "CLASSICAL",
].map((g) => ({ genre: g as Genre, label: genreLabel(g as Genre) }));

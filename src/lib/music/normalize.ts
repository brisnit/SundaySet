/**
 * Normalizing a title or artist for comparison.
 *
 * The same song reaches us spelled several ways — "Purple Rain", "Purple Rain
 * (Live)", "Purple Rain - 2015 Remaster", "PURPLE RAIN (feat. Someone)". None
 * of those are different songs to a band, so all of them have to collapse to
 * the same string before comparison.
 *
 * This is only ever used for matching. Nothing normalized is ever stored or
 * shown — the title a user sees is the title the provider gave.
 */

/** Parenthesised or dash-suffixed qualifiers that never change what song it is. */
const NOISE = [
  /\((?:[^)]*\b(?:live|acoustic|remaster(?:ed)?|remix|edit|version|mix|mono|stereo|demo|reprise|instrumental|karaoke|radio|single|album|deluxe|bonus|explicit|clean|feat\.?|featuring|with)\b[^)]*)\)/gi,
  /\[(?:[^\]]*\b(?:live|acoustic|remaster(?:ed)?|remix|edit|version|mix|mono|stereo|demo|reprise|instrumental|karaoke|radio|single|album|deluxe|bonus|explicit|clean|feat\.?|featuring|with)\b[^\]]*)\]/gi,
  /\s[-–—]\s.*\b(?:live|acoustic|remaster(?:ed)?|remix|edit|version|mix|mono|stereo|demo|reprise|instrumental|karaoke|radio edit|single version|album version)\b.*$/gi,
  /\s*\b(?:feat\.?|featuring|ft\.?)\s+.*$/gi,
];

export function normalizeTitle(value: string): string {
  let out = value.toLowerCase();
  for (const pattern of NOISE) out = out.replace(pattern, " ");
  return finish(out);
}

export function normalizeArtist(value: string): string {
  let out = value.toLowerCase();
  // Credit joiners: "Simon & Garfunkel" and "Simon and Garfunkel" are one act.
  out = out.replace(/\s*\b(?:feat\.?|featuring|ft\.?|with)\s+.*$/gi, " ");
  out = out.replace(/\s*&\s*/g, " and ");
  out = out.replace(/^the\s+/, "");
  return finish(out);
}

function finish(value: string): string {
  return value
    // Strip diacritics: "Beyoncé" must match "Beyonce".
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Apostrophes are deleted rather than spaced: "Don't Stop" and "Dont Stop"
    // are the same song, and turning the mark into a space would split the word
    // and stop them matching. Curly and straight forms go the same way.
    .replace(/['‘’‚‛]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** The comparison key for one song. */
export function matchKey(title: string, artist: string | null | undefined): string {
  return `${normalizeTitle(title)}|${normalizeArtist(artist ?? "")}`;
}

/**
 * Do two artist credits plausibly name the same act?
 *
 * Exact equality is too strict once writer credits are involved. A library
 * holds "Phil Wickham" because that is who performs it; a metadata provider
 * credits "Phil Wickham & Jonathan Smith" because that is who wrote it. Those
 * are the same song and a person would say so immediately.
 *
 * Sharing one distinctive name is enough. "Dolly Parton" and "Ray LaMontagne"
 * share nothing, so two different songs called Jolene stay apart.
 */
const CREDIT_STOPWORDS = new Set([
  "and", "the", "of", "band", "feat", "featuring", "with", "trio", "quartet",
  "orchestra", "choir", "worship", "music", "collective", "traditional",
]);

function creditTokens(value: string): Set<string> {
  return new Set(
    normalizeArtist(value)
      .split(" ")
      .filter((t) => t.length > 1 && !CREDIT_STOPWORDS.has(t)),
  );
}

export function artistsPlausiblyMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const rawA = normalizeArtist(a ?? "");
  const rawB = normalizeArtist(b ?? "");

  // Genuinely unattributed: the titles matching is all we have, and this tier
  // only ever asks a question rather than deciding anything.
  if (!rawA || !rawB) return true;

  const left = creditTokens(a ?? "");
  const right = creditTokens(b ?? "");

  // A name made entirely of filler — "The Worship Band" — leaves nothing
  // distinctive to compare, so fall back to the whole string. Otherwise every
  // such act would match every other one.
  if (left.size === 0 || right.size === 0) return rawA === rawB;

  for (const token of left) if (right.has(token)) return true;
  return false;
}

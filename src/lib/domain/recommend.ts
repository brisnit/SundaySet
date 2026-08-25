import type { Difficulty, SongType } from "@/generated/prisma/enums";

/**
 * How well a catalog song fits one church.
 *
 * Deliberately a pure function over explicit inputs. The MVP signal is the
 * church's own library and style profile — what they already sing — rather than
 * what is popular generally. When real music intelligence (audio features,
 * co-occurrence data) is available it becomes another weighted term here
 * without the calling code changing.
 */
export type Candidate = {
  id: string;
  title: string;
  artist: string;
  themes: string[];
  songTypes: SongType[];
  difficulty: Difficulty;
  popularity: number;
};

export type ChurchTaste = {
  preferredArtists: string[];
  avoidArtists: string[];
  avoidSongs: string[];
  difficulty: Difficulty;
  /** Themes the church already sings, most common first. */
  libraryThemes: string[];
  /** Artists already in the library. */
  libraryArtists: string[];
};

export type Recommendation = {
  score: number;
  reasons: string[];
};

const DIFFICULTY_ORDER: Difficulty[] = ["SIMPLE", "MODERATE", "ADVANCED"];

const norm = (s: string) => s.trim().toLowerCase();

export function scoreCandidate(
  candidate: Candidate,
  taste: ChurchTaste,
): Recommendation {
  const artist = norm(candidate.artist);
  const title = norm(candidate.title);

  // An explicit veto is absolute — never surface something the church has
  // asked not to see, however well it would otherwise score.
  if (
    taste.avoidArtists.some((a) => norm(a) === artist) ||
    taste.avoidSongs.some((t) => norm(t) === title)
  ) {
    return { score: 0, reasons: ["On your avoid list"] };
  }

  const reasons: string[] = [];
  let score = 0;

  // General popularity is the weakest signal, so it is capped low.
  score += Math.round((candidate.popularity / 100) * 20);

  if (taste.preferredArtists.some((a) => norm(a) === artist)) {
    score += 26;
    reasons.push(`${candidate.artist} is one of your preferred artists`);
  } else if (taste.libraryArtists.some((a) => norm(a) === artist)) {
    score += 16;
    reasons.push(`You already sing ${candidate.artist}`);
  }

  const libraryThemes = new Set(taste.libraryThemes.map(norm));
  const shared = candidate.themes.filter((t) => libraryThemes.has(norm(t)));
  if (shared.length > 0) {
    score += Math.min(28, shared.length * 11);
    reasons.push(
      `Themes you sing often: ${shared.slice(0, 3).join(", ")}`,
    );
  }

  const gap = Math.abs(
    DIFFICULTY_ORDER.indexOf(candidate.difficulty) -
      DIFFICULTY_ORDER.indexOf(taste.difficulty),
  );
  if (gap === 0) {
    score += 14;
    reasons.push("Matches your team's usual difficulty");
  } else if (gap === 1) {
    score += 7;
  } else {
    reasons.push("Harder than most of your set list");
  }

  if (candidate.songTypes.includes("HYMN")) {
    score += 6;
    reasons.push("A hymn, which your set structure calls for weekly");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/** Library songs sharing the most themes — the "Similar to" list. */
export function findSimilar(
  candidate: Pick<Candidate, "themes">,
  library: Array<{ title: string; themes: string[] }>,
  limit = 3,
): string[] {
  const wanted = new Set(candidate.themes.map(norm));
  return library
    .map((s) => ({
      title: s.title,
      overlap: s.themes.filter((t) => wanted.has(norm(t))).length,
    }))
    .filter((s) => s.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map((s) => s.title);
}

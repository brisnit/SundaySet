/**
 * Song usage intelligence.
 *
 * Pure functions over play history. The AI set generator and the Songs list
 * both read these, so a song's rotation health means exactly one thing across
 * the product.
 */

export type UsageStatus =
  | "NEVER_PLAYED"
  | "FRESH"
  | "HEALTHY_ROTATION"
  | "FREQUENTLY_USED"
  | "OVERPLAYED"
  | "READY_TO_RETURN";

export type UsageInput = {
  lastPlayedOn: Date | null;
  /** Times played in the trailing 90 days. */
  uses90d: number;
  /** Times played so far this calendar year. */
  usesYtd: number;
};

export type UsageVerdict = {
  status: UsageStatus;
  label: string;
  /** Plain-language guidance shown on the song and used in AI explanations. */
  recommendation: string;
  daysSinceLastPlayed: number | null;
};

const DAY = 86_400_000;

export function daysSince(date: Date | null, today: Date): number | null {
  if (!date) return null;
  return Math.floor((startOfDay(today).getTime() - startOfDay(date).getTime()) / DAY);
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Order matters: overuse outranks everything, because the most damaging thing a
 * planner can do is repeat a song the congregation is tired of.
 */
export function classifyUsage(input: UsageInput, today: Date): UsageVerdict {
  const days = daysSince(input.lastPlayedOn, today);

  if (days === null) {
    return {
      status: "NEVER_PLAYED",
      label: "Never played",
      recommendation: "New to your library — plan a week to teach it.",
      daysSinceLastPlayed: null,
    };
  }

  if (input.uses90d >= 5) {
    return {
      status: "OVERPLAYED",
      label: "Overplayed",
      recommendation: "Consider resting this song for several weeks.",
      daysSinceLastPlayed: days,
    };
  }

  if (days >= 120) {
    return {
      status: "READY_TO_RETURN",
      label: "Ready to return",
      recommendation: "Strong candidate to bring back.",
      daysSinceLastPlayed: days,
    };
  }

  if (input.uses90d >= 3) {
    return {
      status: "FREQUENTLY_USED",
      label: "Frequently used",
      recommendation: "In heavy rotation — give it a few weeks before repeating.",
      daysSinceLastPlayed: days,
    };
  }

  if (days >= 42) {
    return {
      status: "FRESH",
      label: "Fresh",
      recommendation: "Well rested and ready to use.",
      daysSinceLastPlayed: days,
    };
  }

  return {
    status: "HEALTHY_ROTATION",
    label: "Healthy rotation",
    recommendation: "Comfortably in rotation.",
    daysSinceLastPlayed: days,
  };
}

/** "2 weeks ago", "5 months ago" — for song cards and musician-facing views. */
export function describeLastPlayed(days: number | null): string {
  if (days === null) return "Never played";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const years = Math.round((days / 365) * 10) / 10;
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

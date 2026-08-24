/**
 * Liturgical and holiday calendar.
 *
 * These dates are COMPUTED, never seeded. That is what lets a leader plan any
 * future year — "plan my entire year" for 2031 needs no data entry. Only
 * church-created events (Communion Sunday, Youth Sunday, ...) live in the
 * SpecialDate table.
 *
 * All dates are UTC-midnight Date objects, matching Prisma's `@db.Date`
 * columns. They represent calendar dates, not instants, so they must never be
 * rendered with a timezone offset applied.
 */

export type SpecialDayKey =
  | "ash-wednesday"
  | "palm-sunday"
  | "good-friday"
  | "easter"
  | "ascension"
  | "pentecost"
  | "advent-1"
  | "advent-2"
  | "advent-3"
  | "advent-4"
  | "christmas-eve"
  | "christmas-day"
  | "epiphany"
  | "mothers-day"
  | "fathers-day"
  | "thanksgiving"
  | "new-years-day";

export type SpecialDay = {
  key: SpecialDayKey;
  name: string;
  date: Date;
  /** Song types the AI should weight toward for this day. */
  suggestedSongTypes: string[];
};

/** Build a UTC-midnight calendar date. */
export function utcDate(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Format as YYYY-MM-DD without applying a local timezone offset. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Easter Sunday (Gregorian), via the Meeus/Jones/Butcher algorithm.
 * Every other movable feast is derived from this one date.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utcDate(year, month, day);
}

/** The nth given weekday of a month. weekday: 0 = Sunday. */
export function nthWeekdayOfMonth(
  year: number,
  month1to12: number,
  weekday: number,
  n: number,
): Date {
  const first = utcDate(year, month1to12, 1);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return addDays(first, offset + (n - 1) * 7);
}

/**
 * First Sunday of Advent — the fourth Sunday before Christmas Day.
 * Found by walking back to the Sunday on or before Dec 24, then three weeks.
 */
export function firstSundayOfAdvent(year: number): Date {
  const dec24 = utcDate(year, 12, 24);
  const advent4 = addDays(dec24, -dec24.getUTCDay());
  return addDays(advent4, -21);
}

/** Every recognized special day in a calendar year, ordered by date. */
export function specialDaysForYear(year: number): SpecialDay[] {
  const easter = easterSunday(year);
  const advent1 = firstSundayOfAdvent(year);

  const days: SpecialDay[] = [
    {
      key: "new-years-day",
      name: "New Year's Day",
      date: utcDate(year, 1, 1),
      suggestedSongTypes: ["UPBEAT", "RESPONSE"],
    },
    {
      key: "epiphany",
      name: "Epiphany",
      date: utcDate(year, 1, 6),
      suggestedSongTypes: ["REFLECTIVE"],
    },
    {
      key: "ash-wednesday",
      name: "Ash Wednesday",
      date: addDays(easter, -46),
      suggestedSongTypes: ["REFLECTIVE", "PRAYER"],
    },
    {
      key: "palm-sunday",
      name: "Palm Sunday",
      date: addDays(easter, -7),
      suggestedSongTypes: ["UPBEAT", "HYMN"],
    },
    {
      key: "good-friday",
      name: "Good Friday",
      date: addDays(easter, -2),
      suggestedSongTypes: ["REFLECTIVE", "COMMUNION", "HYMN"],
    },
    {
      key: "easter",
      name: "Easter Sunday",
      date: easter,
      suggestedSongTypes: ["EASTER", "UPBEAT", "HYMN"],
    },
    {
      key: "ascension",
      name: "Ascension Day",
      date: addDays(easter, 39),
      suggestedSongTypes: ["UPBEAT"],
    },
    {
      key: "pentecost",
      name: "Pentecost",
      date: addDays(easter, 49),
      suggestedSongTypes: ["UPBEAT", "PRAYER"],
    },
    {
      key: "mothers-day",
      name: "Mother's Day",
      date: nthWeekdayOfMonth(year, 5, 0, 2),
      suggestedSongTypes: ["MID_TEMPO"],
    },
    {
      key: "fathers-day",
      name: "Father's Day",
      date: nthWeekdayOfMonth(year, 6, 0, 3),
      suggestedSongTypes: ["MID_TEMPO"],
    },
    {
      key: "thanksgiving",
      name: "Thanksgiving",
      date: nthWeekdayOfMonth(year, 11, 4, 4),
      suggestedSongTypes: ["HYMN", "RESPONSE"],
    },
    {
      key: "advent-1",
      name: "First Sunday of Advent",
      date: advent1,
      suggestedSongTypes: ["ADVENT", "REFLECTIVE"],
    },
    {
      key: "advent-2",
      name: "Second Sunday of Advent",
      date: addDays(advent1, 7),
      suggestedSongTypes: ["ADVENT"],
    },
    {
      key: "advent-3",
      name: "Third Sunday of Advent",
      date: addDays(advent1, 14),
      suggestedSongTypes: ["ADVENT"],
    },
    {
      key: "advent-4",
      name: "Fourth Sunday of Advent",
      date: addDays(advent1, 21),
      suggestedSongTypes: ["ADVENT", "CHRISTMAS"],
    },
    {
      key: "christmas-eve",
      name: "Christmas Eve",
      date: utcDate(year, 12, 24),
      suggestedSongTypes: ["CHRISTMAS", "REFLECTIVE"],
    },
    {
      key: "christmas-day",
      name: "Christmas Day",
      date: utcDate(year, 12, 25),
      suggestedSongTypes: ["CHRISTMAS", "HYMN"],
    },
  ];

  return days.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** The special day falling on a given calendar date, if any. */
export function specialDayOn(date: Date): SpecialDay | undefined {
  const iso = toIsoDate(date);
  return specialDaysForYear(date.getUTCFullYear()).find(
    (d) => toIsoDate(d.date) === iso,
  );
}

/** Every Sunday in [start, end], inclusive. Drives the multi-week planner. */
export function sundaysBetween(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let cursor = addDays(start, (7 - start.getUTCDay()) % 7);
  while (cursor.getTime() <= end.getTime()) {
    out.push(cursor);
    cursor = addDays(cursor, 7);
  }
  return out;
}

import { describe, expect, it } from "vitest";

import {
  easterSunday,
  firstSundayOfAdvent,
  nthWeekdayOfMonth,
  specialDayOn,
  specialDaysForYear,
  sundaysBetween,
  toIsoDate,
  utcDate,
} from "@/lib/domain/liturgical";

describe("easterSunday", () => {
  // Verified against published ecclesiastical tables.
  const known: Array<[number, string]> = [
    [2000, "2000-04-23"],
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
    [2030, "2030-04-21"],
    [2038, "2038-04-25"],
  ];

  it.each(known)("computes Easter %i as %s", (year, iso) => {
    expect(toIsoDate(easterSunday(year))).toBe(iso);
  });

  it("always lands on a Sunday", () => {
    for (let year = 2020; year <= 2075; year++) {
      expect(easterSunday(year).getUTCDay()).toBe(0);
    }
  });
});

describe("derived movable feasts", () => {
  it("places Palm Sunday, Good Friday and Pentecost relative to Easter", () => {
    const days = specialDaysForYear(2026);
    const byKey = Object.fromEntries(days.map((d) => [d.key, toIsoDate(d.date)]));
    expect(byKey["easter"]).toBe("2026-04-05");
    expect(byKey["palm-sunday"]).toBe("2026-03-29");
    expect(byKey["good-friday"]).toBe("2026-04-03");
    expect(byKey["ash-wednesday"]).toBe("2026-02-18");
    expect(byKey["pentecost"]).toBe("2026-05-24");
  });
});

describe("firstSundayOfAdvent", () => {
  it("is a Sunday between Nov 27 and Dec 3", () => {
    for (let year = 2024; year <= 2060; year++) {
      const advent = firstSundayOfAdvent(year);
      expect(advent.getUTCDay()).toBe(0);
      const iso = toIsoDate(advent);
      expect(iso >= `${year}-11-27` && iso <= `${year}-12-03`).toBe(true);
    }
  });

  it("leaves exactly three more Sundays before Christmas Eve", () => {
    // Advent 4 must fall on or before Dec 24.
    for (let year = 2024; year <= 2040; year++) {
      const advent4 = new Date(
        firstSundayOfAdvent(year).getTime() + 21 * 86_400_000,
      );
      expect(toIsoDate(advent4) <= `${year}-12-24`).toBe(true);
    }
  });
});

describe("nthWeekdayOfMonth", () => {
  it("finds US Thanksgiving (4th Thursday of November)", () => {
    expect(toIsoDate(nthWeekdayOfMonth(2026, 11, 4, 4))).toBe("2026-11-26");
    expect(toIsoDate(nthWeekdayOfMonth(2027, 11, 4, 4))).toBe("2027-11-25");
  });

  it("finds Mother's Day (2nd Sunday of May)", () => {
    expect(toIsoDate(nthWeekdayOfMonth(2026, 5, 0, 2))).toBe("2026-05-10");
  });
});

describe("specialDayOn", () => {
  it("identifies Christmas Day", () => {
    expect(specialDayOn(utcDate(2026, 12, 25))?.key).toBe("christmas-day");
  });

  it("returns undefined for an ordinary Sunday", () => {
    expect(specialDayOn(utcDate(2026, 9, 13))).toBeUndefined();
  });
});

describe("sundaysBetween", () => {
  it("returns each Sunday inclusive of range boundaries", () => {
    const sundays = sundaysBetween(utcDate(2026, 9, 1), utcDate(2026, 10, 31));
    expect(sundays.map(toIsoDate)).toEqual([
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
      "2026-09-27",
      "2026-10-04",
      "2026-10-11",
      "2026-10-18",
      "2026-10-25",
    ]);
  });

  it("includes a start date that is itself a Sunday", () => {
    const sundays = sundaysBetween(utcDate(2026, 9, 6), utcDate(2026, 9, 20));
    expect(sundays.map(toIsoDate)).toEqual([
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
    ]);
  });
});

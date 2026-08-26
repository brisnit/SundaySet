import { describe, expect, it } from "vitest";

import {
  candidateRank,
  findConflicts,
  isBlockedOn,
  type CandidateInput,
} from "@/lib/domain/scheduling";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const SUNDAY = utc(2026, 9, 6);
const POSITION = "pos-bass";

const candidate = (over: Partial<CandidateInput> = {}): CandidateInput => ({
  active: true,
  qualifiedPositionIds: [POSITION],
  blockouts: [],
  preferredPerMonth: 2,
  positionsInThisService: [],
  assignmentsThisMonth: 0,
  declinedThisService: false,
  ...over,
});

describe("isBlockedOn", () => {
  const window = [{ startDate: utc(2026, 9, 5), endDate: utc(2026, 9, 12), note: "Away" }];

  it.each([
    [utc(2026, 9, 5), true, "first day"],
    [utc(2026, 9, 8), true, "middle"],
    [utc(2026, 9, 12), true, "last day"],
    [utc(2026, 9, 4), false, "day before"],
    [utc(2026, 9, 13), false, "day after"],
  ])("%s -> %s (%s)", (date, expected) => {
    expect(Boolean(isBlockedOn(window, date as Date))).toBe(expected);
  });

  it("matches a single-day blockout", () => {
    const one = [{ startDate: SUNDAY, endDate: SUNDAY, note: null }];
    expect(isBlockedOn(one, SUNDAY)).toBeTruthy();
  });
});

describe("findConflicts", () => {
  it("returns nothing for a qualified, available, uncommitted person", () => {
    expect(findConflicts(candidate(), POSITION, SUNDAY)).toEqual([]);
  });

  it("flags a blockout covering the service date, with the dates and note", () => {
    const c = findConflicts(
      candidate({
        blockouts: [{ startDate: utc(2026, 9, 5), endDate: utc(2026, 9, 12), note: "Vacation" }],
      }),
      POSITION,
      SUNDAY,
    );
    expect(c[0].kind).toBe("BLOCKED_OUT");
    expect(c[0].severity).toBe("conflict");
    expect(c[0].message).toMatch(/Sep 5/);
    expect(c[0].message).toMatch(/Vacation/);
  });

  it("ignores a blockout that does not cover the date", () => {
    const c = findConflicts(
      candidate({
        blockouts: [{ startDate: utc(2026, 10, 1), endDate: utc(2026, 10, 5), note: null }],
      }),
      POSITION,
      SUNDAY,
    );
    expect(c).toEqual([]);
  });

  it("flags an inactive member", () => {
    const c = findConflicts(candidate({ active: false }), POSITION, SUNDAY);
    expect(c.map((x) => x.kind)).toContain("INACTIVE");
  });

  it("flags someone who does not have the position on their profile", () => {
    const c = findConflicts(
      candidate({ qualifiedPositionIds: ["pos-drums"] }),
      POSITION,
      SUNDAY,
    );
    const notQualified = c.find((x) => x.kind === "NOT_QUALIFIED");
    expect(notQualified?.severity).toBe("caution");
  });

  it("flags someone already on this service", () => {
    const c = findConflicts(
      candidate({ positionsInThisService: ["pos-keys"] }),
      POSITION,
      SUNDAY,
    );
    expect(c.find((x) => x.kind === "ALREADY_IN_SERVICE")?.message).toBe(
      "Already on this service",
    );
  });

  it("counts multiple existing positions in the message", () => {
    const c = findConflicts(
      candidate({ positionsInThisService: ["a", "b"] }),
      POSITION,
      SUNDAY,
    );
    expect(c.find((x) => x.kind === "ALREADY_IN_SERVICE")?.message).toMatch(/2 positions/);
  });

  it("flags someone at their monthly limit", () => {
    const c = findConflicts(
      candidate({ preferredPerMonth: 2, assignmentsThisMonth: 2 }),
      POSITION,
      SUNDAY,
    );
    expect(c.find((x) => x.kind === "OVER_COMMITTED")?.message).toMatch(/prefers 2/);
  });

  it("treats 0 times-per-month as no preference, never over-committed", () => {
    const c = findConflicts(
      candidate({ preferredPerMonth: 0, assignmentsThisMonth: 9 }),
      POSITION,
      SUNDAY,
    );
    expect(c.map((x) => x.kind)).not.toContain("OVER_COMMITTED");
  });

  it("flags someone who already declined this service", () => {
    const c = findConflicts(candidate({ declinedThisService: true }), POSITION, SUNDAY);
    expect(c.find((x) => x.kind === "DECLINED_THIS_SERVICE")?.severity).toBe("conflict");
  });

  it("reports every applicable conflict at once", () => {
    const c = findConflicts(
      candidate({
        active: false,
        qualifiedPositionIds: [],
        blockouts: [{ startDate: SUNDAY, endDate: SUNDAY, note: null }],
        preferredPerMonth: 1,
        assignmentsThisMonth: 3,
      }),
      POSITION,
      SUNDAY,
    );
    expect(c.map((x) => x.kind).sort()).toEqual([
      "BLOCKED_OUT", "INACTIVE", "NOT_QUALIFIED", "OVER_COMMITTED",
    ]);
  });

  it("never vetoes — conflicts are advisory, the leader still decides", () => {
    // A person with every possible conflict still yields a list, not an error.
    const c = findConflicts(
      candidate({ active: false, declinedThisService: true }),
      POSITION,
      SUNDAY,
    );
    expect(Array.isArray(c)).toBe(true);
    expect(c.length).toBeGreaterThan(0);
  });
});

describe("candidateRank", () => {
  it("puts a clean, qualified person first", () => {
    expect(candidateRank([], true)).toBe(0);
  });

  it("ranks unqualified people below anyone qualified, however conflicted", () => {
    const qualifiedButBlocked = candidateRank(
      [{ kind: "BLOCKED_OUT", message: "", severity: "conflict" }],
      true,
    );
    const unqualifiedAndClean = candidateRank([], false);
    expect(qualifiedButBlocked).toBeLessThan(unqualifiedAndClean);
  });

  it("weights a hard conflict above a soft caution", () => {
    const hard = candidateRank([{ kind: "BLOCKED_OUT", message: "", severity: "conflict" }], true);
    const soft = candidateRank([{ kind: "OVER_COMMITTED", message: "", severity: "caution" }], true);
    expect(soft).toBeLessThan(hard);
  });
});

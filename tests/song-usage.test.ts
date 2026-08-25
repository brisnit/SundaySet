import { describe, expect, it } from "vitest";

import {
  classifyUsage,
  describeLastPlayed,
  daysSince,
} from "@/lib/domain/song-usage";

const today = new Date(Date.UTC(2026, 8, 6)); // 2026-09-06
const ago = (days: number) =>
  new Date(today.getTime() - days * 86_400_000);

describe("classifyUsage", () => {
  it("flags a never-played song", () => {
    const v = classifyUsage({ lastPlayedOn: null, uses90d: 0, usesYtd: 0 }, today);
    expect(v.status).toBe("NEVER_PLAYED");
    expect(v.daysSinceLastPlayed).toBeNull();
  });

  it("flags overplayed at 5 uses in 90 days", () => {
    const v = classifyUsage({ lastPlayedOn: ago(14), uses90d: 5, usesYtd: 9 }, today);
    expect(v.status).toBe("OVERPLAYED");
    expect(v.recommendation).toMatch(/resting/i);
  });

  it("prioritises overplayed over a long gap", () => {
    // Heavy recent use must win even if the last play was a while back.
    const v = classifyUsage({ lastPlayedOn: ago(130), uses90d: 6, usesYtd: 12 }, today);
    expect(v.status).toBe("OVERPLAYED");
  });

  it("suggests bringing back a song rested 4+ months", () => {
    const v = classifyUsage({ lastPlayedOn: ago(150), uses90d: 0, usesYtd: 1 }, today);
    expect(v.status).toBe("READY_TO_RETURN");
    expect(v.recommendation).toMatch(/bring back/i);
  });

  it("marks 3-4 uses in 90 days as frequently used", () => {
    const v = classifyUsage({ lastPlayedOn: ago(10), uses90d: 3, usesYtd: 6 }, today);
    expect(v.status).toBe("FREQUENTLY_USED");
  });

  it("marks a rested song as fresh", () => {
    const v = classifyUsage({ lastPlayedOn: ago(60), uses90d: 1, usesYtd: 2 }, today);
    expect(v.status).toBe("FRESH");
  });

  it("marks recent light use as healthy rotation", () => {
    const v = classifyUsage({ lastPlayedOn: ago(21), uses90d: 2, usesYtd: 4 }, today);
    expect(v.status).toBe("HEALTHY_ROTATION");
  });
});

describe("daysSince", () => {
  it("ignores time of day", () => {
    const played = new Date(Date.UTC(2026, 8, 4, 23, 30));
    expect(daysSince(played, new Date(Date.UTC(2026, 8, 6, 1, 0)))).toBe(2);
  });
});

describe("describeLastPlayed", () => {
  it.each([
    [null, "Never played"],
    [0, "Today"],
    [1, "Yesterday"],
    [5, "5 days ago"],
    [14, "2 weeks ago"],
    [150, "5 months ago"],
  ])("describes %s as %s", (days, expected) => {
    expect(describeLastPlayed(days as number | null)).toBe(expected);
  });
});

import "server-only";

import { listRecentServices, listUpcomingServices } from "./services";
import { type ChurchContext } from "./context";

/**
 * Home is about sets, not statistics.
 *
 * The old dashboard counted things across the whole workspace — songs in the
 * library, invitations outstanding, charts missing. Those read as an admin
 * report rather than a tool for making the next set, and every one of them cost
 * a query. What is left is the two lists Home actually shows, and the warnings
 * that belong to a specific set travel with that set's row.
 */
export type SetWarning = { label: string; tone: "clay" | "amber" };

export type SetRow = Awaited<ReturnType<typeof listUpcomingServices>>[number];

/** Warnings that belong to one set, shown on its own row. */
export function warningsFor(set: SetRow): SetWarning[] {
  const out: SetWarning[] = [];

  const unfilled = set.assignments.length === 0;
  if (unfilled) {
    out.push({ label: "No one scheduled", tone: "clay" });
  }

  const awaiting = set.assignments.filter((a) => a.status === "INVITED").length;
  if (awaiting > 0) {
    out.push({
      label: `${awaiting} awaiting reply`,
      tone: "amber",
    });
  }

  const declined = set.assignments.filter((a) => a.status === "DECLINED").length;
  if (declined > 0) {
    out.push({
      label: declined === 1 ? "1 declined" : `${declined} declined`,
      tone: "clay",
    });
  }

  if (set.songs.length === 0) {
    out.push({ label: "No songs yet", tone: "amber" });
  }

  return out;
}

export async function getHome(ctx: ChurchContext, now: Date = new Date()) {
  const [upcoming, past] = await Promise.all([
    listUpcomingServices(ctx, { take: 12 }, now),
    listRecentServices(ctx, { take: 8 }, now),
  ]);
  return { upcoming, past };
}

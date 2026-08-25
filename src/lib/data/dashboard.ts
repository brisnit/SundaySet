import "server-only";

import { db } from "@/lib/db";
import { openPositions } from "@/lib/domain/roster";

import { scope, type ChurchContext } from "./context";
import { getNextService, listUpcomingServices, todayUtc } from "./services";
import { songLibraryStats } from "./songs";

export type Alert = {
  tone: "clay" | "amber" | "slate";
  message: string;
  href: string;
};

/** Everything Home needs to answer "what's happening Sunday?" in one place. */
export async function getDashboard(ctx: ChurchContext, now: Date = new Date()) {
  const [nextService, upcoming, library, awaitingCount, missingChartSongs] =
    await Promise.all([
      getNextService(ctx, now),
      listUpcomingServices(ctx, { take: 4, skipFirst: true }, now),
      songLibraryStats(ctx),
      db.assignment.count({
        where: {
          service: { ...scope(ctx), date: { gte: todayUtc(now) } },
          status: "INVITED",
        },
      }),
      // Only songs actually scheduled soon. A count across the whole library
      // is technically true but not actionable — nobody chases a chart for a
      // song they are not about to play.
      db.song.findMany({
        where: {
          ...scope(ctx),
          chart: { is: null },
          serviceSongs: {
            some: { service: { ...scope(ctx), date: { gte: todayUtc(now) } } },
          },
        },
        select: { id: true, title: true },
      }),
    ]);

  const open = nextService
    ? openPositions(nextService.assignments.map((a) => a.position.name))
    : [];

  const alerts: Alert[] = [];
  if (open.length > 0) {
    alerts.push({
      tone: "clay",
      message:
        open.length === 1
          ? `1 position needs someone — ${open[0]}`
          : `${open.length} positions need someone`,
      href: nextService ? `/plan/${nextService.id}` : "/plan",
    });
  }
  if (awaitingCount > 0) {
    alerts.push({
      tone: "amber",
      message:
        awaitingCount === 1
          ? "1 invitation awaiting response"
          : `${awaitingCount} invitations awaiting response`,
      href: "/messages",
    });
  }
  if (missingChartSongs.length > 0) {
    alerts.push({
      tone: "slate",
      message:
        missingChartSongs.length === 1
          ? `1 chart is missing — ${missingChartSongs[0].title}`
          : `${missingChartSongs.length} charts are missing for upcoming songs`,
      href: "/songs?chart=missing",
    });
  }

  return { nextService, upcoming, library, alerts, openPositions: open };
}

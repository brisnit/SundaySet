import "server-only";

import type { ServiceStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

import { NotFoundError, scope, scopedById, type ChurchContext } from "./context";

/** UTC-midnight today, matching how @db.Date columns are stored. */
export function todayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const serviceSummary = {
  sermon: true,
  specialDate: true,
  serviceType: true,
  songs: {
    orderBy: { position: "asc" as const },
    include: { song: { select: { id: true, title: true, artist: true, churchKey: true } } },
  },
  assignments: {
    include: {
      teamMember: { select: { id: true, name: true, avatarUrl: true } },
      position: { select: { id: true, name: true, category: true, sortOrder: true } },
      invitation: { select: { id: true, sentAt: true, respondedAt: true } },
    },
  },
};

export async function listServices(
  ctx: ChurchContext,
  opts: { from?: Date; to?: Date; status?: ServiceStatus[]; take?: number } = {},
) {
  return db.service.findMany({
    where: {
      ...scope(ctx),
      ...(opts.from || opts.to
        ? { date: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
        : {}),
      ...(opts.status?.length ? { status: { in: opts.status } } : {}),
    },
    include: serviceSummary,
    orderBy: { date: "asc" },
    ...(opts.take ? { take: opts.take } : {}),
  });
}

/** The next service on or after today — what the Home dashboard answers. */
export async function getNextService(ctx: ChurchContext, now: Date = new Date()) {
  return db.service.findFirst({
    where: { ...scope(ctx), date: { gte: todayUtc(now) } },
    include: serviceSummary,
    orderBy: { date: "asc" },
  });
}

export async function listUpcomingServices(
  ctx: ChurchContext,
  opts: { take?: number; skipFirst?: boolean } = {},
  now: Date = new Date(),
) {
  return db.service.findMany({
    where: { ...scope(ctx), date: { gte: todayUtc(now) } },
    include: serviceSummary,
    orderBy: { date: "asc" },
    skip: opts.skipFirst ? 1 : 0,
    take: opts.take ?? 6,
  });
}

export async function listRecentServices(
  ctx: ChurchContext,
  opts: { take?: number } = {},
  now: Date = new Date(),
) {
  return db.service.findMany({
    where: { ...scope(ctx), date: { lt: todayUtc(now) } },
    include: serviceSummary,
    orderBy: { date: "desc" },
    take: opts.take ?? 5,
  });
}

export async function getServiceById(ctx: ChurchContext, id: string) {
  const service = await db.service.findFirst({
    where: scopedById(ctx, id),
    include: serviceSummary,
  });
  if (!service) throw new NotFoundError("Service");
  return service;
}

export async function serviceCounts(ctx: ChurchContext, now: Date = new Date()) {
  const [draft, upcoming, awaitingResponse, openPositions] = await Promise.all([
    db.service.count({ where: { ...scope(ctx), status: "DRAFT" } }),
    db.service.count({ where: { ...scope(ctx), date: { gte: todayUtc(now) } } }),
    db.assignment.count({
      where: { service: scope(ctx), status: "INVITED" },
    }),
    db.service.count({
      where: { ...scope(ctx), date: { gte: todayUtc(now) }, assignments: { none: {} } },
    }),
  ]);
  return { draft, upcoming, awaitingResponse, openPositions };
}

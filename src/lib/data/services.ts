import "server-only";

import { cache } from "react";

import type { ServiceStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { ServiceInput } from "@/lib/validation/service";

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

/**
 * Wrapped in React `cache` because generateMetadata and the page body both read
 * the same record, which was two identical cross-region queries per page view.
 * `getChurchContext` is itself cached, so ctx is the same object reference
 * within a request and the memo key matches.
 */
export const getServiceById = cache(
  async (ctx: ChurchContext, id: string) => {
    const service = await db.service.findFirst({
      where: scopedById(ctx, id),
      include: serviceSummary,
    });
    if (!service) throw new NotFoundError("Service");
    return service;
  },
);

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

// ---------------------------------------------------------------------------
// Writes
//
// Same rules as the song layer: scoped updateMany/deleteMany rather than
// update/delete, which demand a unique selector and would key on a bare id.
// Sermon carries no churchId of its own, so it is only ever touched after
// ownership of the parent service has been proven.
// ---------------------------------------------------------------------------

/**
 * A service type referenced by id must belong to the caller's church, or one
 * church could attach its services to another's schedule.
 */
async function assertServiceTypeOwned(ctx: ChurchContext, serviceTypeId?: string) {
  if (!serviceTypeId) return;
  const owned = await db.serviceType.findFirst({
    where: { id: serviceTypeId, ...scope(ctx) },
    select: { id: true },
  });
  if (!owned) throw new NotFoundError("Service type");
}


function serviceFields(input: ServiceInput) {
  return {
    date: input.date,
    serviceTypeId: input.serviceTypeId ?? null,
    startTime: input.startTime,
    callTime: input.callTime ?? null,
    title: input.title ?? null,
    notes: input.notes ?? null,
    status: input.status,
  };
}

export async function createService(ctx: ChurchContext, input: ServiceInput) {
  await assertServiceTypeOwned(ctx, input.serviceTypeId);

  return db.service.create({
    data: {
      ...serviceFields(input),
      churchId: ctx.churchId,
      createdById: ctx.userId,
    },
  });
}

export async function updateService(
  ctx: ChurchContext,
  id: string,
  input: ServiceInput,
) {
  await assertServiceTypeOwned(ctx, input.serviceTypeId);

  const { count } = await db.service.updateMany({
    where: scopedById(ctx, id),
    data: serviceFields(input),
  });
  // A zero count means the service is not this church's — indistinguishable
  // from it not existing, which is the point.
  if (count === 0) throw new NotFoundError("Service");

  // Sermon is dormant: removed from the product, but existing rows are left
  // untouched rather than silently deleted on every edit.
}

export async function deleteService(ctx: ChurchContext, id: string) {
  const { count } = await db.service.deleteMany({ where: scopedById(ctx, id) });
  if (count === 0) throw new NotFoundError("Service");
}

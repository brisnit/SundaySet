import "server-only";

import { db } from "@/lib/db";

import { scope, type ChurchContext } from "./context";

export async function getWorshipProfile(ctx: ChurchContext) {
  return db.worshipProfile.findUnique({ where: { churchId: ctx.churchId } });
}

export async function listServiceTypes(ctx: ChurchContext) {
  return db.serviceType.findMany({
    where: { ...scope(ctx), active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listSpecialDates(
  ctx: ChurchContext,
  opts: { from?: Date; to?: Date } = {},
) {
  return db.specialDate.findMany({
    where: {
      ...scope(ctx),
      ...(opts.from || opts.to
        ? { date: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } }
        : {}),
    },
    orderBy: { date: "asc" },
  });
}

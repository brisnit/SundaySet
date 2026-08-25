import "server-only";

import { db } from "@/lib/db";

import { NotFoundError, scope, scopedById, type ChurchContext } from "./context";

export async function listTeamMembers(
  ctx: ChurchContext,
  opts: { activeOnly?: boolean } = {},
) {
  return db.teamMember.findMany({
    where: { ...scope(ctx), ...(opts.activeOnly ? { active: true } : {}) },
    include: {
      positions: { include: { position: true } },
      blockouts: { orderBy: { startDate: "asc" } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getTeamMemberById(ctx: ChurchContext, id: string) {
  const member = await db.teamMember.findFirst({
    where: scopedById(ctx, id),
    include: {
      positions: { include: { position: true } },
      blockouts: { orderBy: { startDate: "asc" } },
      assignments: {
        include: { service: true, position: true },
        orderBy: { service: { date: "desc" } },
        take: 20,
      },
    },
  });
  if (!member) throw new NotFoundError("Team member");
  return member;
}

export async function listPositions(ctx: ChurchContext) {
  return db.position.findMany({
    where: { ...scope(ctx), active: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function teamStats(ctx: ChurchContext) {
  const [total, active, withBlockouts] = await Promise.all([
    db.teamMember.count({ where: scope(ctx) }),
    db.teamMember.count({ where: { ...scope(ctx), active: true } }),
    db.teamMember.count({ where: { ...scope(ctx), blockouts: { some: {} } } }),
  ]);
  return { total, active, withBlockouts };
}

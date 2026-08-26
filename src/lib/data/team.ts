import "server-only";

import { cache } from "react";

import { db } from "@/lib/db";
import type { TeamMemberInput } from "@/lib/validation/team";

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

/**
 * Wrapped in React `cache` because generateMetadata and the page body both read
 * the same record, which was two identical cross-region queries per page view.
 * `getChurchContext` is itself cached, so ctx is the same object reference
 * within a request and the memo key matches.
 */
export const getTeamMemberById = cache(
  async (ctx: ChurchContext, id: string) => {
  const member = await db.teamMember.findFirst({
    where: scopedById(ctx, id),
    include: {
      positions: { include: { position: true } },
      blockouts: { orderBy: { startDate: "asc" } },
      preferredServiceType: { select: { id: true, name: true } },
      assignments: {
        include: { service: true, position: true },
        orderBy: { service: { date: "desc" } },
        take: 20,
      },
    },
  });
    if (!member) throw new NotFoundError("Team member");
    return member;
  },
);

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

// ---------------------------------------------------------------------------
// Writes
//
// TeamMemberPosition carries no churchId, so it is only ever written after the
// parent member is resolved church-scoped, and every position id is re-checked
// against the church before it is linked.
// ---------------------------------------------------------------------------

/** Positions referenced by id must belong to this church. */
async function assertPositionsOwned(ctx: ChurchContext, positionIds: string[]) {
  if (positionIds.length === 0) return;
  const unique = [...new Set(positionIds)];
  const owned = await db.position.findMany({
    where: { id: { in: unique }, ...scope(ctx) },
    select: { id: true },
  });
  if (owned.length !== unique.length) throw new NotFoundError("Position");
}

async function assertServiceTypeOwned(ctx: ChurchContext, serviceTypeId?: string) {
  if (!serviceTypeId) return;
  const owned = await db.serviceType.findFirst({
    where: { id: serviceTypeId, ...scope(ctx) },
    select: { id: true },
  });
  if (!owned) throw new NotFoundError("Service type");
}

function memberFields(input: TeamMemberInput) {
  return {
    name: input.name,
    email: input.email ?? null,
    phone: input.phone ?? null,
    vocalRange: input.vocalRange ?? null,
    notes: input.notes ?? null,
    active: input.active,
    preferredPerMonth: input.preferredPerMonth,
    preferredServiceTypeId: input.preferredServiceTypeId ?? null,
  };
}

export async function createTeamMember(
  ctx: ChurchContext,
  input: TeamMemberInput,
) {
  await assertPositionsOwned(ctx, input.positionIds);
  await assertServiceTypeOwned(ctx, input.preferredServiceTypeId);

  // userId is deliberately left null: being on the roster never requires an
  // account. It is only linked later if the person signs in.
  return db.teamMember.create({
    data: {
      ...memberFields(input),
      churchId: ctx.churchId,
      positions: {
        create: input.positionIds.map((positionId) => ({ positionId })),
      },
    },
  });
}

export async function updateTeamMember(
  ctx: ChurchContext,
  id: string,
  input: TeamMemberInput,
) {
  await assertPositionsOwned(ctx, input.positionIds);
  await assertServiceTypeOwned(ctx, input.preferredServiceTypeId);

  const { count } = await db.teamMember.updateMany({
    where: scopedById(ctx, id),
    data: memberFields(input),
  });
  if (count === 0) throw new NotFoundError("Team member");

  await syncPositions(id, input.positionIds);
}

/**
 * Brings the member's positions in line with the selection.
 *
 * Only the difference is written, so existing rows keep their `priority`, which
 * the scheduler will use to break ties between people who can cover the same
 * spot.
 */
async function syncPositions(teamMemberId: string, positionIds: string[]) {
  const wanted = new Set(positionIds);
  const current = await db.teamMemberPosition.findMany({
    where: { teamMemberId },
    select: { positionId: true },
  });
  const held = new Set(current.map((c) => c.positionId));

  const toRemove = [...held].filter((p) => !wanted.has(p));
  const toAdd = [...wanted].filter((p) => !held.has(p));

  if (toRemove.length > 0) {
    await db.teamMemberPosition.deleteMany({
      where: { teamMemberId, positionId: { in: toRemove } },
    });
  }
  if (toAdd.length > 0) {
    await db.teamMemberPosition.createMany({
      data: toAdd.map((positionId) => ({ teamMemberId, positionId })),
      skipDuplicates: true,
    });
  }
}

export async function setTeamMemberActive(
  ctx: ChurchContext,
  id: string,
  active: boolean,
) {
  const { count } = await db.teamMember.updateMany({
    where: scopedById(ctx, id),
    data: { active },
  });
  if (count === 0) throw new NotFoundError("Team member");
}

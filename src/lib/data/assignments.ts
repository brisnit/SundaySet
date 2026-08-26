import "server-only";

import type { AssignmentStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  candidateRank,
  findConflicts,
  type Conflict,
} from "@/lib/domain/scheduling";

import { NotFoundError, scope, scopedById, type ChurchContext } from "./context";

/**
 * Assignment reads and writes.
 *
 * Assignment carries no churchId; tenancy is reached through
 * `service: scope(ctx)`, as with ServiceSong.
 *
 * Position has no relation to Service or ServiceType in this schema, so there
 * is no "positions required for this service" concept to read. The scheduler
 * therefore lists the church's own active positions. See handoff §21.
 */

export class DuplicateAssignmentError extends Error {
  constructor() {
    super("That person is already assigned to this position.");
    this.name = "DuplicateAssignmentError";
  }
}

const PRISMA_UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === PRISMA_UNIQUE_VIOLATION
  );
}

function monthBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start, end };
}

async function loadService(ctx: ChurchContext, serviceId: string) {
  const service = await db.service.findFirst({
    where: scopedById(ctx, serviceId),
    select: { id: true, date: true, callTime: true },
  });
  if (!service) throw new NotFoundError("Service");
  return service;
}

export type TeamSlot = {
  positionId: string;
  positionName: string;
  category: string;
  assignments: Array<{
    id: string;
    status: AssignmentStatus;
    teamMemberId: string;
    name: string;
    active: boolean;
    /** Conflicts recomputed against the current roster, not frozen at assign time. */
    conflicts: Conflict[];
  }>;
};

/**
 * The team for one service, as the church's positions with whoever is assigned
 * under each. Conflicts are recomputed on read, so a blockout added after the
 * assignment still surfaces.
 */
export async function getServiceTeam(
  ctx: ChurchContext,
  serviceId: string,
): Promise<TeamSlot[]> {
  const service = await loadService(ctx, serviceId);
  const { start, end } = monthBounds(service.date);

  const [positions, assignments] = await Promise.all([
    db.position.findMany({
      where: { ...scope(ctx), active: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    db.assignment.findMany({
      where: { serviceId, service: scope(ctx) },
      include: {
        position: { select: { id: true, name: true, category: true } },
        teamMember: {
          select: {
            id: true,
            name: true,
            active: true,
            preferredPerMonth: true,
            blockouts: { select: { startDate: true, endDate: true, note: true } },
            positions: { select: { positionId: true } },
          },
        },
      },
    }),
  ]);

  const memberIds = [...new Set(assignments.map((a) => a.teamMemberId))];
  const monthLoad = await monthlyLoad(ctx, memberIds, start, end);

  // Positions may hold more than one person, and a position with someone
  // assigned but since deactivated must still appear.
  const slots = new Map<string, TeamSlot>();
  for (const p of positions) {
    slots.set(p.id, {
      positionId: p.id,
      positionName: p.name,
      category: p.category,
      assignments: [],
    });
  }

  for (const a of assignments) {
    const slot =
      slots.get(a.positionId) ??
      ({
        positionId: a.position.id,
        positionName: a.position.name,
        category: a.position.category,
        assignments: [],
      } satisfies TeamSlot);
    slots.set(a.positionId, slot);

    const others = assignments
      .filter((x) => x.teamMemberId === a.teamMemberId && x.id !== a.id)
      .map((x) => x.positionId);

    slot.assignments.push({
      id: a.id,
      status: a.status,
      teamMemberId: a.teamMemberId,
      name: a.teamMember.name,
      active: a.teamMember.active,
      conflicts: findConflicts(
        {
          active: a.teamMember.active,
          qualifiedPositionIds: a.teamMember.positions.map((p) => p.positionId),
          blockouts: a.teamMember.blockouts,
          preferredPerMonth: a.teamMember.preferredPerMonth,
          positionsInThisService: others,
          assignmentsThisMonth: monthLoad.get(a.teamMemberId) ?? 0,
          declinedThisService: false,
        },
        a.positionId,
        service.date,
      ),
    });
  }

  return [...slots.values()];
}

/** How many services each member is already on in the given month. */
async function monthlyLoad(
  ctx: ChurchContext,
  memberIds: string[],
  start: Date,
  end: Date,
): Promise<Map<string, number>> {
  if (memberIds.length === 0) return new Map();
  const rows = await db.assignment.groupBy({
    by: ["teamMemberId"],
    where: {
      teamMemberId: { in: memberIds },
      status: { not: "CANCELLED" },
      service: { ...scope(ctx), date: { gte: start, lte: end } },
    },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.teamMemberId, r._count._all]));
}

/**
 * Raw scheduling inputs for every roster member, for one service.
 *
 * The page sends this once and the picker evaluates conflicts per position in
 * the browser with the same pure `findConflicts`, so opening the picker for any
 * of a dozen positions costs no round trip. Scheduling a whole Sunday stays
 * fast.
 */
export type CandidatePoolMember = {
  id: string;
  name: string;
  active: boolean;
  qualifiedPositionIds: string[];
  blockouts: Array<{ startDate: Date; endDate: Date; note: string | null }>;
  preferredPerMonth: number;
  assignmentsThisMonth: number;
  preferredServiceTypeName: string | null;
  positionsInThisService: string[];
  declinedThisService: boolean;
};

export async function listCandidatePool(
  ctx: ChurchContext,
  serviceId: string,
  opts: { includeInactive?: boolean } = {},
): Promise<CandidatePoolMember[]> {
  const service = await loadService(ctx, serviceId);

  const members = await db.teamMember.findMany({
    where: { ...scope(ctx), ...(opts.includeInactive ? {} : { active: true }) },
    select: {
      id: true,
      name: true,
      active: true,
      preferredPerMonth: true,
      preferredServiceType: { select: { name: true } },
      blockouts: { select: { startDate: true, endDate: true, note: true } },
      positions: { select: { positionId: true } },
    },
    orderBy: { name: "asc" },
  });

  const inService = await db.assignment.findMany({
    where: { serviceId, service: scope(ctx) },
    select: { teamMemberId: true, positionId: true, status: true },
  });

  const { start, end } = monthBounds(service.date);
  const monthLoad = await monthlyLoad(
    ctx,
    members.map((m) => m.id),
    start,
    end,
  );

  return members.map((m) => {
    const theirs = inService.filter((a) => a.teamMemberId === m.id);
    return {
      id: m.id,
      name: m.name,
      active: m.active,
      qualifiedPositionIds: m.positions.map((p) => p.positionId),
      blockouts: m.blockouts,
      preferredPerMonth: m.preferredPerMonth,
      assignmentsThisMonth: monthLoad.get(m.id) ?? 0,
      preferredServiceTypeName: m.preferredServiceType?.name ?? null,
      positionsInThisService: theirs.map((a) => a.positionId),
      declinedThisService: theirs.some((a) => a.status === "DECLINED"),
    };
  });
}

export type Candidate = {
  id: string;
  name: string;
  active: boolean;
  qualified: boolean;
  preferredPerMonth: number;
  assignmentsThisMonth: number;
  preferredServiceTypeName: string | null;
  conflicts: Conflict[];
};

/**
 * Everyone who could take a position, ranked but never filtered.
 *
 * A blocked-out or unqualified person stays in the list with the reason shown.
 * Removing them would leave the leader wondering where they went, and they may
 * know something the roster does not.
 */
export async function listCandidates(
  ctx: ChurchContext,
  serviceId: string,
  positionId: string,
  opts: { includeInactive?: boolean } = {},
): Promise<Candidate[]> {
  const position = await db.position.findFirst({
    where: { id: positionId, ...scope(ctx) },
    select: { id: true },
  });
  if (!position) throw new NotFoundError("Position");

  const service = await loadService(ctx, serviceId);
  const pool = await listCandidatePool(ctx, serviceId, opts);

  return pool
    .map((m) => {
      const qualified = m.qualifiedPositionIds.includes(positionId);
      const conflicts = findConflicts(m, positionId, service.date);
      return {
        candidate: {
          id: m.id,
          name: m.name,
          active: m.active,
          qualified,
          preferredPerMonth: m.preferredPerMonth,
          assignmentsThisMonth: m.assignmentsThisMonth,
          preferredServiceTypeName: m.preferredServiceTypeName,
          conflicts,
        } satisfies Candidate,
        rank: candidateRank(conflicts, qualified),
      };
    })
    .sort((a, b) => a.rank - b.rank || a.candidate.name.localeCompare(b.candidate.name))
    .map((x) => x.candidate);
}

/** Both the member and the position must belong to the caller's church. */
async function assertAssignable(
  ctx: ChurchContext,
  teamMemberId: string,
  positionId: string,
) {
  const [member, position] = await Promise.all([
    db.teamMember.findFirst({
      where: scopedById(ctx, teamMemberId),
      select: { id: true },
    }),
    db.position.findFirst({
      where: { id: positionId, ...scope(ctx) },
      select: { id: true },
    }),
  ]);
  if (!member) throw new NotFoundError("Team member");
  if (!position) throw new NotFoundError("Position");
}

/**
 * Creates an assignment at the schema's default status, PENDING — scheduled but
 * not yet invited. Invitations (Block 5) move it to INVITED.
 */
export async function assignMember(
  ctx: ChurchContext,
  serviceId: string,
  teamMemberId: string,
  positionId: string,
) {
  const service = await loadService(ctx, serviceId);
  await assertAssignable(ctx, teamMemberId, positionId);

  try {
    return await db.assignment.create({
      data: {
        serviceId: service.id,
        teamMemberId,
        positionId,
        status: "PENDING",
        callTime: service.callTime,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new DuplicateAssignmentError();
    throw e;
  }
}

async function findAssignment(ctx: ChurchContext, assignmentId: string) {
  const row = await db.assignment.findFirst({
    where: { id: assignmentId, service: scope(ctx) },
    select: { id: true, serviceId: true, positionId: true, teamMemberId: true },
  });
  if (!row) throw new NotFoundError("Assignment");
  return row;
}

/**
 * Swaps in a different person, keeping the slot.
 *
 * Status resets to PENDING and any response is cleared, because an acceptance
 * belonged to the person being replaced and must not carry over.
 */
export async function reassignMember(
  ctx: ChurchContext,
  assignmentId: string,
  teamMemberId: string,
) {
  const row = await findAssignment(ctx, assignmentId);
  if (row.teamMemberId === teamMemberId) return;

  await assertAssignable(ctx, teamMemberId, row.positionId);

  const clash = await db.assignment.findFirst({
    where: {
      serviceId: row.serviceId,
      teamMemberId,
      positionId: row.positionId,
    },
    select: { id: true },
  });
  if (clash) throw new DuplicateAssignmentError();

  await db.assignment.updateMany({
    where: { id: row.id, service: scope(ctx) },
    data: { teamMemberId, status: "PENDING", respondedAt: null },
  });
}

export async function removeAssignment(ctx: ChurchContext, assignmentId: string) {
  const { count } = await db.assignment.deleteMany({
    where: { id: assignmentId, service: scope(ctx) },
  });
  if (count === 0) throw new NotFoundError("Assignment");
}

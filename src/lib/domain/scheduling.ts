/**
 * Scheduling conflict detection.
 *
 * Every check here produces a WARNING, never a veto. The worship leader knows
 * things the database does not — a musician who said "text me anyway if you're
 * stuck" is not visible in a blockout row. So a person with a conflict stays in
 * the candidate list with the conflict shown against their name, rather than
 * quietly disappearing and leaving the leader to wonder where they went.
 *
 * The one genuine hard constraint comes from the schema:
 * @@unique([serviceId, teamMemberId, positionId]) — the same person cannot hold
 * the same position twice in one service. That is enforced in the data layer.
 */

export type ConflictKind =
  | "BLOCKED_OUT"
  | "INACTIVE"
  | "NOT_QUALIFIED"
  | "ALREADY_IN_SERVICE"
  | "OVER_COMMITTED"
  | "DECLINED_THIS_SERVICE";

export type Conflict = {
  kind: ConflictKind;
  /** Shown next to the person's name. Written for a human, not a log. */
  message: string;
  severity: "conflict" | "caution";
};

export type BlockoutWindow = { startDate: Date; endDate: Date; note: string | null };

export type CandidateInput = {
  active: boolean;
  /** Position ids this person has on their profile. */
  qualifiedPositionIds: string[];
  blockouts: BlockoutWindow[];
  preferredPerMonth: number;
  /** Positions they already hold in THIS service. */
  positionsInThisService: string[];
  /** Assignments they already hold in the service's calendar month. */
  assignmentsThisMonth: number;
  /** True when they have declined something in this service already. */
  declinedThisService: boolean;
};

/** Inclusive on both ends — a one-day blockout has startDate === endDate. */
export function isBlockedOn(
  blockouts: BlockoutWindow[],
  date: Date,
): BlockoutWindow | undefined {
  const day = date.getTime();
  return blockouts.find(
    (b) => b.startDate.getTime() <= day && day <= b.endDate.getTime(),
  );
}

function formatRange(b: BlockoutWindow): string {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
    }).format(d);
  const range =
    b.startDate.getTime() === b.endDate.getTime()
      ? fmt(b.startDate)
      : `${fmt(b.startDate)} – ${fmt(b.endDate)}`;
  return b.note ? `${range} (${b.note})` : range;
}

/**
 * All reasons to hesitate about one person for one position, most serious
 * first. An empty array means nothing stands in the way.
 */
export function findConflicts(
  candidate: CandidateInput,
  positionId: string,
  serviceDate: Date,
): Conflict[] {
  const conflicts: Conflict[] = [];

  const blockout = isBlockedOn(candidate.blockouts, serviceDate);
  if (blockout) {
    conflicts.push({
      kind: "BLOCKED_OUT",
      message: `Unavailable ${formatRange(blockout)}`,
      severity: "conflict",
    });
  }

  if (candidate.declinedThisService) {
    conflicts.push({
      kind: "DECLINED_THIS_SERVICE",
      message: "Already declined this service",
      severity: "conflict",
    });
  }

  if (!candidate.active) {
    conflicts.push({
      kind: "INACTIVE",
      message: "Not currently serving",
      severity: "conflict",
    });
  }

  if (candidate.positionsInThisService.length > 0) {
    conflicts.push({
      kind: "ALREADY_IN_SERVICE",
      message:
        candidate.positionsInThisService.length === 1
          ? "Already on this service"
          : `Already on this service in ${candidate.positionsInThisService.length} positions`,
      severity: "caution",
    });
  }

  if (!candidate.qualifiedPositionIds.includes(positionId)) {
    conflicts.push({
      kind: "NOT_QUALIFIED",
      message: "This position is not on their profile",
      severity: "caution",
    });
  }

  // 0 means "no preference", so it can never be exceeded.
  if (
    candidate.preferredPerMonth > 0 &&
    candidate.assignmentsThisMonth >= candidate.preferredPerMonth
  ) {
    conflicts.push({
      kind: "OVER_COMMITTED",
      message: `Already serving ${candidate.assignmentsThisMonth}× this month (prefers ${candidate.preferredPerMonth})`,
      severity: "caution",
    });
  }

  return conflicts;
}

/** Qualified and unblocked people sort to the top; nobody is removed. */
export function candidateRank(
  conflicts: Conflict[],
  qualified: boolean,
): number {
  const hard = conflicts.filter((c) => c.severity === "conflict").length;
  const soft = conflicts.filter((c) => c.severity === "caution").length;
  return (qualified ? 0 : 100) + hard * 10 + soft;
}

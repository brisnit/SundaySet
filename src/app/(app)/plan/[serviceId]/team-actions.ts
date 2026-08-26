"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import {
  assignMember,
  DuplicateAssignmentError,
  reassignMember,
  removeAssignment,
} from "@/lib/data/assignments";
import { NotFoundError } from "@/lib/data/context";
import {
  assignSchema,
  reassignSchema,
  removeAssignmentSchema,
} from "@/lib/validation/assignment";

/**
 * Team assignment mutations.
 *
 * Gated on team:schedule — the permission for building a team, which worship
 * leaders and team leaders hold, as distinct from team:manage which edits the
 * roster itself.
 */
export type TeamResult = { error?: string };

function refresh(serviceId: string) {
  revalidatePath(`/plan/${serviceId}`);
  revalidatePath("/plan");
  revalidatePath("/home");
}

export async function assignAction(
  serviceId: string,
  teamMemberId: string,
  positionId: string,
): Promise<TeamResult> {
  const ctx = await requirePermission("team:schedule");

  const parsed = assignSchema.safeParse({ serviceId, teamMemberId, positionId });
  if (!parsed.success) return { error: "That assignment could not be made." };

  try {
    await assignMember(
      ctx,
      parsed.data.serviceId,
      parsed.data.teamMemberId,
      parsed.data.positionId,
    );
  } catch (e) {
    if (e instanceof DuplicateAssignmentError) return { error: e.message };
    if (e instanceof NotFoundError) {
      return { error: "That person or position no longer exists." };
    }
    throw e;
  }

  refresh(serviceId);
  return {};
}

export async function reassignAction(
  serviceId: string,
  assignmentId: string,
  teamMemberId: string,
): Promise<TeamResult> {
  const ctx = await requirePermission("team:schedule");

  const parsed = reassignSchema.safeParse({ assignmentId, teamMemberId });
  if (!parsed.success) return { error: "That change could not be made." };

  try {
    await reassignMember(ctx, parsed.data.assignmentId, parsed.data.teamMemberId);
  } catch (e) {
    if (e instanceof DuplicateAssignmentError) return { error: e.message };
    if (e instanceof NotFoundError) {
      return { error: "That assignment no longer exists." };
    }
    throw e;
  }

  refresh(serviceId);
  return {};
}

export async function removeAssignmentAction(
  serviceId: string,
  assignmentId: string,
): Promise<TeamResult> {
  const ctx = await requirePermission("team:schedule");

  const parsed = removeAssignmentSchema.safeParse({ assignmentId });
  if (!parsed.success) return { error: "That assignment could not be removed." };

  try {
    await removeAssignment(ctx, parsed.data.assignmentId);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return { error: "That assignment is already gone." };
    }
    throw e;
  }

  refresh(serviceId);
  return {};
}

import { z } from "zod";

const id = z.string().trim().min(1).max(64);

export const assignSchema = z.object({
  serviceId: id,
  teamMemberId: id,
  positionId: id,
});

export const reassignSchema = z.object({
  assignmentId: id,
  teamMemberId: id,
});

export const removeAssignmentSchema = z.object({
  assignmentId: id,
});

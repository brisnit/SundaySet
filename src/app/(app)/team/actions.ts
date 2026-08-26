"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import {
  createTeamMember,
  setTeamMemberActive,
  updateTeamMember,
} from "@/lib/data/team";
import {
  checkboxToBoolean,
  teamMemberInputSchema,
} from "@/lib/validation/team";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

function parseMember(formData: FormData) {
  return teamMemberInputSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    vocalRange: formData.get("vocalRange"),
    notes: formData.get("notes"),
    active: checkboxToBoolean(formData.get("active")),
    preferredPerMonth: formData.get("preferredPerMonth"),
    preferredServiceTypeId: formData.get("preferredServiceTypeId"),
    positionIds: formData.getAll("positionIds").map(String),
  });
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    out[key] ??= i.message;
  }
  return out;
}

export async function createTeamMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("team:manage");

  const parsed = parseMember(formData);
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  let memberId: string;
  try {
    const member = await createTeamMember(ctx, parsed.data);
    memberId = member.id;
  } catch (e) {
    if (e instanceof NotFoundError) {
      return { error: "One of those positions no longer exists. Reload and try again." };
    }
    throw e;
  }

  revalidatePath("/team");
  redirect(`/team/${memberId}`);
}

export async function updateTeamMemberAction(
  teamMemberId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("team:manage");

  const parsed = parseMember(formData);
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  try {
    await updateTeamMember(ctx, teamMemberId, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) {
      return { error: "That person is no longer on your team." };
    }
    throw e;
  }

  revalidatePath("/team");
  revalidatePath(`/team/${teamMemberId}`);
  redirect(`/team/${teamMemberId}`);
}

export async function setActiveAction(teamMemberId: string, active: boolean) {
  const ctx = await requirePermission("team:manage");
  await setTeamMemberActive(ctx, teamMemberId, active);
  revalidatePath("/team");
  revalidatePath(`/team/${teamMemberId}`);
}

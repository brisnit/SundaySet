"use server";

import { revalidatePath } from "next/cache";

import { signOut } from "@/auth";
import { requireChurchContext } from "@/lib/auth/session";
import {
  clearAvatarImage,
  setAvatarImage,
  updateAccount,
} from "@/lib/data/account";
import { getStorage, storageStatus, UploadError } from "@/lib/storage";
import { accountInputSchema } from "@/lib/validation/account";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean };

/**
 * Account actions.
 *
 * None of these accept a user id — they act on the signed-in account resolved
 * server-side, so one account can never edit another's profile.
 */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    out[key] ??= i.message;
  }
  return out;
}

export async function updateAccountAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireChurchContext();

  const parsed = accountInputSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    avatarColor: formData.get("avatarColor"),
  });
  if (!parsed.success) {
    return {
      error: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  await updateAccount(ctx, parsed.data);
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function uploadAvatarAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requireChurchContext();

  if (!storageStatus().available) {
    return { error: "Photo uploads are not configured yet." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." };
  }

  try {
    const stored = await getStorage().put(file, `avatars/${ctx.churchId}`, "image");
    const previous = await setAvatarImage(ctx, stored.url);
    if (previous) {
      // Best effort: an orphaned file is recoverable, a failed save is not.
      await getStorage().remove(previous).catch(() => {});
    }
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    throw e;
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeAvatarAction(): Promise<void> {
  const ctx = await requireChurchContext();
  const previous = await clearAvatarImage(ctx);
  if (previous) await getStorage().remove(previous).catch(() => {});
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

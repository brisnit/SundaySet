"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import {
  addSongToService,
  DuplicateSongError,
  moveServiceSong,
  removeSongFromService,
  setServiceSongKey,
} from "@/lib/data/setlist";
import {
  addSongSchema,
  moveSchema,
  removeSchema,
  setKeySchema,
} from "@/lib/validation/setlist";

/**
 * Setlist mutations.
 *
 * Each returns an error string rather than throwing, so the builder can show a
 * message inline without losing the rest of the page. Every one re-checks
 * songs:manage server-side.
 */
export type SetlistResult = { error?: string };

function refresh(serviceId: string) {
  revalidatePath(`/plan/${serviceId}`);
  revalidatePath("/plan");
  revalidatePath("/home");
}

export async function addSongAction(
  serviceId: string,
  songId: string,
): Promise<SetlistResult> {
  const ctx = await requirePermission("songs:manage");

  const parsed = addSongSchema.safeParse({ serviceId, songId });
  if (!parsed.success) return { error: "That song could not be added." };

  try {
    await addSongToService(ctx, parsed.data.serviceId, parsed.data.songId);
  } catch (e) {
    if (e instanceof DuplicateSongError) return { error: e.message };
    if (e instanceof NotFoundError) {
      return { error: "That song or service no longer exists." };
    }
    throw e;
  }

  refresh(serviceId);
  return {};
}

export async function removeSongAction(
  serviceId: string,
  serviceSongId: string,
): Promise<SetlistResult> {
  const ctx = await requirePermission("songs:manage");

  const parsed = removeSchema.safeParse({ serviceSongId });
  if (!parsed.success) return { error: "That song could not be removed." };

  try {
    await removeSongFromService(ctx, parsed.data.serviceSongId);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "That song is no longer in the set." };
    throw e;
  }

  refresh(serviceId);
  return {};
}

export async function setKeyAction(
  serviceId: string,
  serviceSongId: string,
  key: string,
): Promise<SetlistResult> {
  const ctx = await requirePermission("songs:manage");

  const parsed = setKeySchema.safeParse({ serviceSongId, key });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That key is not valid." };
  }

  try {
    await setServiceSongKey(ctx, parsed.data.serviceSongId, parsed.data.key);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "That song is no longer in the set." };
    throw e;
  }

  refresh(serviceId);
  return {};
}

export async function moveSongAction(
  serviceId: string,
  serviceSongId: string,
  direction: "up" | "down",
): Promise<SetlistResult> {
  const ctx = await requirePermission("songs:manage");

  const parsed = moveSchema.safeParse({ serviceSongId, direction });
  if (!parsed.success) return { error: "That song could not be moved." };

  try {
    await moveServiceSong(ctx, parsed.data.serviceSongId, parsed.data.direction);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "That song is no longer in the set." };
    throw e;
  }

  refresh(serviceId);
  return {};
}

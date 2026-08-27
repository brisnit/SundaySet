"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/lib/auth/session";
import { addSongFromExternal, findDuplicate } from "@/lib/data/external-songs";
import { searchSongs, type ExternalSong } from "@/lib/music";

/**
 * Search runs on the server, not in the browser.
 *
 * MusicBrainz rate-limits per IP address, so a browser-side fetch would spend
 * each visitor's own budget and would put our contact obligation into public
 * client code. Here there is one queue, one cache, and one identified caller.
 */

export type SearchResultRow = ExternalSong & {
  /** Present when the workspace already has something that looks like this. */
  existing?: { id: string; certain: boolean };
};

export type SearchState =
  | { status: "idle" }
  | { status: "empty"; query: string }
  | { status: "error"; message: string }
  | { status: "results"; query: string; rows: SearchResultRow[] };

export async function searchSongsAction(
  _prev: SearchState,
  formData: FormData,
): Promise<SearchState> {
  const ctx = await requirePermission("songs:manage");
  const query = String(formData.get("q") ?? "").trim();

  if (query.length < 2) return { status: "idle" };

  const outcome = await searchSongs(query);
  if (!outcome.ok) return { status: "error", message: outcome.message };
  if (outcome.results.length === 0) return { status: "empty", query };

  // Mark what is already owned, so the list can say so before anyone taps Add.
  const rows: SearchResultRow[] = [];
  for (const result of outcome.results) {
    const duplicate = await findDuplicate(ctx, result);
    rows.push({
      ...result,
      existing:
        duplicate.kind === "none"
          ? undefined
          : { id: duplicate.song.id, certain: duplicate.kind === "exact" },
    });
  }

  return { status: "results", query, rows };
}

export type AddState = { error?: string; addedSongId?: string };

/**
 * The result is passed back whole rather than re-fetched by id.
 *
 * Provider results are not stored anywhere between searching and adding, so
 * there is no row to look up. Everything in the payload is re-validated as it
 * is written, and only the fields the schema knows about are read.
 */
export async function addExternalSongAction(
  external: ExternalSong,
): Promise<AddState> {
  const ctx = await requirePermission("songs:manage");

  if (!external?.title?.trim() || !external?.artist?.trim()) {
    return { error: "That result is missing a title or artist." };
  }

  const result = await addSongFromExternal(ctx, external);
  revalidatePath("/songs");
  revalidatePath("/songs/discover");

  return { addedSongId: result.songId };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import {
  addSongAttachment,
  addSongFromCatalog,
  createSong,
  deleteSong,
  deleteSongAttachment,
  setSongStatus,
  updateSong,
  upsertSongChart,
} from "@/lib/data/songs";
import { getStorage, UploadError } from "@/lib/storage";
import {
  chartInputSchema,
  parseChartBody,
  songInputSchema,
  type ChartSection,
} from "@/lib/validation/song";

export type FormState = { error?: string; fieldErrors?: Record<string, string> };

/**
 * Every action re-checks the permission server-side. The UI hides what a role
 * cannot do, but hiding is never the control.
 */
function parseSong(formData: FormData) {
  return songInputSchema.safeParse({
    title: formData.get("title"),
    artist: formData.get("artist"),
    ccliNumber: formData.get("ccliNumber"),
    defaultKey: formData.get("defaultKey"),
    churchKey: formData.get("churchKey"),
    alternateKeys: formData.get("alternateKeys"),
    bpm: formData.get("bpm"),
    tempoCategory: formData.get("tempoCategory") || undefined,
    songTypes: formData.getAll("songTypes"),
    genres: formData.getAll("genres"),
    themes: formData.get("themes"),
    difficulty: formData.get("difficulty") || undefined,
    familiarity: formData.get("familiarity") || undefined,
    status: formData.get("status") || undefined,
    leadVocalistPreference: formData.get("leadVocalistPreference"),
    lyrics: formData.get("lyrics"),
    notes: formData.get("notes"),
    spotifyUrl: formData.get("spotifyUrl"),
    appleMusicUrl: formData.get("appleMusicUrl"),
    youtubeUrl: formData.get("youtubeUrl"),
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

export async function createSongAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("songs:manage");
  const parsed = parseSong(formData);
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  const song = await createSong(ctx, parsed.data);
  revalidatePath("/songs");
  redirect(`/songs/${song.id}`);
}

export async function updateSongAction(
  songId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("songs:manage");
  const parsed = parseSong(formData);
  if (!parsed.success) {
    return { error: "Check the highlighted fields.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  try {
    await updateSong(ctx, songId, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "That song no longer exists." };
    throw e;
  }
  revalidatePath("/songs");
  revalidatePath(`/songs/${songId}`);
  redirect(`/songs/${songId}`);
}

export async function retireSongAction(songId: string, retire: boolean) {
  const ctx = await requirePermission("songs:manage");
  await setSongStatus(ctx, songId, retire ? "RETIRED" : "ACTIVE");
  revalidatePath("/songs");
  revalidatePath(`/songs/${songId}`);
}

export async function deleteSongAction(songId: string) {
  const ctx = await requirePermission("songs:manage");
  await deleteSong(ctx, songId);
  revalidatePath("/songs");
  redirect("/songs");
}

export async function addFromCatalogAction(catalogSongId: string) {
  const ctx = await requirePermission("songs:manage");
  await addSongFromCatalog(ctx, catalogSongId);
  revalidatePath("/songs");
  revalidatePath("/songs/discover");
}

export async function saveChartAction(
  songId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("songs:manage");

  // Sections arrive as parallel arrays so the form degrades without JS.
  const labels = formData.getAll("sectionLabel").map(String);
  const types = formData.getAll("sectionType").map(String);
  const bodies = formData.getAll("sectionBody").map(String);

  const sections: ChartSection[] = labels
    .map((label, i) => ({
      label: label.trim(),
      type: (types[i] ?? "OTHER") as ChartSection["type"],
      lines: parseChartBody(bodies[i] ?? ""),
    }))
    .filter((s) => s.label.length > 0);

  const parsed = chartInputSchema.safeParse({
    key: formData.get("key"),
    capo: formData.get("capo"),
    sections,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "That chart could not be saved." };
  }

  try {
    await upsertSongChart(ctx, songId, parsed.data);
  } catch (e) {
    if (e instanceof NotFoundError) return { error: "That song no longer exists." };
    throw e;
  }
  revalidatePath(`/songs/${songId}`);
  redirect(`/songs/${songId}`);
}

export async function uploadChartPdfAction(
  songId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await requirePermission("songs:manage");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a PDF to upload." };
  }

  try {
    const stored = await getStorage().put(file, `charts/${ctx.churchId}`);
    await addSongAttachment(ctx, songId, stored);
  } catch (e) {
    if (e instanceof UploadError) return { error: e.message };
    if (e instanceof NotFoundError) return { error: "That song no longer exists." };
    throw e;
  }

  revalidatePath(`/songs/${songId}`);
  return {};
}

export async function deleteAttachmentAction(songId: string, attachmentId: string) {
  const ctx = await requirePermission("songs:manage");
  const url = await deleteSongAttachment(ctx, attachmentId);
  // Remove the stored object too, but never fail the request over it — the
  // database row is what the UI reads, and an orphaned blob is recoverable.
  await getStorage()
    .remove(url)
    .catch(() => {});
  revalidatePath(`/songs/${songId}`);
}

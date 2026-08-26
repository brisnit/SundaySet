import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/shell";
import { SongForm } from "@/components/songs/song-form";
import { requirePermission } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { getSongById } from "@/lib/data/songs";
import { updateSongAction } from "../../actions";

export const metadata = { title: "Edit song" };

export default async function EditSongPage({
  params,
}: PageProps<"/songs/[songId]/edit">) {
  const { songId } = await params;
  const ctx = await requirePermission("songs:manage");

  const song = await getSongById(ctx, songId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const action = updateSongAction.bind(null, songId);

  return (
    <>
      <PageHeader title={song.title} subtitle="Edit song" />
      <SongForm
        action={action}
        submitLabel="Save changes"
        cancelHref={`/songs/${songId}`}
        values={{
          title: song.title,
          artist: song.artist ?? "",
          ccliNumber: song.ccliNumber ?? "",
          defaultKey: song.defaultKey ?? "",
          churchKey: song.churchKey ?? "",
          alternateKeys: song.alternateKeys.join(", "),
          bpm: song.bpm ? String(song.bpm) : "",
          tempoCategory: song.tempoCategory ?? "",
          songTypes: song.songTypes,
          genres: song.genres,
          themes: song.themes.join(", "),
          difficulty: song.difficulty,
          familiarity: song.familiarity,
          status: song.status,
          leadVocalistPreference: song.leadVocalistPreference ?? "",
          lyrics: song.lyrics ?? "",
          notes: song.notes ?? "",
          spotifyUrl: song.spotifyUrl ?? "",
          appleMusicUrl: song.appleMusicUrl ?? "",
          youtubeUrl: song.youtubeUrl ?? "",
        }}
      />
    </>
  );
}

import { PageHeader } from "@/components/app/shell";
import { EMPTY_SONG, SongForm } from "@/components/songs/song-form";
import { requirePermission } from "@/lib/auth/session";
import { createSongAction } from "../actions";

export const metadata = { title: "Add song" };

export default async function NewSongPage() {
  await requirePermission("songs:manage");
  return (
    <>
      <PageHeader
        title="Add a song"
        subtitle="Everything SetMeister suggests comes from your library, so the details here matter."
      />
      <SongForm
        action={createSongAction}
        values={EMPTY_SONG}
        submitLabel="Add song"
        cancelHref="/songs"
      />
    </>
  );
}

import { PageHeader } from "@/components/app/shell";
import { EMPTY_SONG, SongForm } from "@/components/songs/song-form";
import { requirePermission } from "@/lib/auth/session";
import { createSongAction } from "../../actions";

export const metadata = { title: "Add a song by hand" };

export default async function NewSongPage() {
  await requirePermission("songs:manage");
  return (
    <>
      <PageHeader
        title="Add a song by hand"
        subtitle="For anything search cannot find — an original, an arrangement, something unreleased."
      />
      <SongForm
        action={createSongAction}
        values={EMPTY_SONG}
        submitLabel="Add song"
        cancelHref="/songs/new"
      />
    </>
  );
}

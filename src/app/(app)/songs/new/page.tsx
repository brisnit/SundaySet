import Link from "next/link";
import { PenLine } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { SongSearch } from "@/components/songs/song-search";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { songSearchStatus } from "@/lib/music";

export const metadata = { title: "Add a song" };

/**
 * Add Song is search-first.
 *
 * Typing a title is how anyone thinks about adding a song; filling in fifteen
 * fields is not. The manual form still exists and is always one tap away —
 * originals, arrangements and anything unreleased will never be in a metadata
 * provider, and a provider outage must not stop someone adding a song.
 */
export default async function NewSongPage() {
  await requirePermission("songs:manage");
  const status = songSearchStatus();

  return (
    <>
      <PageHeader
        title="Add a song"
        subtitle="Search for it, or enter the details yourself."
      />

      <SongSearch usingDemoCatalogue={status.usingDemoCatalogue} />

      <div className="mt-8 border-t border-line pt-5">
        <p className="mb-2 text-sm text-ink-muted">
          Can&rsquo;t find it? An original, an arrangement or something
          unreleased won&rsquo;t be in the search.
        </p>
        <Button asChild variant="secondary">
          <Link href="/songs/new/manual">
            <PenLine aria-hidden />
            Enter the details by hand
          </Link>
        </Button>
      </div>
    </>
  );
}

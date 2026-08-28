import Link from "next/link";
import { notFound } from "next/navigation";
import { Search } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { CategoryArt } from "@/components/discover/category-art";
import { ResultRow } from "@/components/songs/song-search";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { SearchResultRow } from "@/app/(app)/songs/search-actions";
import { requirePermission } from "@/lib/auth/session";
import { findDuplicate } from "@/lib/data/external-songs";
import { GENRES, genreLabel } from "@/lib/genres";
import { browseGenre } from "@/lib/music";

export async function generateMetadata({
  params,
}: PageProps<"/songs/browse/[genre]">) {
  const { genre } = await params;
  const match = GENRES.find((g) => g.value.toLowerCase() === genre.toLowerCase());
  return { title: match ? match.label : "Browse" };
}

/**
 * Everything in one genre, from the metadata provider rather than from this
 * workspace's library — the point is to find songs you do not have yet.
 */
export default async function BrowseGenrePage({
  params,
}: PageProps<"/songs/browse/[genre]">) {
  const { genre: slug } = await params;
  const ctx = await requirePermission("songs:manage");

  const match = GENRES.find((g) => g.value.toLowerCase() === slug.toLowerCase());
  if (!match) notFound();

  const outcome = await browseGenre(match.value);

  // Mark what is already owned, so nothing invites you to add it twice.
  const rows: SearchResultRow[] = [];
  if (outcome.ok) {
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
  }

  return (
    <>
      <PageHeader
        title={genreLabel(match.value)}
        subtitle="Add anything here to your songs"
        actions={
          <Button asChild variant="secondary">
            <Link href="/songs/new">
              <Search aria-hidden />
              Search
            </Link>
          </Button>
        }
      />

      <div className="relative mb-5 aspect-[3/1] overflow-hidden rounded-2xl shadow-card">
        <CategoryArt
          genre={match.value}
          sizes="(min-width: 768px) 768px, 100vw"
          priority
        />
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent"
        />
        <span className="absolute inset-x-0 bottom-0 px-4 pb-3 font-display text-2xl font-bold text-white">
          {genreLabel(match.value)}
        </span>
      </div>

      {!outcome.ok ? (
        <div className="rounded-xl border border-amber/30 bg-amber-soft px-4 py-3">
          <p className="text-sm font-medium text-amber">{outcome.message}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            You can still{" "}
            <Link href="/songs/new" className="text-ember hover:underline">
              search for a song by name
            </Link>
            .
          </p>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={<Search className="size-5" />}
          title={`Nothing to show for ${genreLabel(match.value)}`}
          description="Try searching for a song or artist by name instead."
        />
      ) : (
        <ul className="grid gap-2">
          {rows.map((row) => (
            <ResultRow key={`${row.provider}:${row.externalId}`} row={row} />
          ))}
        </ul>
      )}
    </>
  );
}

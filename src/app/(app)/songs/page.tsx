import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SongFilters } from "@/components/songs/song-filters";
import { requireChurchContext } from "@/lib/auth/session";
import { listSongs, songLibraryStats } from "@/lib/data/songs";
import type { Familiarity, SongStatus, SongType } from "@/generated/prisma/enums";
import type { SongSort } from "@/lib/data/songs";
import { describeLastPlayed, type UsageStatus } from "@/lib/domain/song-usage";
import { titleCase } from "@/lib/format";

export const metadata = { title: "Songs" };

const USAGE_TONE: Record<UsageStatus, "sage" | "amber" | "clay" | "slate" | "neutral"> = {
  NEVER_PLAYED: "slate",
  FRESH: "sage",
  HEALTHY_ROTATION: "neutral",
  FREQUENTLY_USED: "amber",
  OVERPLAYED: "clay",
  READY_TO_RETURN: "slate",
};

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) || undefined;

export default async function SongsPage({ searchParams }: PageProps<"/songs">) {
  const ctx = await requireChurchContext();
  const params = await searchParams;

  const type = one(params.type) as SongType | undefined;
  const familiarity = one(params.familiarity) as Familiarity | undefined;
  const status = one(params.status) as SongStatus | undefined;
  const chart = one(params.chart);

  const [filtered, all, stats] = await Promise.all([
    listSongs(ctx, {
      search: one(params.q),
      songTypes: type ? [type] : undefined,
      familiarity: familiarity ? [familiarity] : undefined,
      status,
      sort: (one(params.sort) as SongSort | undefined) ?? "title",
    }),
    listSongs(ctx, { sort: "title" }),
    songLibraryStats(ctx),
  ]);

  // Deep-linked from the dashboard's "charts are missing" alert.
  const songs = chart === "missing" ? filtered.filter((s) => !s.hasChart) : filtered;

  if (all.length === 0) {
    return (
      <>
        <PageHeader title="Songs" />
        <EmptyState
          title="No songs yet"
          description="Your library is what SetMeister builds sets from. Everything it suggests comes from here."
        >
          <Button asChild>
            <Link href="/songs/new">Add songs</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/songs/discover">Browse Discover</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Songs"
        subtitle={`${stats.active} active · ${stats.hymns} hymns · ${stats.missingCharts} without a chart`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/songs/discover">
                <Sparkles aria-hidden />
                Discover
              </Link>
            </Button>
            <Button asChild>
              <Link href="/songs/new">
                <Plus aria-hidden />
                Add song
              </Link>
            </Button>
          </>
        }
      />

      <SongFilters total={all.length} shown={songs.length} />

      {songs.length === 0 ? (
        <EmptyState
          title="No songs match those filters"
          description="Try a different search term, or clear the filters to see your whole library."
        />
      ) : (
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Song library with rotation health
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-ink-subtle uppercase">
              <th scope="col" className="px-4 py-2.5 font-medium">Song</th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Key</th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Familiarity</th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium lg:table-cell">Last played</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Rotation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {songs.map((s) => (
              <tr key={s.id} className="hover:bg-sunken/60">
                <td className="px-4 py-3">
                  <Link href={`/songs/${s.id}`} className="block">
                    <span className="font-medium text-ink">{s.title}</span>
                    <span className="block text-xs text-ink-muted">
                      {s.artist}
                      {s.songTypes.includes("HYMN") ? " · Hymn" : ""}
                    </span>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 tabular-nums text-ink-muted sm:table-cell">
                  {s.churchKey ?? s.defaultKey ?? "—"}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-xs text-ink-muted">
                    {titleCase(s.familiarity)}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-xs text-ink-muted lg:table-cell">
                  {describeLastPlayed(s.usage.daysSinceLastPlayed)}
                  {s.uses90d > 0 ? (
                    <span className="text-ink-subtle"> · {s.uses90d}× in 90d</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={USAGE_TONE[s.usage.status]}>{s.usage.label}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}
    </>
  );
}

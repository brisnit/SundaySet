import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireChurchContext } from "@/lib/auth/session";
import { listSongs, songLibraryStats } from "@/lib/data/songs";
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

export default async function SongsPage() {
  const ctx = await requireChurchContext();
  const [songs, stats] = await Promise.all([
    listSongs(ctx, { sort: "title" }),
    songLibraryStats(ctx),
  ]);

  if (songs.length === 0) {
    return (
      <>
        <PageHeader title="Songs" />
        <EmptyState
          title="No songs yet"
          description="Your song library teaches SetMeister what your church actually sings. Everything the AI suggests comes from here."
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
    </>
  );
}

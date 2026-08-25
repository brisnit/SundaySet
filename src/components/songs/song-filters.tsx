"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

import { Select } from "@/components/ui/field";
import { titleCase } from "@/lib/format";

const SONG_TYPES = [
  "UPBEAT", "MID_TEMPO", "REFLECTIVE", "HYMN", "COMMUNION", "EASTER",
  "CHRISTMAS", "ADVENT", "RESPONSE", "BAPTISM", "PRAYER", "OFFERING",
];

const SORTS = [
  ["title", "Title"],
  ["artist", "Artist"],
  ["recently-played", "Recently played"],
  ["least-played", "Longest rested"],
  ["added", "Recently added"],
];

/**
 * Filters live in the URL rather than component state, so a filtered library is
 * shareable and survives a refresh, and the list itself stays server-rendered.
 */
export function SongFilters({ total, shown }: { total: number; shown: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.push(`/songs?${next.toString()}`, { scroll: false }));
  };

  const active =
    params.get("q") || params.get("type") || params.get("familiarity") || params.get("status");

  return (
    <div className="mb-4 grid gap-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
          />
          <label htmlFor="song-search" className="sr-only">
            Search songs
          </label>
          <input
            id="song-search"
            type="search"
            defaultValue={params.get("q") ?? ""}
            placeholder="Search title, artist or theme"
            onChange={(e) => set("q", e.target.value)}
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-ink-subtle"
          />
        </div>

        <label htmlFor="song-type" className="sr-only">Song type</label>
        <Select
          id="song-type"
          className="w-auto"
          value={params.get("type") ?? ""}
          onChange={(e) => set("type", e.target.value)}
        >
          <option value="">All types</option>
          {SONG_TYPES.map((t) => (
            <option key={t} value={t}>{titleCase(t)}</option>
          ))}
        </Select>

        <label htmlFor="song-familiarity" className="sr-only">Familiarity</label>
        <Select
          id="song-familiarity"
          className="w-auto"
          value={params.get("familiarity") ?? ""}
          onChange={(e) => set("familiarity", e.target.value)}
        >
          <option value="">Any familiarity</option>
          {["NEW", "LEARNING", "FAMILIAR", "CORE", "RETIRED"].map((f) => (
            <option key={f} value={f}>{titleCase(f)}</option>
          ))}
        </Select>

        <label htmlFor="song-sort" className="sr-only">Sort by</label>
        <Select
          id="song-sort"
          className="w-auto"
          value={params.get("sort") ?? "title"}
          onChange={(e) => set("sort", e.target.value)}
        >
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </div>

      <p aria-live="polite" className="text-xs text-ink-subtle">
        {pending
          ? "Filtering…"
          : active
            ? `Showing ${shown} of ${total} songs`
            : `${total} songs`}
        {active ? (
          <button
            type="button"
            onClick={() => start(() => router.push("/songs", { scroll: false }))}
            className="ml-2 inline-flex items-center gap-1 text-ember hover:underline"
          >
            <X aria-hidden className="size-3" />
            Clear filters
          </button>
        ) : null}
      </p>
    </div>
  );
}

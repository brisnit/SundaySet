"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus, Search } from "lucide-react";

import {
  addExternalSongAction,
  searchSongsAction,
  type SearchResultRow,
  type SearchState,
} from "@/app/(app)/songs/search-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { genreLabels } from "@/lib/genres";

/**
 * Search any song.
 *
 * Everything that makes this work — providers, rate limits, MBIDs, ISRCs,
 * duplicate tiers — is infrastructure and none of it appears here. What a
 * musician sees is a box, a list, and a button.
 */
export function SongSearch({ usingDemoCatalogue }: { usingDemoCatalogue: boolean }) {
  const [state, formAction, searching] = useActionState(searchSongsAction, {
    status: "idle",
  } as SearchState);

  const form = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");

  // Search as you type, but only once you have stopped. Two characters is the
  // floor the action enforces anyway, and 450ms is long enough that a normal
  // typing burst costs one request rather than a dozen.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const t = setTimeout(() => form.current?.requestSubmit(), 450);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="grid gap-5">
      {/* Submits on its own without JS, so the field works either way. */}
      <form ref={form} action={formAction}>
        <label htmlFor="song-search" className="sr-only">
          Search any song or artist
        </label>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-subtle"
          />
          <input
            id="song-search"
            name="q"
            type="search"
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Search any song or artist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-14 w-full min-w-0 rounded-2xl border-[0.5px] border-ember/40 bg-surface pr-14 pl-12 font-display text-base text-ink shadow-card outline-none placeholder:text-ink-subtle focus-visible:border-ember focus-visible:ring-2 focus-visible:ring-ember/25"
          />
          {searching ? (
            <Loader2
              aria-hidden
              className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-ember motion-reduce:animate-none"
            />
          ) : null}
        </div>
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <p aria-live="polite" className="sr-only">
        {searching
          ? "Searching"
          : state.status === "results"
            ? `${state.rows.length} results`
            : ""}
      </p>

      {usingDemoCatalogue ? (
        <p className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-2.5 text-xs leading-relaxed text-ink-muted">
          Search is running on a small built-in catalogue. Once the music
          service is connected it covers essentially every recorded song.
        </p>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-xl border border-amber/30 bg-amber-soft px-4 py-3">
          <p className="text-sm font-medium text-amber">{state.message}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            You can still add the song by hand below.
          </p>
        </div>
      ) : null}

      {state.status === "empty" ? (
        <EmptyState
          compact
          icon={<Search className="size-5" />}
          title={`Nothing found for “${state.query}”`}
          description="Check the spelling, try the artist instead, or add it by hand below."
        />
      ) : null}

      {state.status === "results" ? (
        <ul className="grid gap-2">
          {state.rows.map((row) => (
            <ResultRow key={`${row.provider}:${row.externalId}`} row={row} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ResultRow({ row }: { row: SearchResultRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const meta = [row.artist, row.releaseYear?.toString(), row.album]
    .filter(Boolean)
    .join(" · ");

  const add = () =>
    start(async () => {
      const result = await addExternalSongAction(row);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.addedSongId) router.push(`/songs/${result.addedSongId}`);
    });

  return (
    <li className="rounded-xl border-[0.5px] border-line-strong/60 bg-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold break-words text-ink">
            {row.title}
          </p>
          <p className="text-sm break-words text-ink-muted">{meta}</p>
          {row.genres?.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {genreLabels(row.genres).map((g) => (
                <Badge key={g} tone="outline">
                  {g}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="shrink-0">
          {row.existing?.certain ? (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/songs/${row.existing.id}`}>
                <Check aria-hidden />
                In your songs
              </Link>
            </Button>
          ) : (
            <Button size="sm" disabled={pending} onClick={add}>
              <Plus aria-hidden />
              {pending ? "Adding…" : "Add to My Songs"}
            </Button>
          )}
        </div>
      </div>

      {/* A name match is a guess, not a fact, so it asks instead of blocking. */}
      {row.existing && !row.existing.certain ? (
        <p className="mt-2 text-xs text-ink-muted">
          You may already have this.{" "}
          <Link
            href={`/songs/${row.existing.id}`}
            className="text-ember hover:underline"
          >
            See the one in your songs
          </Link>
          , or add this version anyway.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-clay">
          {error}
        </p>
      ) : null}
    </li>
  );
}

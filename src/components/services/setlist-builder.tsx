"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileMusic,
  ListMusic,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  addSongAction,
  moveSongAction,
  removeSongAction,
  setKeyAction,
  type SetlistResult,
} from "@/app/(app)/plan/[serviceId]/setlist-actions";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SETLIST_KEYS } from "@/lib/validation/setlist";
import { describeLastPlayed, daysSince } from "@/lib/domain/song-usage";
import { titleCase } from "@/lib/format";

export type SetlistRowView = {
  id: string;
  position: number;
  key: string | null;
  songId: string;
  title: string;
  artist: string | null;
  bpm: number | null;
  hasChart: boolean;
};

export type AddableSong = {
  id: string;
  title: string;
  artist: string | null;
  key: string | null;
  bpm: number | null;
  songTypes: string[];
  themes: string[];
  familiarity: string;
  lastPlayedOn: string | null;
  hasChart: boolean;
};

export function SetlistBuilder({
  serviceId,
  rows,
  addable,
  canEdit,
}: {
  serviceId: string;
  rows: SetlistRowView[];
  addable: AddableSong[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  /** The row currently being acted on, so only its controls show as busy. */
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = (id: string | null, fn: () => Promise<SetlistResult>) => {
    setBusyId(id);
    start(async () => {
      const result = await fn();
      setError(result.error ?? null);
      setBusyId(null);
      router.refresh();
    });
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return addable.slice(0, 40);
    return addable
      .filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.artist ?? "").toLowerCase().includes(q) ||
          s.themes.some((t) => t.includes(q)),
      )
      .slice(0, 40);
  }, [addable, query]);

  return (
    <div className="grid gap-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-clay/30 bg-clay-soft px-3 py-2 text-sm text-clay"
        >
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          compact
          icon={<ListMusic className="size-5" />}
          title="No songs yet"
          description="Add songs from your library and put them in the order you'll play them."
        />
      ) : (
        <ol className="grid gap-2">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-xl bg-sunken/60 px-3 py-3"
            >
              <span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface font-display text-sm font-bold text-ember tabular-nums shadow-card"
              >
                {row.position}
              </span>

              <div className="min-w-40 flex-1">
                <Link
                  href={`/songs/${row.songId}`}
                  className="font-display text-[15px] font-semibold text-ink hover:text-ember"
                >
                  {row.title}
                </Link>
                <p className="text-xs text-ink-muted">
                  {row.artist ?? "Unknown artist"}
                  {row.bpm ? ` · ${row.bpm} BPM` : ""}
                </p>
              </div>

              {canEdit ? (
                <>
                  <label className="sr-only" htmlFor={`key-${row.id}`}>
                    Key for {row.title}
                  </label>
                  <select
                    id={`key-${row.id}`}
                    value={row.key ?? ""}
                    disabled={pending && busyId === row.id}
                    onChange={(e) =>
                      run(row.id, () =>
                        setKeyAction(serviceId, row.id, e.target.value),
                      )
                    }
                    className="h-8 rounded-lg border-[0.5px] border-ember/40 bg-surface px-2 font-display text-sm font-semibold text-ember"
                  >
                    <option value="">Key —</option>
                    {SETLIST_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </>
              ) : row.key ? (
                <Badge tone="neutral">{row.key}</Badge>
              ) : null}

              {row.hasChart ? (
                <Link
                  href={`/songs/${row.songId}/chart/print`}
                  className="text-ink-subtle hover:text-ember"
                  aria-label={`Chart for ${row.title}`}
                  title="Chart"
                >
                  <FileMusic aria-hidden className="size-4" />
                </Link>
              ) : (
                <span
                  className="text-xs text-ink-subtle"
                  title="No chart yet"
                >
                  no chart
                </span>
              )}

              {canEdit ? (
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Move ${row.title} up`}
                    disabled={i === 0 || pending}
                    onClick={() => run(row.id, () => moveSongAction(serviceId, row.id, "up"))}
                    className="rounded p-1.5 text-ink-subtle hover:bg-sunken hover:text-ink disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${row.title} down`}
                    disabled={i === rows.length - 1 || pending}
                    onClick={() => run(row.id, () => moveSongAction(serviceId, row.id, "down"))}
                    className="rounded p-1.5 text-ink-subtle hover:bg-sunken hover:text-ink disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${row.title} from this set`}
                    disabled={pending}
                    onClick={() => run(row.id, () => removeSongAction(serviceId, row.id))}
                    className="rounded p-1.5 text-ink-subtle hover:bg-clay-soft hover:text-clay disabled:opacity-30"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {canEdit ? (
        picking ? (
          <div className="rounded-2xl border border-line/70 bg-surface p-3 shadow-card">
            <div className="relative mb-2">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle"
              />
              <label htmlFor="setlist-search" className="sr-only">
                Search your song library
              </label>
              <input
                id="setlist-search"
                type="search"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, artist or theme"
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-sm text-ink placeholder:text-ink-subtle"
              />
            </div>

            {matches.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-ink-muted">
                {addable.length === 0
                  ? "Every active song in your library is already in this set."
                  : `Nothing in your library matches “${query}”.`}
              </p>
            ) : (
              <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                {matches.map((s) => {
                  const days = daysSince(
                    s.lastPlayedOn ? new Date(s.lastPlayedOn) : null,
                    new Date(),
                  );
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(s.id, () => addSongAction(serviceId, s.id))}
                        className="flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-sunken disabled:opacity-50"
                      >
                        <Plus aria-hidden className="size-4 shrink-0 text-ember" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {s.title}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {[
                              s.artist,
                              s.key ? `Key of ${s.key}` : null,
                              s.bpm ? `${s.bpm} BPM` : null,
                              describeLastPlayed(days),
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="hidden shrink-0 gap-1 sm:flex">
                          {s.songTypes.slice(0, 2).map((t) => (
                            <Badge key={t} tone="outline">
                              {titleCase(t)}
                            </Badge>
                          ))}
                          <Badge
                            tone={s.familiarity === "CORE" ? "sage" : "neutral"}
                          >
                            {titleCase(s.familiarity)}
                          </Badge>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-2 flex justify-end border-t border-line pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPicking(false);
                  setQuery("");
                }}
              >
                Done adding
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setPicking(true)}>
              <Plus aria-hidden />
              Add song
            </Button>
          </div>
        )
      ) : null}
    </div>
  );
}

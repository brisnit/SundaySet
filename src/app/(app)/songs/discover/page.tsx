import Link from "next/link";
import { ExternalLink, Flame } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { AddFromCatalog } from "@/components/songs/add-from-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requireChurchContext } from "@/lib/auth/session";
import { getDiscover, type DiscoverSong } from "@/lib/data/discover";
import { titleCase } from "@/lib/format";

export const metadata = { title: "Discover" };

/** Deterministic artwork from the title — nothing is scraped or hotlinked. */
function artwork(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 40 + (h % 60)) % 360;
  return `linear-gradient(135deg, oklch(0.72 0.13 ${a}), oklch(0.55 0.14 ${b}))`;
}

function SongCard({ song }: { song: DiscoverSong }) {
  return (
    <li className="flex w-44 shrink-0 flex-col">
      <div
        aria-hidden
        className="mb-2.5 grid h-44 w-44 place-items-center rounded-xl"
        style={{ backgroundImage: artwork(song.title) }}
      >
        <span className="px-3 text-center font-display text-sm leading-tight text-white/90">
          {song.title}
        </span>
      </div>
      <p className="truncate text-sm font-medium text-ink">{song.title}</p>
      <p className="mb-2 truncate text-xs text-ink-muted">{song.artist}</p>
      <div className="mt-auto">
        <AddFromCatalog catalogSongId={song.id} inLibrary={song.inLibrary} />
      </div>
    </li>
  );
}

export default async function DiscoverPage() {
  const ctx = await requireChurchContext();
  const { sections, hot } = await getDiscover(ctx);

  return (
    <>
      <PageHeader
        title="Discover"
        subtitle="Scored against what you already play"
        actions={
          <Button asChild variant="secondary">
            <Link href="/songs">Back to my songs</Link>
          </Button>
        }
      />

      <p className="mb-6 rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-2.5 text-xs leading-relaxed text-ink-muted">
        Discover runs on a seeded demo catalogue. Spotify, Apple Music, YouTube
        and CCLI are modelled but not connected — nothing here is scraped.
      </p>

      {hot ? (
        <Card className="mb-9 border-ember/30 bg-ember-soft/40">
          <CardBody className="p-6">
            <p className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ember uppercase">
              <Flame aria-hidden className="size-3.5" />
              Hot new song
            </p>
            <div className="flex flex-wrap items-start gap-6">
              <div
                aria-hidden
                className="grid size-28 shrink-0 place-items-center rounded-xl"
                style={{ backgroundImage: artwork(hot.title) }}
              />
              <div className="min-w-56 flex-1">
                <h2 className="font-display text-2xl text-ink">{hot.title}</h2>
                <p className="text-sm text-ink-muted">{hot.artist}</p>

                <p className="mt-3 font-display text-3xl text-ember">
                  {hot.score}%
                  <span className="ml-2 font-sans text-sm text-ink-muted">
                    match for your library
                  </span>
                </p>

                {hot.reasons.length > 0 ? (
                  <ul className="mt-3 grid gap-1 text-sm text-ink-muted">
                    {hot.reasons.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                ) : null}

                {hot.similarTo.length > 0 ? (
                  <p className="mt-3 text-sm text-ink-muted">
                    Similar to{" "}
                    <span className="text-ink">{hot.similarTo.join(", ")}</span>
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {hot.themes.slice(0, 4).map((t) => (
                    <Badge key={t} tone="ember">{t}</Badge>
                  ))}
                  <Badge tone="outline">{titleCase(hot.difficulty)}</Badge>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <AddFromCatalog catalogSongId={hot.id} inLibrary={hot.inLibrary} size="md" />
                  {hot.youtubeUrl ? (
                    <a
                      href={hot.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-ember hover:underline"
                    >
                      <ExternalLink aria-hidden className="size-3.5" />
                      Listen
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {sections.map((section) => (
        <section key={section.key} className="mb-9">
          <h2 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
            {section.title}
          </h2>
          {section.blurb ? (
            <p className="mt-1 mb-3 text-xs text-ink-subtle">{section.blurb}</p>
          ) : (
            <div className="mb-3" />
          )}
          <ul className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
            {section.songs.map((s) => (
              <SongCard key={`${section.key}-${s.id}`} song={s} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

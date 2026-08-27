import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChurchContext } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { getSongById } from "@/lib/data/songs";
import {
  nashvilleSections,
  transposeSections,
} from "@/lib/music/transpose";
import { chartSectionSchema } from "@/lib/validation/song";
import { SETLIST_KEYS } from "@/lib/validation/setlist";

export const metadata = { title: "Chart" };

/**
 * Print-friendly chart. Deliberately outside the app shell: no navigation, no
 * colour, generous line height. Browser "Print to PDF" is the export path for
 * MVP, which keeps charts working with no PDF toolchain.
 *
 * `?key=` shows the chart in another key without changing it, which is how a
 * set's chosen key reaches the printed page. `?numbers=1` shows the same chart
 * as Nashville numbers. Both are views — the stored chart never moves.
 */
export default async function ChartPrintPage({
  params,
  searchParams,
}: PageProps<"/songs/[songId]/chart/print">) {
  const { songId } = await params;
  const query = await searchParams;
  const ctx = await requireChurchContext();

  const song = await getSongById(ctx, songId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const parsed = chartSectionSchema.array().safeParse(song.chart?.sections ?? []);
  const stored = parsed.success ? parsed.data : [];

  const chartKey = song.chart?.key ?? null;
  const asked = Array.isArray(query.key) ? query.key[0] : query.key;
  // Only a key we actually offer, so the URL cannot inject anything odd.
  const requestedKey =
    asked && (SETLIST_KEYS as readonly string[]).includes(asked) ? asked : null;

  const transposed =
    requestedKey && chartKey && requestedKey !== chartKey
      ? { key: requestedKey, sections: transposeSections(stored, chartKey, requestedKey) }
      : null;

  const showNumbers =
    (Array.isArray(query.numbers) ? query.numbers[0] : query.numbers) === "1";

  const displayKey = transposed?.key ?? chartKey ?? song.churchKey;
  const sections = showNumbers
    ? nashvilleSections(transposed?.sections ?? stored, displayKey)
    : (transposed?.sections ?? stored);

  const linkWith = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams();
    if (requestedKey) next.set("key", requestedKey);
    if (showNumbers) next.set("numbers", "1");
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return `/songs/${songId}/chart/print${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={`/songs/${songId}`} className="text-ember hover:underline">
          ← Back to song
        </Link>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {sections.length > 0 && displayKey ? (
            /*
             * A segmented toggle rather than a link, because it is a view
             * switch with two states and the reader needs to see which one
             * they are in without reading the chart to work it out.
             */
            <div
              role="group"
              aria-label="Chart notation"
              className="inline-flex rounded-full border-[0.5px] border-ember/40 bg-surface p-0.5"
            >
              <Link
                href={linkWith({ numbers: null })}
                aria-current={!showNumbers ? "true" : undefined}
                className={
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors " +
                  (!showNumbers
                    ? "bg-ember text-ember-fg"
                    : "text-ember hover:bg-ember-soft")
                }
              >
                Chords
              </Link>
              <Link
                href={linkWith({ numbers: "1" })}
                aria-current={showNumbers ? "true" : undefined}
                className={
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors " +
                  (showNumbers
                    ? "bg-ember text-ember-fg"
                    : "text-ember hover:bg-ember-soft")
                }
              >
                Numbers
              </Link>
            </div>
          ) : null}
          <span className="text-ink-subtle">
            Use your browser&rsquo;s Print to save a PDF
          </span>
        </div>
      </div>

      <header className="mb-6 border-b border-line pb-4">
        <h1 className="font-display text-3xl text-ink">{song.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {[
            song.artist,
            showNumbers
              ? displayKey
                ? `Numbers in ${displayKey}`
                : null
              : displayKey
                ? `Key of ${displayKey}`
                : null,
            song.chart?.capo ? `Capo ${song.chart.capo}` : null,
            song.bpm ? `${song.bpm} BPM` : null,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
        {transposed ? (
          <p className="mt-1 text-xs text-ink-subtle">
            Transposed from {chartKey}. The saved chart is unchanged.
          </p>
        ) : null}
      </header>

      {sections.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No chart yet.{" "}
          <Link href={`/songs/${songId}/chart`} className="text-ember underline">
            Add one
          </Link>
        </p>
      ) : (
        <div className="grid gap-6">
          {sections.map((section, i) => (
            <section key={i} className="break-inside-avoid">
              <h2 className="mb-1.5 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                {section.label}
              </h2>
              <div className="chord-chart overflow-x-auto text-[13px] leading-6 text-ink">
                {section.lines.map((line, j) => (
                  <div key={j}>
                    {line.chords ? (
                      <div className="font-semibold text-ember-ink">{line.chords}</div>
                    ) : null}
                    <div>{line.lyrics || " "}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";

import { requireChurchContext } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { getSongById } from "@/lib/data/songs";
import { chartSectionSchema } from "@/lib/validation/song";

export const metadata = { title: "Chart" };

/**
 * Print-friendly chart. Deliberately outside the app shell: no navigation, no
 * colour, generous line height. Browser "Print to PDF" is the export path for
 * MVP, which keeps charts working with no PDF toolchain.
 */
export default async function ChartPrintPage({
  params,
}: PageProps<"/songs/[songId]/chart/print">) {
  const { songId } = await params;
  const ctx = await requireChurchContext();

  const song = await getSongById(ctx, songId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const parsed = chartSectionSchema.array().safeParse(song.chart?.sections ?? []);
  const sections = parsed.success ? parsed.data : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 print:px-0 print:py-0">
      <div className="no-print mb-6 flex justify-between text-sm">
        <Link href={`/songs/${songId}`} className="text-ember hover:underline">
          ← Back to song
        </Link>
        <span className="text-ink-subtle">Use your browser&rsquo;s Print to save a PDF</span>
      </div>

      <header className="mb-6 border-b border-line pb-4">
        <h1 className="font-display text-3xl text-ink">{song.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {[
            song.artist,
            song.chart?.key ? `Key of ${song.chart.key}` : song.churchKey ? `Key of ${song.churchKey}` : null,
            song.chart?.capo ? `Capo ${song.chart.capo}` : null,
            song.bpm ? `${song.bpm} BPM` : null,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </p>
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
                    <div>{line.lyrics || " "}</div>
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

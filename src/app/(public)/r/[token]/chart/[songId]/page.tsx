import Link from "next/link";
import { notFound } from "next/navigation";

import {
  InvalidTokenError,
  resolveInvitationChart,
} from "@/lib/data/invitations";
import { chartSectionSchema } from "@/lib/validation/song";

export const metadata = {
  title: "Chart",
  robots: { index: false, follow: false },
};

/** Chart view for a musician with no account, authorised by their token. */
export default async function InvitationChartPage({
  params,
}: PageProps<"/r/[token]/chart/[songId]">) {
  const { token, songId } = await params;

  const chart = await resolveInvitationChart(token, songId).catch((e) => {
    if (e instanceof InvalidTokenError) notFound();
    throw e;
  });

  const parsed = chartSectionSchema.array().safeParse(chart.sections);
  const sections = parsed.success ? parsed.data : [];

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      <Link
        href={`/r/${token}`}
        className="no-print text-sm text-ember hover:underline"
      >
        ← Back to your invitation
      </Link>

      <header className="mt-4 mb-5 border-b border-line pb-3">
        <h1 className="font-display text-2xl text-ink">{chart.title}</h1>
        <p className="mt-0.5 text-sm text-ink-muted">
          {[
            chart.artist,
            chart.key ? `Key of ${chart.key}` : null,
            chart.capo ? `Capo ${chart.capo}` : null,
            chart.bpm ? `${chart.bpm} BPM` : null,
          ]
            .filter(Boolean)
            .join("  ·  ")}
        </p>

        {/* Say so plainly. A musician who knows the song in its written key
            should not have to work out why the chords look unfamiliar. */}
        {chart.transposedFrom ? (
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-ember-soft px-2.5 py-1 text-xs font-medium text-ember-ink">
            Transposed from {chart.transposedFrom} for this set
          </p>
        ) : null}
      </header>

      {chart.attachmentUrl ? (
        <a
          href={chart.attachmentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-5 block rounded-xl border-[0.5px] border-ember bg-surface px-4 py-3 text-sm font-medium text-ember"
        >
          Open the PDF chart
        </a>
      ) : null}

      {sections.length === 0 && !chart.attachmentUrl ? (
        <p className="text-sm text-ink-muted">
          No chart has been added for this song yet.
        </p>
      ) : (
        <div className="grid gap-5">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="mb-1 text-xs font-semibold tracking-wider text-ink-muted uppercase">
                {section.label}
              </h2>
              <div className="chord-chart overflow-x-auto text-[13px] leading-6 text-ink">
                {section.lines.map((line, j) => (
                  <div key={j}>
                    {line.chords ? (
                      <div className="font-semibold text-ember-ink">
                        {line.chords}
                      </div>
                    ) : null}
                    <div>{line.lyrics || " "}</div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

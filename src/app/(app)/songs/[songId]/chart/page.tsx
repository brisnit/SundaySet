import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/shell";
import { ChartEditor, type EditorSection } from "@/components/songs/chart-editor";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { getSongById } from "@/lib/data/songs";
import { chartSectionSchema, serializeChartBody } from "@/lib/validation/song";
import { saveChartAction } from "../../actions";
import Link from "next/link";

export const metadata = { title: "Chord chart" };

export default async function ChartPage({
  params,
}: PageProps<"/songs/[songId]/chart">) {
  const { songId } = await params;
  const ctx = await requirePermission("songs:manage");

  const song = await getSongById(ctx, songId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  // Stored JSON is untrusted at read time too — validate before rendering.
  const parsed = chartSectionSchema
    .array()
    .safeParse(song.chart?.sections ?? []);
  const initialSections: EditorSection[] = (parsed.success ? parsed.data : []).map(
    (s) => ({ label: s.label, type: s.type, body: serializeChartBody(s.lines) }),
  );

  const action = saveChartAction.bind(null, songId);

  return (
    <>
      <PageHeader
        title={song.title}
        subtitle="Chord chart"
        actions={
          song.chart ? (
            <Button asChild variant="secondary">
              <Link href={`/songs/${songId}/chart/print`}>Print view</Link>
            </Button>
          ) : null
        }
      />
      <ChartEditor
        action={action}
        songId={songId}
        songTitle={song.title}
        initialKey={song.chart?.key ?? song.churchKey ?? ""}
        initialCapo={song.chart?.capo != null ? String(song.chart.capo) : ""}
        initialSections={initialSections}
      />
    </>
  );
}

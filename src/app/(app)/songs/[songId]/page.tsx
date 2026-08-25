import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileMusic, Pencil } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { ChartAttachments } from "@/components/songs/chart-attachments";
import { SongActions } from "@/components/songs/song-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/lib/auth/roles";
import { requireChurchContext } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { getSongById, getSongUsageHistory } from "@/lib/data/songs";
import { describeLastPlayed, type UsageStatus } from "@/lib/domain/song-usage";
import { formatServiceDate, titleCase } from "@/lib/format";
import { storageStatus } from "@/lib/storage";

const USAGE_TONE: Record<UsageStatus, "sage" | "amber" | "clay" | "slate" | "neutral"> = {
  NEVER_PLAYED: "slate",
  FRESH: "sage",
  HEALTHY_ROTATION: "neutral",
  FREQUENTLY_USED: "amber",
  OVERPLAYED: "clay",
  READY_TO_RETURN: "slate",
};

export async function generateMetadata({ params }: PageProps<"/songs/[songId]">) {
  const { songId } = await params;
  const ctx = await requireChurchContext();
  const song = await getSongById(ctx, songId).catch(() => null);
  return { title: song?.title ?? "Song" };
}

export default async function SongPage({ params }: PageProps<"/songs/[songId]">) {
  const { songId } = await params;
  const ctx = await requireChurchContext();

  const song = await getSongById(ctx, songId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });
  const history = await getSongUsageHistory(ctx, songId);
  const editable = can(ctx.role, "songs:manage");
  const storage = storageStatus();

  const links = [
    ["Spotify", song.spotifyUrl],
    ["Apple Music", song.appleMusicUrl],
    ["YouTube", song.youtubeUrl],
  ].filter(([, url]) => Boolean(url)) as Array<[string, string]>;

  const meta = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );

  return (
    <>
      <PageHeader
        title={song.title}
        subtitle={song.artist ?? undefined}
        actions={
          editable ? (
            <>
              <Button asChild variant="secondary">
                <Link href={`/songs/${song.id}/chart`}>
                  <FileMusic aria-hidden />
                  {song.chart ? "Edit chart" : "Add chart"}
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/songs/${song.id}/edit`}>
                  <Pencil aria-hidden />
                  Edit
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={USAGE_TONE[song.usage.status]}>{song.usage.label}</Badge>
        {song.status === "RETIRED" ? <Badge tone="slate">Retired</Badge> : null}
        {song.songTypes.map((t) => (
          <Badge key={t} tone="outline">
            {titleCase(t)}
          </Badge>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Rotation</CardTitle>
            </CardHeader>
            <CardBody>
              <p className="mb-4 rounded-lg bg-sunken px-4 py-3 text-sm leading-relaxed text-ink">
                {song.usage.recommendation}
              </p>
              <dl>
                {meta("Last played", describeLastPlayed(song.usage.daysSinceLastPlayed))}
                {meta("Played in last 90 days", `${song.uses90d}×`)}
                {meta("Played this year", `${song.usesYtd}×`)}
                {meta("Familiarity", titleCase(song.familiarity))}
              </dl>
            </CardBody>
          </Card>

          <Card className="mt-5">
            <CardHeader>
              <CardTitle>Play history</CardTitle>
            </CardHeader>
            <CardBody>
              {history.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Not played yet. It will start building history the first
                  Sunday you use it.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {history.map((h) => (
                    <li
                      key={h.id}
                      className="flex items-center justify-between gap-4 py-2 text-sm"
                    >
                      <span className="text-ink">
                        {formatServiceDate(h.playedOn, { weekday: false, year: true })}
                      </span>
                      {h.key ? (
                        <Badge tone="neutral" className="tabular-nums">
                          {h.key}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                {meta("Your key", song.churchKey ?? "—")}
                {meta("Original key", song.defaultKey ?? "—")}
                {song.alternateKeys.length > 0
                  ? meta("Alternate keys", song.alternateKeys.join(", "))
                  : null}
                {meta("BPM", song.bpm ?? "—")}
                {meta("Difficulty", titleCase(song.difficulty))}
                {song.leadVocalistPreference
                  ? meta("Lead vocal", song.leadVocalistPreference)
                  : null}
                {meta("CCLI", song.ccliNumber ?? "Not set")}
              </dl>
            </CardBody>
          </Card>

          {song.themes.length > 0 ? (
            <Card className="mt-5">
              <CardHeader>
                <CardTitle>Themes</CardTitle>
              </CardHeader>
              <CardBody className="flex flex-wrap gap-1.5">
                {song.themes.map((t) => (
                  <Badge key={t} tone="ember">
                    {t}
                  </Badge>
                ))}
              </CardBody>
            </Card>
          ) : null}

          {links.length > 0 ? (
            <Card className="mt-5">
              <CardHeader>
                <CardTitle>Listen</CardTitle>
              </CardHeader>
              <CardBody className="grid gap-2">
                {links.map(([label, url]) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-ember hover:underline"
                  >
                    <ExternalLink aria-hidden className="size-3.5" />
                    {label}
                  </a>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card className="mt-5">
            <CardHeader>
              <CardTitle>Chart files</CardTitle>
            </CardHeader>
            <CardBody>
              <ChartAttachments
                songId={song.id}
                canManage={editable && storage.available}
                storageNote={
                  storage.usingLocalFallback
                    ? "Stored on local disk for development; production uses Vercel Blob."
                    : storage.reason
                }
                attachments={song.attachments.map((a) => ({
                  id: a.id,
                  url: a.url,
                  filename: a.filename,
                  sizeBytes: a.sizeBytes,
                }))}
              />
            </CardBody>
          </Card>

          {song.notes ? (
            <Card className="mt-5">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
                  {song.notes}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {editable ? (
            <div className="mt-5">
              <SongActions songId={song.id} retired={song.status === "RETIRED"} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import { AlertCircle, ArrowRight, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireChurchContext } from "@/lib/auth/session";
import { getDashboard } from "@/lib/data/dashboard";
import { formatDateChip, formatServiceDate, formatTime } from "@/lib/format";

export const metadata = { title: "Home" };

const STATUS_TONE = {
  ACCEPTED: "sage",
  INVITED: "amber",
  DECLINED: "clay",
  PENDING: "neutral",
  CANCELLED: "neutral",
} as const;

const STATUS_LABEL = {
  ACCEPTED: "Confirmed",
  INVITED: "Awaiting reply",
  DECLINED: "Declined",
  PENDING: "Not invited",
  CANCELLED: "Cancelled",
} as const;

export default async function HomePage() {
  const ctx = await requireChurchContext();
  const { nextService, upcoming, alerts, openPositions } =
    await getDashboard(ctx);

  const firstName = (ctx.user.name ?? "").split(" ")[0] || "there";

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        subtitle={ctx.church.name}
        actions={
          <Button asChild variant="soft">
            <Link href="/ask">
              <Sparkles aria-hidden />
              Ask SetMeister
            </Link>
          </Button>
        }
      />

      {alerts.length > 0 ? (
        <ul className="mb-8 grid gap-2">
          {alerts.map((a) => (
            <li key={a.message}>
              <Link
                href={a.href}
                className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm transition-colors hover:border-line-strong"
              >
                <AlertCircle
                  aria-hidden
                  className={`size-4 shrink-0 ${
                    a.tone === "clay"
                      ? "text-clay"
                      : a.tone === "amber"
                        ? "text-amber"
                        : "text-slate"
                  }`}
                />
                <span className="flex-1 text-ink">{a.message}</span>
                <ArrowRight aria-hidden className="size-4 text-ink-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {!nextService ? (
        <EmptyState
          title="Nothing on the calendar yet"
          description="Add your first service and SetMeister will start learning your rhythm — what you sing, who serves, and how often."
        >
          <Button asChild>
            <Link href="/plan/new">Create a service</Link>
          </Button>
        </EmptyState>
      ) : (
        <section className="grid gap-5 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="flex items-baseline justify-between gap-4">
                <div>
                  <CardTitle>This Sunday</CardTitle>
                  <p className="mt-1.5 font-display text-2xl text-ink">
                    {formatServiceDate(nextService.date)}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {formatTime(nextService.startTime)}
                    {nextService.callTime
                      ? ` · Call ${formatTime(nextService.callTime)}`
                      : ""}
                  </p>
                </div>
                <Badge tone="outline">
                  {nextService.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
              </CardHeader>

              {nextService.sermon?.title ? (
                <CardBody className="pb-4">
                  <div className="rounded-lg bg-sunken px-4 py-3">
                    <p className="text-sm font-medium text-ink">
                      {nextService.sermon.title}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {[nextService.sermon.series, nextService.sermon.scripture]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </CardBody>
              ) : null}

              <CardBody className="pt-0">
                <CardTitle className="mb-3">Worship set</CardTitle>
                {nextService.songs.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    No songs yet.{" "}
                    <Link href={`/plan/${nextService.id}`} className="text-ember underline">
                      Build the set
                    </Link>
                  </p>
                ) : (
                  <ol className="divide-y divide-line">
                    {nextService.songs.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 py-2.5 text-sm"
                      >
                        <span className="w-4 shrink-0 text-right text-xs tabular-nums text-ink-subtle">
                          {s.position}
                        </span>
                        <span className="flex-1 font-medium text-ink">
                          {s.song.title}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {s.song.artist}
                        </span>
                        {s.key ? (
                          <Badge tone="neutral" className="tabular-nums">
                            {s.key}
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="divide-y divide-line">
                  {nextService.assignments
                    .slice()
                    .sort((a, b) => a.position.sortOrder - b.position.sortOrder)
                    .map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">
                            {a.teamMember.name}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {a.position.name}
                          </p>
                        </div>
                        <Badge tone={STATUS_TONE[a.status]}>
                          {STATUS_LABEL[a.status]}
                        </Badge>
                      </li>
                    ))}
                  {openPositions.map((p) => (
                    <li
                      key={p}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <p className="text-ink-muted">{p}</p>
                      <Badge tone="clay">Open</Badge>
                    </li>
                  ))}
                </ul>
                <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
                  <Link href={`/plan/${nextService.id}`}>Manage this service</Link>
                </Button>
              </CardBody>
            </Card>
          </div>
        </section>
      )}

      {upcoming.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            Coming up
          </h2>
          <ul className="grid gap-2">
            {upcoming.map((s) => {
              const chip = formatDateChip(s.date);
              return (
                <li key={s.id}>
                  <Link
                    href={`/plan/${s.id}`}
                    className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-line-strong"
                  >
                    <div className="w-11 shrink-0 text-center">
                      <p className="text-[10px] font-semibold tracking-wide text-ink-subtle">
                        {chip.month}
                      </p>
                      <p className="font-display text-lg leading-none text-ink">
                        {chip.day}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {s.sermon?.title ?? "Untitled service"}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {s.songs.length} songs · {s.assignments.length} scheduled
                      </p>
                    </div>
                    <Badge tone={s.status === "DRAFT" ? "neutral" : "sage"}>
                      {s.status.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}

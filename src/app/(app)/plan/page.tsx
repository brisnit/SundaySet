import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireChurchContext } from "@/lib/auth/session";
import { listRecentServices, listUpcomingServices } from "@/lib/data/services";
import { formatDateChip, formatTime } from "@/lib/format";

export const metadata = { title: "Plan" };

type ServiceRow = Awaited<ReturnType<typeof listUpcomingServices>>[number];

function ServiceList({ services }: { services: ServiceRow[] }) {
  return (
    <ul className="grid gap-2">
      {services.map((s) => {
        const chip = formatDateChip(s.date);
        return (
          <li key={s.id}>
            <Link
              href={`/plan/${s.id}`}
              className="flex items-center gap-4 rounded-lg border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong"
            >
              <div className="w-11 shrink-0 text-center">
                <p className="text-[10px] font-semibold tracking-wide text-ink-subtle">
                  {chip.month}
                </p>
                <p className="font-display text-xl leading-none text-ink">
                  {chip.day}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {s.sermon?.title ?? s.title ?? "Untitled service"}
                </p>
                <p className="text-xs text-ink-muted">
                  {formatTime(s.startTime)}
                  {s.sermon?.series ? ` · ${s.sermon.series}` : ""}
                  {" · "}
                  {s.songs.length} songs · {s.assignments.length} scheduled
                </p>
              </div>
              <Badge
                tone={
                  s.status === "DRAFT"
                    ? "neutral"
                    : s.status === "COMPLETED"
                      ? "slate"
                      : "sage"
                }
              >
                {s.status.replaceAll("_", " ").toLowerCase()}
              </Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function PlanPage() {
  const ctx = await requireChurchContext();
  const [upcoming, recent] = await Promise.all([
    listUpcomingServices(ctx, { take: 12 }),
    listRecentServices(ctx, { take: 6 }),
  ]);

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle="Upcoming services, drafts and recent Sundays"
        actions={
          <>
            <Button asChild variant="soft">
              <Link href="/plan/ai">
                <Sparkles aria-hidden />
                Plan with AI
              </Link>
            </Button>
            <Button asChild>
              <Link href="/plan/new">
                <Plus aria-hidden />
                New service
              </Link>
            </Button>
          </>
        }
      />

      {upcoming.length === 0 ? (
        <EmptyState
          title="Nothing planned yet"
          description="Create a service by hand, or describe the next couple of months and let SetMeister draft them for you to review."
        >
          <Button asChild>
            <Link href="/plan/new">New service</Link>
          </Button>
        </EmptyState>
      ) : (
        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            Upcoming
          </h2>
          <ServiceList services={upcoming} />
        </section>
      )}

      {recent.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
            Recent Sundays
          </h2>
          <ServiceList services={recent} />
        </section>
      ) : null}
    </>
  );
}

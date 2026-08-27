import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireChurchContext } from "@/lib/auth/session";
import { listTeamMembers } from "@/lib/data/team";
import { formatShortDate } from "@/lib/format";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const ctx = await requireChurchContext();
  const members = await listTeamMembers(ctx);

  if (members.length === 0) {
    return (
      <>
        <PageHeader title="Team" />
        <EmptyState
          title="No one on the team yet"
          description="Add the people who serve — what they play, when they're available — and scheduling becomes a few clicks instead of a group text."
        >
          <Button asChild>
            <Link href="/team/new">Add people</Link>
          </Button>
        </EmptyState>
      </>
    );
  }

  const worship = members.filter((m) =>
    m.positions.some((p) => p.position.category === "WORSHIP"),
  );
  const tech = members.filter(
    (m) =>
      m.positions.some((p) => p.position.category === "TECH") &&
      !worship.includes(m),
  );

  const section = (title: string, rows: typeof members) =>
    rows.length === 0 ? null : (
      <section className="mb-9">
        <h2 className="mb-3 text-xs font-bold tracking-[0.08em] text-ink-muted uppercase">
          {title}
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {rows.map((m) => {
            const initials = m.name
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("");
            const upcomingBlockouts = m.blockouts.filter(
              (b) => b.endDate >= new Date(),
            );
            return (
              <li key={m.id}>
                <Link
                  href={`/team/${m.id}`}
                  className="flex h-full gap-3 rounded-2xl border border-line/70 bg-surface p-4 shadow-card transition-shadow hover:shadow-lift"
                >
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-ember-soft text-sm font-semibold text-ember-ink"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-ink">{m.name}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      {m.positions.map((p) => (
                        <Badge key={p.id} tone="outline">
                          {p.position.name}
                        </Badge>
                      ))}
                    </p>
                    {upcomingBlockouts.length > 0 ? (
                      <p className="mt-2 text-xs text-clay">
                        Unavailable{" "}
                        {upcomingBlockouts
                          .slice(0, 1)
                          .map((b) =>
                            b.startDate.getTime() === b.endDate.getTime()
                              ? formatShortDate(b.startDate)
                              : `${formatShortDate(b.startDate)}–${formatShortDate(b.endDate)}`,
                          )}
                        {upcomingBlockouts.length > 1
                          ? ` +${upcomingBlockouts.length - 1} more`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <>
      <PageHeader
        title="Team"
        subtitle={`${members.length} people`}
        actions={
          <Button asChild>
            <Link href="/team/new">
              <Plus aria-hidden />
              Add person
            </Link>
          </Button>
        }
      />
      {section("Worship", worship)}
      {section("Tech", tech)}
    </>
  );
}

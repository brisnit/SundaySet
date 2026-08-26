import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarOff, Mail, Pencil, Phone } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { ActiveToggle } from "@/components/team/active-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/lib/auth/roles";
import { requireChurchContext } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { getTeamMemberById } from "@/lib/data/team";
import { formatServiceDate, formatShortDate, titleCase } from "@/lib/format";

export async function generateMetadata({
  params,
}: PageProps<"/team/[teamMemberId]">) {
  const { teamMemberId } = await params;
  const ctx = await requireChurchContext();
  const member = await getTeamMemberById(ctx, teamMemberId).catch(() => null);
  return { title: member?.name ?? "Team member" };
}

export default async function TeamMemberPage({
  params,
}: PageProps<"/team/[teamMemberId]">) {
  const { teamMemberId } = await params;
  const ctx = await requireChurchContext();

  const member = await getTeamMemberById(ctx, teamMemberId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const manageable = can(ctx.role, "team:manage");
  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const today = new Date();
  const upcomingBlockouts = member.blockouts.filter((b) => b.endDate >= today);
  const worship = member.positions.filter((p) => p.position.category === "WORSHIP");
  const tech = member.positions.filter((p) => p.position.category === "TECH");
  const other = member.positions.filter(
    (p) => p.position.category === "OTHER",
  );

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );

  const positionGroup = (title: string, rows: typeof member.positions) =>
    rows.length === 0 ? null : (
      <div>
        <p className="mb-1.5 text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {title}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {rows.map((p) => (
            <Badge key={p.id} tone="ember">
              {p.position.name}
            </Badge>
          ))}
        </div>
      </div>
    );

  return (
    <>
      <PageHeader
        title={member.name}
        subtitle={
          member.positions.length > 0
            ? member.positions.map((p) => p.position.name).join(" · ")
            : "No positions set yet"
        }
        actions={
          manageable ? (
            <>
              <ActiveToggle
                teamMemberId={member.id}
                active={member.active}
                name={member.name}
              />
              <Button asChild>
                <Link href={`/team/${member.id}/edit`}>
                  <Pencil aria-hidden />
                  Edit
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span
          aria-hidden
          className="grid size-11 place-items-center rounded-full bg-ember-soft font-display text-sm text-ember-ink"
        >
          {initials}
        </span>
        <Badge tone={member.active ? "sage" : "slate"}>
          {member.active ? "Currently serving" : "Not currently serving"}
        </Badge>
        {member.userId ? (
          <Badge tone="outline">Has a SetMeister login</Badge>
        ) : (
          <Badge tone="neutral">No account needed</Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Positions</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4">
              {member.positions.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  No positions yet.{" "}
                  {manageable ? (
                    <Link
                      href={`/team/${member.id}/edit`}
                      className="text-ember hover:underline"
                    >
                      Add what they play
                    </Link>
                  ) : null}{" "}
                  so they can be scheduled.
                </p>
              ) : (
                <>
                  {positionGroup("Worship", worship)}
                  {positionGroup("Tech", tech)}
                  {positionGroup("Other", other)}
                </>
              )}
            </CardBody>
          </Card>

          {upcomingBlockouts.length > 0 ? (
            <Card>
              <CardHeader className="flex items-center gap-2">
                <CalendarOff aria-hidden className="size-4 text-ink-subtle" />
                <CardTitle>Unavailable</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="grid gap-2">
                  {upcomingBlockouts.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-baseline justify-between gap-4 text-sm"
                    >
                      <span className="text-ink">
                        {formatShortDate(b.startDate)}
                        {b.endDate.getTime() !== b.startDate.getTime()
                          ? ` – ${formatShortDate(b.endDate)}`
                          : ""}
                      </span>
                      {b.note ? (
                        <span className="text-ink-muted">{b.note}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          {member.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
                  {member.notes}
                </p>
              </CardBody>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-2 grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardBody>
              {member.email || member.phone ? (
                <div className="grid gap-2">
                  {member.email ? (
                    <a
                      href={`mailto:${member.email}`}
                      className="flex items-center gap-2 text-sm text-ember hover:underline"
                    >
                      <Mail aria-hidden className="size-3.5 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </a>
                  ) : null}
                  {member.phone ? (
                    <a
                      href={`tel:${member.phone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center gap-2 text-sm text-ember hover:underline"
                    >
                      <Phone aria-hidden className="size-3.5 shrink-0" />
                      {member.phone}
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">
                  No contact details yet. An email address is what lets them
                  receive their schedule.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                {row(
                  "Times per month",
                  member.preferredPerMonth === 0
                    ? "No preference"
                    : `${member.preferredPerMonth}×`,
                )}
                {row(
                  "Preferred service",
                  member.preferredServiceType?.name ?? "No preference",
                )}
                {member.vocalRange ? row("Vocal range", member.vocalRange) : null}
                {row("Status", member.active ? "Serving" : "Inactive")}
              </dl>
            </CardBody>
          </Card>

          {member.assignments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Recently scheduled</CardTitle>
              </CardHeader>
              <CardBody>
                <ul className="grid gap-2">
                  {member.assignments.slice(0, 8).map((a) => (
                    <li
                      key={a.id}
                      className="flex items-baseline justify-between gap-3 text-sm"
                    >
                      <Link
                        href={`/plan/${a.serviceId}`}
                        className="text-ink hover:text-ember hover:underline"
                      >
                        {formatServiceDate(a.service.date, { weekday: false })}
                      </Link>
                      <span className="text-xs text-ink-muted">
                        {a.position.name} · {titleCase(a.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

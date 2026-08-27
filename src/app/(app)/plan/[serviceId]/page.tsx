import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ListMusic, Pencil, Users } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { DeleteServiceButton } from "@/components/services/service-actions";
import { SetlistBuilder } from "@/components/services/setlist-builder";
import { TeamBuilder } from "@/components/services/team-builder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/lib/auth/roles";
import { requireChurchContext } from "@/lib/auth/session";
import { NotFoundError } from "@/lib/data/context";
import { getServiceById } from "@/lib/data/services";
import { getSetlist, listAddableSongs } from "@/lib/data/setlist";
import { getServiceTeam, listCandidatePool } from "@/lib/data/assignments";
import { listPositions } from "@/lib/data/team";
import { getInvitationStates } from "@/lib/data/invitations";
import { formatServiceDate, formatTime, setName, titleCase } from "@/lib/format";

type Service = Awaited<ReturnType<typeof getServiceById>>;

function statusTone(status: Service["status"]) {
  if (status === "DRAFT") return "neutral" as const;
  if (status === "COMPLETED") return "slate" as const;
  return "sage" as const;
}

export async function generateMetadata({
  params,
}: PageProps<"/plan/[serviceId]">) {
  const { serviceId } = await params;
  const ctx = await requireChurchContext();
  const service = await getServiceById(ctx, serviceId).catch(() => null);
  return {
    title: service
      ? (setName(service))
      : "Service",
  };
}

export default async function ServiceDetailPage({
  params,
}: PageProps<"/plan/[serviceId]">) {
  const { serviceId } = await params;
  const ctx = await requireChurchContext();

  const service = await getServiceById(ctx, serviceId).catch((e) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  const editable = can(ctx.role, "services:manage");
  const canEditSetlist = can(ctx.role, "songs:manage");
  const canSchedule = can(ctx.role, "team:schedule");
  const canInvite = can(ctx.role, "invitations:send");

  const [setlist, addable, teamSlots, pool, inviteStates, positions] =
    await Promise.all([
    getSetlist(ctx, serviceId),
    canEditSetlist ? listAddableSongs(ctx, serviceId) : Promise.resolve([]),
    getServiceTeam(ctx, serviceId),
    canSchedule
      ? listCandidatePool(ctx, serviceId, { includeInactive: true })
      : Promise.resolve([]),
    getInvitationStates(ctx, serviceId),
    canSchedule ? listPositions(ctx) : Promise.resolve([]),
  ]);
  const heading =
    setName(service);

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );

  return (
    <>
      <PageHeader
        title={heading}
        subtitle={`${formatServiceDate(service.date, { year: true })} · ${formatTime(service.startTime)}`}
        actions={
          editable ? (
            <Button asChild>
              <Link href={`/plan/${service.id}/edit`}>
                <Pencil aria-hidden />
                Edit details
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(service.status)}>
          {titleCase(service.status)}
        </Badge>
        {service.serviceType ? (
          <Badge tone="outline">{service.serviceType.name}</Badge>
        ) : null}
        {service.specialDate ? (
          <Badge tone="ember">{service.specialDate.name}</Badge>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 grid gap-5">
          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ListMusic aria-hidden className="size-4 text-ember" />
                <CardTitle>Setlist</CardTitle>
              </div>
              {setlist.length > 0 ? (
                <span className="text-xs text-ink-subtle">
                  {setlist.length} song{setlist.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </CardHeader>
            <CardBody>
              <SetlistBuilder
                serviceId={service.id}
                canEdit={canEditSetlist}
                rows={setlist}
                addable={addable.map((s) => ({
                  ...s,
                  // Dates cannot cross the server/client boundary as Date objects.
                  lastPlayedOn: s.lastPlayedOn
                    ? s.lastPlayedOn.toISOString()
                    : null,
                }))}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users aria-hidden className="size-4 text-ember" />
                <CardTitle>Team</CardTitle>
              </div>
              {service.assignments.length > 0 ? (
                <span className="text-xs text-ink-subtle">
                  {service.assignments.length} scheduled
                </span>
              ) : null}
            </CardHeader>
            <CardBody>
              <TeamBuilder
                serviceId={service.id}
                serviceDate={service.date.toISOString()}
                canEdit={canSchedule}
                canInvite={canInvite}
                invites={Object.fromEntries(
                  [...inviteStates].map(([id, v]) => [id, v.invited]),
                )}
                slots={teamSlots}
                positions={positions.map((p) => ({
                  id: p.id,
                  name: p.name,
                  category: p.category,
                }))}
                pool={pool.map((m) => ({
                  ...m,
                  blockouts: m.blockouts.map((b) => ({
                    startDate: b.startDate.toISOString(),
                    endDate: b.endDate.toISOString(),
                    note: b.note,
                  })),
                }))}
              />
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 grid gap-5">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <CalendarDays aria-hidden className="size-4 text-ember" />
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                {row("Date", formatServiceDate(service.date, { year: true }))}
                {row("Starts", formatTime(service.startTime))}
                {row("Call time", service.callTime ? formatTime(service.callTime) : "Not set")}
                {row("Slot", service.serviceType?.name ?? "Not set")}
                {row("Status", titleCase(service.status))}
                {service.title ? row("Name", service.title) : null}
              </dl>
            </CardBody>
          </Card>


          {service.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Planning notes</CardTitle>
              </CardHeader>
              <CardBody>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
                  {service.notes}
                </p>
              </CardBody>
            </Card>
          ) : null}

          {editable ? (
            <div>
              <DeleteServiceButton serviceId={service.id} label={heading} />
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

import { notFound } from "next/navigation";

import { PageHeader } from "@/components/app/shell";
import { TeamMemberForm } from "@/components/team/team-member-form";
import { requirePermission } from "@/lib/auth/session";
import { listServiceTypes } from "@/lib/data/church";
import { NotFoundError } from "@/lib/data/context";
import { getTeamMemberById, listPositions } from "@/lib/data/team";

import { updateTeamMemberAction } from "../../actions";

export const metadata = { title: "Edit team member" };

export default async function EditTeamMemberPage({
  params,
}: PageProps<"/team/[teamMemberId]/edit">) {
  const { teamMemberId } = await params;
  const ctx = await requirePermission("team:manage");

  const [member, positions, serviceTypes] = await Promise.all([
    getTeamMemberById(ctx, teamMemberId).catch((e) => {
      if (e instanceof NotFoundError) notFound();
      throw e;
    }),
    listPositions(ctx),
    listServiceTypes(ctx),
  ]);

  return (
    <>
      <PageHeader title={member.name} subtitle="Edit team member" />
      <TeamMemberForm
        action={updateTeamMemberAction.bind(null, teamMemberId)}
        positions={positions}
        serviceTypes={serviceTypes}
        submitLabel="Save changes"
        cancelHref={`/team/${teamMemberId}`}
        values={{
          name: member.name,
          email: member.email ?? "",
          phone: member.phone ?? "",
          vocalRange: member.vocalRange ?? "",
          notes: member.notes ?? "",
          active: member.active,
          preferredPerMonth: String(member.preferredPerMonth),
          preferredServiceTypeId: member.preferredServiceTypeId ?? "",
          positionIds: member.positions.map((p) => p.positionId),
        }}
      />
    </>
  );
}

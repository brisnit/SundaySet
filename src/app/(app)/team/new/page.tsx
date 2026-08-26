import { PageHeader } from "@/components/app/shell";
import { TeamMemberForm } from "@/components/team/team-member-form";
import { requirePermission } from "@/lib/auth/session";
import { listServiceTypes } from "@/lib/data/church";
import { listPositions } from "@/lib/data/team";

import { createTeamMemberAction } from "../actions";

export const metadata = { title: "Add team member" };

export default async function NewTeamMemberPage() {
  const ctx = await requirePermission("team:manage");
  const [positions, serviceTypes] = await Promise.all([
    listPositions(ctx),
    listServiceTypes(ctx),
  ]);

  return (
    <>
      <PageHeader
        title="Add someone to the team"
        subtitle="No account needed — they respond to invitations by link."
      />
      <TeamMemberForm
        action={createTeamMemberAction}
        positions={positions}
        serviceTypes={serviceTypes}
        submitLabel="Add to team"
        cancelHref="/team"
        values={{
          name: "",
          email: "",
          phone: "",
          vocalRange: "",
          notes: "",
          active: true,
          preferredPerMonth: "2",
          preferredServiceTypeId: "",
          positionIds: [],
        }}
      />
    </>
  );
}

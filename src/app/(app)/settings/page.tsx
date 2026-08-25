import { PageHeader } from "@/components/app/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requireChurchContext } from "@/lib/auth/session";
import { getWorshipProfile } from "@/lib/data/church";
import { titleCase } from "@/lib/format";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireChurchContext();
  const profile = await getWorshipProfile(ctx);

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm text-ink">{value}</dd>
    </div>
  );

  return (
    <>
      <PageHeader title="Settings" subtitle={ctx.church.name} />

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Church</CardTitle>
          </CardHeader>
          <CardBody>
            <dl>
              {row("Name", ctx.church.name)}
              {row("Time zone", ctx.church.timezone)}
              {row("Your role", titleCase(ctx.role))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worship profile</CardTitle>
          </CardHeader>
          <CardBody>
            {profile ? (
              <dl>
                {row("Songs per service", profile.songsPerService)}
                {row("Hymns", titleCase(profile.hymnPreference))}
                {row("Repeat window", `${profile.repeatWindowWeeks} weeks`)}
                {row("Difficulty", titleCase(profile.difficulty))}
                {row(
                  "Set structure",
                  <span className="text-ink-muted">
                    {profile.setStructure.join(" → ")}
                  </span>,
                )}
                {row(
                  "Styles",
                  <span className="flex flex-wrap justify-end gap-1">
                    {profile.styles.map((s) => (
                      <Badge key={s} tone="outline">
                        {titleCase(s)}
                      </Badge>
                    ))}
                  </span>,
                )}
              </dl>
            ) : (
              <p className="text-sm text-ink-muted">
                No worship profile yet.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

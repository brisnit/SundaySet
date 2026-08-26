import { PageHeader } from "@/components/app/shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { requireChurchContext } from "@/lib/auth/session";
import { titleCase } from "@/lib/format";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireChurchContext();

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
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardBody>
            <dl>
              {row("Name", ctx.church.name)}
              {row("Time zone", ctx.church.timezone)}
              {row("Your role", titleCase(ctx.role))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

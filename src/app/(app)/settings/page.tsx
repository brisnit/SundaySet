import { Building2, LogOut, UserRound } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { AccountForm } from "@/components/account/account-form";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutAction } from "./actions";
import { requireChurchContext } from "@/lib/auth/session";
import { getAccount } from "@/lib/data/account";
import { titleCase } from "@/lib/format";
import { storageStatus } from "@/lib/storage";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireChurchContext();
  const account = await getAccount(ctx);

  const row = (label: string, value: React.ReactNode, hint?: string) => (
    <div className="border-b border-line py-2.5 last:border-0">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-sm text-ink-muted">{label}</dt>
        <dd className="text-right text-sm text-ink">{value}</dd>
      </div>
      {hint ? <p className="mt-0.5 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );

  return (
    <>
      <PageHeader title="Settings" subtitle={account.email} />

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <AccountForm
            uploadsEnabled={storageStatus().available}
            values={{
              name: account.name ?? "",
              email: account.email,
              phone: account.phone ?? "",
              image: account.image,
              avatarColor: account.avatarColor,
              role: account.role,
            }}
          />
        </div>

        <div className="min-w-0 grid gap-5 lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <UserRound aria-hidden className="size-4 text-ember" />
              <CardTitle>Account</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                {row(
                  "Email",
                  account.email,
                  "This is your sign-in address. Changing it needs verification, so it is not editable here yet.",
                )}
                {row(
                  "Role",
                  titleCase(account.role),
                  "Set by an owner or admin. You cannot change your own role.",
                )}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <Building2 aria-hidden className="size-4 text-ember" />
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardBody>
              <dl>
                {row("Name", ctx.church.name)}
                {row("Time zone", ctx.church.timezone)}
              </dl>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Sign out sits at the very foot of the page, under everything else. */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-ink-muted">Signed in as {account.email}</p>
        <form action={signOutAction}>
          <Button type="submit" variant="secondary">
            <LogOut aria-hidden />
            Sign out
          </Button>
        </form>
      </div>
    </>
  );
}

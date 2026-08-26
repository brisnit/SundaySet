import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { SetList } from "@/components/sets/set-list";
import { Button } from "@/components/ui/button";
import { requireChurchContext } from "@/lib/auth/session";
import { getHome } from "@/lib/data/dashboard";

export const metadata = { title: "Sets" };

export default async function SetsPage() {
  const ctx = await requireChurchContext();
  const { upcoming, past } = await getHome(ctx);

  return (
    <>
      <PageHeader
        title="Sets"
        subtitle="Everything you've built and everything coming up"
        actions={
          <>
            <Button asChild variant="soft">
              <Link href="/ask">
                <Sparkles aria-hidden />
                Plan with AI
              </Link>
            </Button>
            <Button asChild>
              <Link href="/plan/new">
                <Plus aria-hidden />
                New set
              </Link>
            </Button>
          </>
        }
      />

      <SetList
        title="Current & Upcoming"
        sets={upcoming}
        emptyMessage="Nothing coming up yet. Create your first set."
      />

      <SetList
        title="Past Sets"
        sets={past}
        className="mt-10"
        emptyMessage={null}
      />
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getChurchContext } from "@/lib/auth/session";

export default async function LandingPage() {
  const ctx = await getChurchContext();
  if (ctx) redirect("/home");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-ember uppercase">
        AI-powered worship planning
      </p>
      <h1 className="mt-4 max-w-2xl font-display text-5xl leading-[1.05] tracking-tight text-ink md:text-6xl">
        Plan months of worship in minutes.
      </h1>
      <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-muted">
        Build the set. Schedule the team. Get Sunday ready.
      </p>
      <div className="mt-9 flex gap-3">
        <Button asChild size="lg">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}

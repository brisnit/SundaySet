import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { SetList } from "@/components/sets/set-list";
import { Button } from "@/components/ui/button";
import { requireChurchContext } from "@/lib/auth/session";
import { getHome } from "@/lib/data/dashboard";

export const metadata = { title: "Home" };

/**
 * Home exists to start a set.
 *
 * Hierarchy is deliberate and flat: Create → Current & Upcoming → Past. No
 * statistics — anything worth acting on is attached to the set it concerns.
 */
export default async function HomePage() {
  const ctx = await requireChurchContext();
  const { upcoming, past } = await getHome(ctx);

  const firstName = (ctx.user.name ?? "").split(" ")[0] || "there";

  return (
    <>
      <div className="mb-8">
        <p className="text-sm text-ink-muted">Good to see you, {firstName}</p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink md:text-4xl">
          Build the set
        </h1>
      </div>

      {/* The one thing this screen is for. */}
      <section className="mb-10">
        <Link
          href="/plan/new"
          className="group flex items-center gap-4 rounded-2xl bg-ember px-5 py-5 text-left transition-colors hover:bg-ember-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember md:px-6 md:py-6"
        >
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white/20 text-white"
          >
            <Plus className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl text-white md:text-2xl">
              Create a Set
            </span>
            <span className="mt-0.5 block text-sm text-white/80">
              Pick the songs, set the order, schedule who&rsquo;s playing.
            </span>
          </span>
        </Link>

        <div className="mt-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/ask">
              <Sparkles aria-hidden />
              Or plan several at once
            </Link>
          </Button>
        </div>
      </section>

      <SetList
        title="Current & Upcoming"
        sets={upcoming}
        emptyMessage="Nothing coming up. Create your first set above."
      />

      <SetList
        title="Past Sets"
        sets={past}
        className="mt-10"
        emptyMessage={null}
      />

      {/* Always within thumb reach on a phone, clear of the bottom nav. */}
      <Link
        href="/plan/new"
        aria-label="Create a set"
        className="fixed right-4 bottom-20 z-30 flex items-center gap-2 rounded-full bg-ember px-5 py-3.5 font-medium text-white shadow-lg shadow-ember/25 transition-colors hover:bg-ember-ink md:hidden"
      >
        <Plus aria-hidden className="size-5" />
        Create a Set
      </Link>
    </>
  );
}

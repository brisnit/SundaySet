import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/app/shell";
import { Card, CardBody } from "@/components/ui/card";
import { requireChurchContext } from "@/lib/auth/session";
import { songLibraryStats } from "@/lib/data/songs";

export const metadata = { title: "Ask SetMeister" };

const EXAMPLES = [
  "Plan the next eight Sundays. Four songs each week, one hymn every Sunday, no repeats across the eight weeks, and match the sermon themes.",
  "Give me a four-song set for Sunday around God's faithfulness. Start upbeat and don't use anything we've played in the last eight weeks.",
  "Find an upbeat song we haven't played in 90 days.",
  "Mike declined Sunday. Who can replace him on electric?",
];

export default async function AskPage() {
  const ctx = await requireChurchContext();
  const stats = await songLibraryStats(ctx);

  return (
    <>
      <PageHeader
        title="Ask SetMeister"
        subtitle={`Working from your ${stats.active} active songs and ${stats.hymns} hymns`}
      />

      <Card>
        <CardBody className="py-10 text-center">
          <Sparkles aria-hidden className="mx-auto size-6 text-ember" />
          <h2 className="mt-3 font-display text-xl text-ink">
            Coming in the next phase
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
            The constraint engine, song library and usage history that Ask
            SetMeister needs are all in place. The conversational layer on top of
            them is the next milestone.
          </p>
        </CardBody>
      </Card>

      <h2 className="mt-8 mb-3 text-sm font-semibold tracking-wide text-ink-muted uppercase">
        What you&rsquo;ll be able to ask
      </h2>
      <ul className="grid gap-2">
        {EXAMPLES.map((e) => (
          <li
            key={e}
            className="rounded-lg border border-dashed border-line-strong bg-surface/60 px-4 py-3 text-sm leading-relaxed text-ink-muted"
          >
            &ldquo;{e}&rdquo;
          </li>
        ))}
      </ul>
    </>
  );
}

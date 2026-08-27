import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section-label";
import { EmptyState } from "@/components/ui/empty-state";
import { warningsFor, type SetRow } from "@/lib/data/dashboard";
import { formatDateChip, formatTime, setName } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One way of listing sets, used by Home and the Sets page.
 *
 * Warnings ride on the row they belong to, so "no one scheduled" points at a
 * specific Sunday instead of being a number on a dashboard.
 */
export function SetList({
  title,
  sets,
  emptyMessage,
  className,
}: {
  title: string;
  sets: SetRow[];
  emptyMessage: string | null;
  className?: string;
}) {
  if (sets.length === 0 && emptyMessage === null) return null;

  return (
    <section className={cn(className)}>
      <SectionLabel>{title}</SectionLabel>

      {sets.length === 0 ? (
        <EmptyState compact title="Nothing here yet" description={emptyMessage ?? ""} />
      ) : (
        <ul className="grid gap-2">
          {sets.map((s) => {
            const chip = formatDateChip(s.date);
            const warnings = warningsFor(s);
            return (
              <li key={s.id}>
                <Link
                  href={`/plan/${s.id}`}
                  className="flex items-start gap-4 rounded-2xl border border-line/70 bg-surface px-4 py-4 shadow-card transition-shadow hover:shadow-lift md:px-5"
                >
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-[10px] font-bold tracking-[0.08em] text-ember uppercase">
                      {chip.month}
                    </p>
                    <p className="font-display text-2xl leading-none font-bold text-ink">
                      {chip.day}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base font-semibold text-ink">{setName(s)}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {formatTime(s.startTime)} · {s.songs.length} song
                      {s.songs.length === 1 ? "" : "s"} · {s.assignments.length}{" "}
                      scheduled
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge
                        tone={
                          s.status === "DRAFT"
                            ? "neutral"
                            : s.status === "COMPLETED"
                              ? "slate"
                              : "sage"
                        }
                      >
                        {s.status.replaceAll("_", " ").toLowerCase()}
                      </Badge>
                      {warnings.map((w) => (
                        <Badge key={w.label} tone={w.tone}>
                          {w.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

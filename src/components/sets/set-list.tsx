import Link from "next/link";

import { Badge } from "@/components/ui/badge";
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
      <h2 className="mb-3 text-xs font-semibold tracking-wider text-ink-muted uppercase">
        {title}
      </h2>

      {sets.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong bg-surface/60 px-5 py-8 text-center text-sm text-ink-muted">
          {emptyMessage}
        </p>
      ) : (
        <ul className="grid gap-2">
          {sets.map((s) => {
            const chip = formatDateChip(s.date);
            const warnings = warningsFor(s);
            return (
              <li key={s.id}>
                <Link
                  href={`/plan/${s.id}`}
                  className="flex items-start gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 transition-colors hover:border-line-strong"
                >
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-[10px] font-semibold tracking-wide text-ink-subtle">
                      {chip.month}
                    </p>
                    <p className="font-display text-xl leading-none text-ink">
                      {chip.day}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{setName(s)}</p>
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

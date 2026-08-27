import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Titles a region of a page — "Current & Upcoming", "Past Sets".
 *
 * Same compact uppercase treatment as CardTitle so labels read consistently
 * whether they sit on the page or on a surface, with an optional trailing slot
 * for a count or action.
 */
export function SectionLabel({
  children,
  trailing,
  className,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-3", className)}>
      <h2 className="text-xs font-bold tracking-[0.08em] text-ink-muted uppercase">
        {children}
      </h2>
      {trailing ? (
        <span className="text-xs text-ink-subtle">{trailing}</span>
      ) : null}
    </div>
  );
}

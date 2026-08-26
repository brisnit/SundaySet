import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A pill is a single line, always.
 *
 * Without `whitespace-nowrap` the label wraps INSIDE the pill and the rounded
 * shape becomes a tall blob — "1 awaiting reply" rendered as three stacked
 * lines on a phone. `shrink-0` stops flex siblings squeezing it into that
 * state in the first place; containers that hold several badges wrap them as
 * whole pills instead.
 */
const badge = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-sunken text-ink-muted",
        ember: "bg-ember-soft text-ember-ink",
        sage: "bg-sage-soft text-sage",
        amber: "bg-amber-soft text-amber",
        clay: "bg-clay-soft text-clay",
        slate: "bg-slate-soft text-slate",
        outline: "border border-line-strong text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badge>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}

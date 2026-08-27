import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Empty states carry the product's teaching moment, so they take a headline, a
 * sentence explaining why the thing matters, and real actions — never just
 * "No results".
 *
 * The treatment is the reference's: a dashed, tinted well rather than a
 * bordered box, with the heading in the display face. No stock illustration —
 * where a graphic helps, it is a brand-tinted glyph the rest of the app already
 * uses, so an empty Setlist looks like SetMeister rather than like every other
 * SaaS product.
 */
export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  className?: string;
  /** Inside a card, where the surrounding surface already provides framing. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-line-strong bg-sunken/50 text-center",
        compact ? "px-5 py-8" : "px-6 py-12 md:py-14",
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-ember-soft text-ember"
        >
          {icon}
        </span>
      ) : null}

      <h3
        className={cn(
          "font-display font-semibold text-ink",
          compact ? "text-lg" : "text-xl",
        )}
      >
        {title}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">
        {description}
      </p>
      {children ? (
        <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>
      ) : null}
    </div>
  );
}

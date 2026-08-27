import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The surface system.
 *
 * Two levels, deliberately. `Card` is a primary surface: white, generously
 * rounded, lifted by a soft shadow rather than outlined by a hard border.
 * `Panel` is a secondary container that sits *inside* a card — a tinted, flat
 * area for grouped rows and empty states. Anything that needs a third level is
 * a sign the page is doing too much.
 *
 * Pages should not invent their own card treatment; that is how a design system
 * turns back into a pile of one-off styles.
 */
export function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-line/70 bg-surface shadow-card",
        interactive &&
          "transition-shadow hover:shadow-lift focus-within:shadow-lift",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pt-5 pb-3 md:px-6", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5 md:px-6", className)} {...props} />;
}

/**
 * The compact utility label from the reference: small, uppercase, tracked,
 * quiet, usually paired with an icon. It titles a card without competing with
 * the page heading.
 */
export function CardTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "text-xs font-bold tracking-[0.08em] text-ink-muted uppercase",
        className,
      )}
      {...props}
    />
  );
}

/** Secondary container inside a card: tinted, flat, no shadow of its own. */
export function Panel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-xl bg-sunken/70 p-4", className)}
      {...props}
    />
  );
}

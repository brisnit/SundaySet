import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-ember text-ember-fg hover:bg-ember-hover",
        /*
         * The brand's hairline-stroked button: white ground, fine primary
         * stroke, primary label. Specified as a 0.25 stroke — 0.25px rounds
         * away to nothing on a 1x display, so 0.5px is used: a true hairline on
         * the 2x/3x screens this is designed for, and still visible elsewhere.
         */
        secondary:
          "border-[0.5px] border-ember bg-surface text-ember hover:bg-ember-soft",
        /* Tertiary / text. */
        ghost: "text-ink-muted hover:bg-sunken hover:text-ink",
        soft: "bg-ember-soft text-ember-ink hover:bg-ember-soft/70",
        /* Destructive, matching "Delete set" in the reference. */
        danger: "text-clay hover:bg-clay-soft",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof button> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}

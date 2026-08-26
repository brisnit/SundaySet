"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ListMusic, Music, Sparkles, Users } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Routes are deliberately unchanged: `/plan` is the list of Sets and `/ask` is
 * AI planning. Renaming them would break invitation links already sent, every
 * revalidatePath call and ~40 tests, for something no one sees.
 */
const LINKS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/plan", label: "Sets", icon: ListMusic },
  { href: "/songs", label: "Songs", icon: Music },
  { href: "/team", label: "Team", icon: Users },
];

const AI_LINK = { href: "/ask", label: "Plan", icon: Sparkles };

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const isActive = useIsActive();

  return (
    <nav aria-label="Main" className="contents">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            // Weight is constant. Bolding only the active item makes the label
            // wider and reflows the row on every selection.
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(href)
              ? "bg-ember-soft text-ember-ink"
              : "text-ink-muted hover:bg-sunken hover:text-ink",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}

      <Link
        href={AI_LINK.href}
        aria-current={isActive(AI_LINK.href) ? "page" : undefined}
        className={cn(
          "mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive(AI_LINK.href)
            ? "bg-ember-soft text-ember-ink"
            : "text-ember hover:bg-ember-soft/60",
        )}
      >
        <AI_LINK.icon className="size-4 shrink-0" aria-hidden />
        {AI_LINK.label}
      </Link>
    </nav>
  );
}

/** Bottom bar for phones, where the sidebar is hidden. */
export function MobileNav() {
  const isActive = useIsActive();
  const items = [...LINKS, AI_LINK];

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 backdrop-blur md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            // basis-0 + min-w-0 keeps every tab exactly 1/n wide. Without them a
            // flex item cannot shrink below its content, so label length and
            // active styling change tab widths.
            "flex min-w-0 flex-1 basis-0 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
            isActive(href) ? "text-ember" : "text-ink-subtle",
          )}
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

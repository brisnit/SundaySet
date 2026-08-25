"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Home,
  MessageSquare,
  Music,
  Sparkles,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/songs", label: "Songs", icon: Music },
  { href: "/team", label: "Team", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
];

export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Main" className="contents">
      {LINKS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive(href)
              ? "bg-ember-soft font-medium text-ember-ink"
              : "text-ink-muted hover:bg-sunken hover:text-ink",
          )}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
      <Link
        href="/ask"
        aria-current={isActive("/ask") ? "page" : undefined}
        className={cn(
          "mt-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          isActive("/ask")
            ? "bg-ember-soft font-medium text-ember-ink"
            : "text-ember hover:bg-ember-soft/60",
        )}
      >
        <Sparkles className="size-4 shrink-0" aria-hidden />
        Ask SetMeister
      </Link>
    </nav>
  );
}

/** Bottom bar for phones, where the sidebar is hidden. */
export function MobileNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const items = [...LINKS.slice(0, 4), { href: "/ask", label: "Ask", icon: Sparkles }];

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
            "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
            isActive(href) ? "text-ember" : "text-ink-subtle",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}

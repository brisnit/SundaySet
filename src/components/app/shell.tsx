import Image from "next/image";
import Link from "next/link";
import type * as React from "react";

import { MobileNav, Nav } from "@/components/app/nav";
import { Avatar } from "@/components/ui/avatar";
import type { ChurchContext } from "@/lib/auth/session";

export function AppShell({
  ctx,
  children,
}: {
  ctx: ChurchContext;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <Link href="/home" className="mb-7 px-3" aria-label="SetMeister home">
          <Image
            src="/brand/setmeister-logo.png"
            alt="SetMeister"
            width={130}
            height={31}
            priority
            className="brand-logo h-6 w-auto"
          />
        </Link>

        <div className="flex flex-1 flex-col gap-0.5">
          <Nav />
        </div>

        <Link
          href="/settings"
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-sunken hover:text-ink"
        >
          <Avatar
            name={ctx.user.name ?? ctx.user.email}
            image={ctx.user.image}
            color={ctx.user.avatarColor}
            size={28}
          />
          <span className="truncate">{ctx.user.name ?? ctx.user.email}</span>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <Link href="/home" aria-label="SetMeister home">
            <Image
              src="/brand/setmeister-logo.png"
              alt="SetMeister"
              width={130}
              height={31}
              priority
              className="brand-logo h-6 w-auto"
            />
          </Link>

          <Link
            href="/settings"
            aria-label={`Account — ${ctx.user.name ?? ctx.user.email}`}
            className="shrink-0 rounded-full ring-1 ring-line"
          >
            <Avatar
              name={ctx.user.name ?? ctx.user.email}
              image={ctx.user.image}
              color={ctx.user.avatarColor}
              size={36}
            />
          </Link>
        </header>

        <main
          /* Mobile bottom padding clears BOTH the fixed bottom nav (~64px) and
             the floating Create a Set button above it, so the last row is never
             hidden underneath them. */
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-40 md:px-8 md:pt-10 md:pb-16"
        >
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.02em] text-ink md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {/* Actions align to the top so the title's baseline never moves when
          they wrap to a second line on narrow screens. */}
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2 pt-1">{actions}</div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import type * as React from "react";

import { MobileNav, Nav } from "@/components/app/nav";
import type { ChurchContext } from "@/lib/auth/session";

export function AppShell({
  ctx,
  children,
}: {
  ctx: ChurchContext;
  children: React.ReactNode;
}) {
  const initials = (ctx.user.name ?? ctx.user.email)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <Link href="/home" className="mb-7 px-3">
          <span className="font-display text-xl font-semibold tracking-tight text-ink">
            SetMeister
          </span>
          <span className="mt-0.5 block text-xs text-ink-subtle">
            {ctx.church.name}
          </span>
        </Link>

        <div className="flex flex-1 flex-col gap-0.5">
          <Nav />
        </div>

        <Link
          href="/settings"
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-sunken hover:text-ink"
        >
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-ember-soft text-[11px] font-semibold text-ember-ink"
          >
            {initials}
          </span>
          <span className="truncate">{ctx.user.name ?? ctx.user.email}</span>
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
          <Link href="/home" className="font-display text-lg font-semibold">
            SetMeister
          </Link>
          <span className="text-xs text-ink-subtle">{ctx.church.name}</span>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24 md:px-8 md:pt-10 md:pb-16">
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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink md:text-4xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

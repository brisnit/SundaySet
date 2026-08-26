import { cn } from "@/lib/utils";

/**
 * Loading placeholders.
 *
 * These exist so Next can prefetch a dynamic route: with no loading boundary,
 * <Link> prefetch has nothing to cache and every click waits for a full server
 * render with no feedback.
 *
 * They deliberately mirror the real layout's dimensions — a skeleton that is a
 * different size than the content it replaces trades a blank screen for a
 * layout shift. Kept plain; Phase D handles visual treatment.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-sunken", className)}
    />
  );
}

/** Matches PageHeader: 3xl/4xl title plus optional subtitle, mb-8. */
export function HeaderSkeleton({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div className="mb-8">
      <Skeleton className="h-9 w-56 md:h-10" />
      {subtitle ? <Skeleton className="mt-2.5 h-4 w-72 max-w-full" /> : null}
    </div>
  );
}

/** Matches the SetList / song row height so nothing jumps on swap. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-[74px] rounded-xl" />
      ))}
    </div>
  );
}

export function SectionLabelSkeleton() {
  return <Skeleton className="mb-3 h-3 w-32" />;
}

/**
 * Announced politely so a screen reader says the page is loading instead of
 * silently presenting an empty region.
 */
export function LoadingRegion({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

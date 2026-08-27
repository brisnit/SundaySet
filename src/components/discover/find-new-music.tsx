"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CategoryArt, type CategoryArtKey } from "./category-art";
import { cn } from "@/lib/utils";

export type MusicCategory = {
  key: CategoryArtKey;
  title: string;
  blurb: string;
  count: number;
  href: string;
};

/**
 * A horizontal rail of categories to go browsing in.
 *
 * Swipe on a phone, arrows on a desktop. The arrows only appear once there is
 * somewhere to scroll to, and each disables itself at its end of the rail, so
 * the control never lies about what it will do.
 */
export function FindNewMusic({ categories }: { categories: MusicCategory[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    // A 2px slack keeps sub-pixel scroll widths from leaving an arrow enabled
    // with nothing left to scroll.
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    measure();
    const el = rail.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: "smooth" });
  };

  const scrollable = !(atStart && atEnd);

  return (
    <section className="mb-10" aria-labelledby="find-new-music">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="find-new-music"
            className="font-display text-lg font-bold tracking-[-0.01em] text-ink"
          >
            Find new music
          </h2>
          <p className="text-sm text-ink-muted">
            Songs you don&rsquo;t have yet, grouped by what you might be after.
          </p>
        </div>

        {scrollable ? (
          <div className="hidden shrink-0 gap-1 md:flex">
            {([
              ["Scroll left", -1, atStart, ChevronLeft],
              ["Scroll right", 1, atEnd, ChevronRight],
            ] as const).map(([label, dir, disabled, Icon]) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                disabled={disabled}
                onClick={() => nudge(dir)}
                className="grid size-8 place-items-center rounded-full border-[0.5px] border-ember/40 text-ember transition-colors hover:bg-ember-soft disabled:border-line disabled:text-ink-subtle disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Icon aria-hidden className="size-4" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative">
        <ul
          ref={rail}
          onScroll={measure}
          className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2 md:-mx-8 md:scroll-pl-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((c) => (
            <li key={c.key} className="w-40 shrink-0 snap-start sm:w-44">
              <Link
                href={c.href}
                className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
              >
                <div className="relative overflow-hidden rounded-2xl shadow-card transition-shadow group-hover:shadow-lift">
                  <CategoryArt
                    art={c.key}
                    className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                  <span className="absolute right-2 bottom-2 rounded-full bg-black/35 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {c.count} {c.count === 1 ? "song" : "songs"}
                  </span>
                </div>
                <p className="mt-2 font-display text-sm font-semibold text-ink group-hover:text-ember">
                  {c.title}
                </p>
                <p className="text-xs leading-snug text-ink-muted">{c.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>

        {/* Fades hint that the rail runs past the edge. Pointer-events off so
            they never eat a tap meant for the card underneath. */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 -left-4 w-8 bg-gradient-to-r from-paper to-transparent transition-opacity md:-left-8",
            atStart && "opacity-0",
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 -right-4 w-8 bg-gradient-to-l from-paper to-transparent transition-opacity md:-right-8",
            atEnd && "opacity-0",
          )}
        />
      </div>
    </section>
  );
}

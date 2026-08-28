"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Genre } from "@/generated/prisma/enums";
import { CategoryArt } from "./category-art";
import { cn } from "@/lib/utils";

export type MusicCategory = { genre: Genre; label: string };

/**
 * Find new music.
 *
 * A snap-scrolling rail. Swipe on a phone; on a desktop it gets arrows, but
 * only once there is somewhere to scroll, and each disables itself at its end
 * of the rail so the control never lies about what it will do.
 */
export function FindNewMusic({ categories }: { categories: readonly MusicCategory[] }) {
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

  if (categories.length === 0) return null;
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
            Browse a genre and add anything you like to your songs.
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
          /* scroll-padding, not just padding: a snap point aligns to the
             scrollport edge, so without it the rail snaps past its own inset
             and clips the first tile. */
          className="-mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-2 md:-mx-8 md:scroll-pl-8 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((c, i) => (
            <li key={c.genre} className="w-44 shrink-0 snap-start sm:w-52">
              <Link
                href={`/songs/browse/${c.genre.toLowerCase()}`}
                className="group relative block aspect-[3/2] overflow-hidden rounded-2xl shadow-card transition-shadow hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
              >
                <CategoryArt
                  genre={c.genre}
                  sizes="(min-width: 640px) 208px, 176px"
                  priority={i < 3}
                  className="transition-transform duration-300 group-hover:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                {/* These are real photographs and vary from a near-black jazz
                    club to a stage under white light, so the label gets its own
                    ground rather than relying on the picture behind it. */}
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/35 to-transparent"
                />
                <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 font-display text-base leading-tight font-bold text-white">
                  {c.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

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

import Link from "next/link";

import type { Genre } from "@/generated/prisma/enums";
import { CategoryArt } from "./category-art";

export type MusicCategory = { genre: Genre; label: string };

/**
 * Find new music.
 *
 * A grid rather than a rail: genres are a set to scan, not a sequence to page
 * through, and a two-column grid shows eight of them in the space a carousel
 * gave two and a half. No client state, so this stays a server component.
 */
export function FindNewMusic({
  categories,
}: {
  categories: readonly MusicCategory[];
}) {
  if (categories.length === 0) return null;

  return (
    <section className="mb-10" aria-labelledby="find-new-music">
      <h2
        id="find-new-music"
        className="mb-1 font-display text-lg font-bold tracking-[-0.01em] text-ink"
      >
        Find new music
      </h2>
      <p className="mb-3 text-sm text-ink-muted">
        Browse a genre and add anything you like to your songs.
      </p>

      <ul className="grid grid-cols-2 gap-2.5">
        {categories.map((c) => (
          <li key={c.genre}>
            <Link
              href={`/songs/browse/${c.genre.toLowerCase()}`}
              className="group relative block overflow-hidden rounded-xl shadow-card transition-shadow hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
            >
              <CategoryArt
                genre={c.genre}
                className="aspect-[200/116] w-full transition-transform duration-300 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              {/* The label sits on the art, so the tile is the whole control
                  rather than a picture with a caption under it. */}
              <span className="absolute inset-x-0 bottom-0 px-3 pt-8 pb-2.5 font-display text-[15px] leading-tight font-bold text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.45)]">
                {c.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

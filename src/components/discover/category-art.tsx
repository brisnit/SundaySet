import Image from "next/image";

import type { Genre } from "@/generated/prisma/enums";

/**
 * Photography for the genre tiles.
 *
 * Supplied artwork, stored locally and served from our own origin — nothing is
 * hotlinked, which is the same rule the Discover song tiles follow.
 *
 * Only the genres we have a photograph for appear anywhere, so there is no
 * placeholder state to design: `hasArt` is the gate.
 */
const ART: Partial<Record<Genre, string>> = {
  WORSHIP: "/genres/worship.jpg",
  GOSPEL: "/genres/gospel.jpg",
  POP: "/genres/pop.jpg",
  ROCK: "/genres/rock.jpg",
  RNB: "/genres/rnb.jpg",
  SOUL: "/genres/soul.jpg",
  HIP_HOP: "/genres/hip_hop.jpg",
  COUNTRY: "/genres/country.jpg",
  JAZZ: "/genres/jazz.jpg",
  FOLK: "/genres/folk.jpg",
  ELECTRONIC: "/genres/electronic.jpg",
  CLASSICAL: "/genres/classical.jpg",
};

export function hasArt(genre: Genre): boolean {
  return Boolean(ART[genre]);
}

export function CategoryArt({
  genre,
  sizes,
  priority,
  className,
}: {
  genre: Genre;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const src = ART[genre];
  if (!src) return null;

  return (
    <Image
      src={src}
      /* Decorative: every tile carries the genre name as real text beside it,
         so an alt here would just announce the same thing twice. */
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      /* The label sits on top of these, and the photographs range from a
         near-black jazz club to a stage under white light. The scrim in the
         tile handles most of it; object-cover keeps faces out of the corner. */
      className={className}
      style={{ objectFit: "cover" }}
    />
  );
}

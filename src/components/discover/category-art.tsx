/**
 * Artwork for the Find new music categories.
 *
 * Drawn here rather than fetched. The same rule the Discover song tiles follow:
 * nothing is scraped and nothing is hotlinked, so there is no third-party image
 * to license, cache or have taken down. These are ours.
 *
 * Each category gets its own two-stop gradient and its own motif, so a card is
 * recognisable by shape as well as by colour — which matters on a phone, where
 * the label is small and the art is most of what you see.
 */
export type CategoryArtKey =
  | "for-you"
  | "trending"
  | "hymns"
  | "communion"
  | "easter"
  | "christmas";

const GRADIENTS: Record<CategoryArtKey, [string, string]> = {
  "for-you": ["#4c1d95", "#8b42c2"],
  trending: ["#7c2d5e", "#c2410c"],
  hymns: ["#1e3a5f", "#0f766e"],
  communion: ["#5b1717", "#9f1239"],
  easter: ["#a16207", "#eab308"],
  christmas: ["#14532d", "#15803d"],
};

/** Motifs sit on a 96x96 grid and are drawn in white at low opacity. */
function Motif({ art }: { art: CategoryArtKey }) {
  const stroke = {
    fill: "none",
    stroke: "#fff",
    strokeWidth: 3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (art) {
    // A four-point sparkle: the pick made for you.
    case "for-you":
      return (
        <g>
          <path
            d="M48 22c2 12 8 18 20 20-12 2-18 8-20 20-2-12-8-18-20-20 12-2 18-8 20-20Z"
            fill="#fff"
            fillOpacity=".9"
          />
          <path
            d="M70 58c1 6 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-3 9-9Z"
            fill="#fff"
            fillOpacity=".55"
          />
        </g>
      );

    // Equaliser bars climbing: what is being played more this week.
    case "trending":
      return (
        <g fill="#fff">
          <rect x="22" y="58" width="9" height="20" rx="4" fillOpacity=".5" />
          <rect x="37" y="46" width="9" height="32" rx="4" fillOpacity=".65" />
          <rect x="52" y="32" width="9" height="46" rx="4" fillOpacity=".8" />
          <rect x="67" y="20" width="9" height="58" rx="4" fillOpacity=".95" />
        </g>
      );

    // Organ pipes under an arch.
    case "hymns":
      return (
        <g>
          <path d="M28 76V44a20 20 0 0 1 40 0v32" {...stroke} strokeOpacity=".55" />
          <g fill="#fff">
            <rect x="36" y="52" width="7" height="24" rx="3.5" fillOpacity=".9" />
            <rect x="47" y="44" width="7" height="32" rx="3.5" fillOpacity=".75" />
            <rect x="58" y="56" width="7" height="20" rx="3.5" fillOpacity=".9" />
          </g>
        </g>
      );

    // A cup.
    case "communion":
      return (
        <g>
          <path d="M32 26h32l-4 18a12 12 0 0 1-24 0L32 26Z" fill="#fff" fillOpacity=".9" />
          <path d="M48 56v16" {...stroke} strokeOpacity=".8" />
          <path d="M34 74h28" {...stroke} strokeOpacity=".8" />
        </g>
      );

    // Sunrise over a horizon.
    case "easter":
      return (
        <g>
          {/* Rays first: the disc paints over their inner ends, so no stroke
              shows through the face of the sun. */}
          {[0, 45, 90, 135].map((deg) => (
            <line
              key={deg}
              x1="48"
              y1="52"
              x2="48"
              y2="18"
              {...stroke}
              strokeWidth="2.5"
              strokeOpacity=".45"
              transform={`rotate(${deg - 90} 48 52)`}
            />
          ))}
          <circle cx="48" cy="52" r="16" fill="#fff" fillOpacity=".92" />
          <path d="M18 68h60" {...stroke} strokeOpacity=".85" />
        </g>
      );

    // A five-point star. Deliberately not the four-point sparkle used for
    // "for you" — on a phone the silhouette is most of what you can see.
    case "christmas":
      return (
        <g>
          <path
            d="m48 18 9.1 18.4 20.4 3-14.8 14.4 3.5 20.3L48 64.5 29.8 74.1l3.5-20.3L18.5 39.4l20.4-3L48 18Z"
            fill="#fff"
            fillOpacity=".92"
          />
        </g>
      );
  }
}

export function CategoryArt({
  art,
  className,
}: {
  art: CategoryArtKey;
  className?: string;
}) {
  const [from, to] = GRADIENTS[art];
  const id = `catart-${art}`;

  return (
    <svg
      viewBox="0 0 96 96"
      aria-hidden
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width="96" height="96" fill={`url(#${id})`} />
      <Motif art={art} />
    </svg>
  );
}

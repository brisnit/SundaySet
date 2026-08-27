import type { Genre } from "@/generated/prisma/enums";

/**
 * Artwork for the genre tiles.
 *
 * Drawn here rather than photographed. Every browse screen of this kind uses
 * duotone press shots of real artists, and we cannot: those are licensed
 * images of identifiable people, and the whole Any Song architecture rests on
 * not holding third-party artwork. So each genre gets a colour field and an
 * instrument, which is what the genre actually looks like anyway.
 *
 * The motif bleeds off the right edge at low contrast, exactly the way a
 * duotone photo does, so the label always has a clean corner to sit in.
 */

type Art = { from: string; to: string; motif: Motif };
type Motif =
  | "hands" | "organ" | "hymnal" | "mic" | "electric" | "distortion"
  | "cassette" | "vinyl" | "spotlight" | "bass" | "turntable" | "hat"
  | "banjo" | "acoustic" | "sax" | "harmonica" | "waveform" | "piano" | "note";

const ART: Record<Genre, Art> = {
  WORSHIP:     { from: "#3b0a6b", to: "#7c3aed", motif: "hands" },
  GOSPEL:      { from: "#6d1f52", to: "#c026a3", motif: "organ" },
  TRADITIONAL: { from: "#1e3a5f", to: "#0f766e", motif: "hymnal" },
  POP:         { from: "#be185d", to: "#f472b6", motif: "mic" },
  ROCK:        { from: "#7f1d1d", to: "#ea580c", motif: "electric" },
  ALTERNATIVE: { from: "#3f3d1a", to: "#a3a327", motif: "distortion" },
  INDIE:       { from: "#155e5e", to: "#22a39f", motif: "cassette" },
  RNB:         { from: "#4c1d95", to: "#8b5cf6", motif: "vinyl" },
  SOUL:        { from: "#7c2d12", to: "#d97706", motif: "spotlight" },
  FUNK:        { from: "#713f12", to: "#eab308", motif: "bass" },
  HIP_HOP:     { from: "#1e3a8a", to: "#6366f1", motif: "turntable" },
  COUNTRY:     { from: "#854d0e", to: "#e0a020", motif: "hat" },
  FOLK:        { from: "#365314", to: "#84cc16", motif: "banjo" },
  ACOUSTIC:    { from: "#3f2d16", to: "#b98a4b", motif: "acoustic" },
  JAZZ:        { from: "#312e81", to: "#4f46e5", motif: "sax" },
  BLUES:       { from: "#0c2d5e", to: "#2563eb", motif: "harmonica" },
  ELECTRONIC:  { from: "#064e4b", to: "#14b8a6", motif: "waveform" },
  CLASSICAL:   { from: "#3f3f46", to: "#94a3b8", motif: "piano" },
  OTHER:       { from: "#334155", to: "#64748b", motif: "note" },
};

/** Motifs are drawn on a 120x120 grid, anchored to the tile's right edge. */
function Shape({ motif }: { motif: Motif }) {
  const line = {
    fill: "none",
    stroke: "#fff",
    strokeWidth: 5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (motif) {
    case "hands": // raised hands
      return (
        <g {...line}>
          <path d="M44 108V62a8 8 0 0 1 16 0v16" />
          <path d="M60 78V54a8 8 0 0 1 16 0v24" />
          <path d="M76 78V60a8 8 0 0 1 16 0v48" />
          <path d="M44 84 32 72" />
        </g>
      );
    case "organ": // pipes
      return (
        <g fill="#fff">
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={30 + i * 14} y={40 + (i % 2) * 16} width="9" height={70 - (i % 2) * 16} rx="4.5" />
          ))}
        </g>
      );
    case "hymnal": // open book
      return (
        <g {...line}>
          <path d="M60 44v56" />
          <path d="M60 44c-8-8-20-10-30-8v56c10-2 22 0 30 8" />
          <path d="M60 44c8-8 20-10 30-8v56c-10-2-22 0-30 8" />
        </g>
      );
    case "mic": // handheld microphone
      return (
        <g {...line}>
          <rect x="48" y="26" width="24" height="42" rx="12" fill="#fff" stroke="none" />
          <path d="M38 60a22 22 0 0 0 44 0" />
          <path d="M60 82v22" />
        </g>
      );
    case "electric": // amplifier stack
      return (
        <g {...line}>
          <rect x="20" y="30" width="80" height="34" rx="6" />
          <rect x="20" y="70" width="80" height="40" rx="6" />
          <circle cx="60" cy="90" r="13" />
          <path d="M32 42h10M52 42h10M72 42h10" strokeWidth="6" />
        </g>
      );
    case "distortion": // jagged waveform
      return (
        <g {...line}>
          <path d="M20 66l14-28 12 52 14-64 12 52 14-30 14 18" />
        </g>
      );
    case "cassette":
      return (
        <g {...line}>
          <rect x="22" y="42" width="76" height="48" rx="8" />
          <circle cx="46" cy="66" r="9" />
          <circle cx="74" cy="66" r="9" />
        </g>
      );
    case "vinyl":
      return (
        <g {...line}>
          <circle cx="60" cy="66" r="34" />
          <circle cx="60" cy="66" r="16" />
          <circle cx="60" cy="66" r="4" fill="#fff" />
        </g>
      );
    case "spotlight": // vintage ribbon microphone
      return (
        <g {...line}>
          <rect x="42" y="24" width="36" height="46" rx="12" />
          <path d="M42 40h36M42 54h36" strokeWidth="3" strokeOpacity=".7" />
          <path d="M34 34v22a26 26 0 0 0 52 0V34" strokeOpacity=".7" />
          <path d="M60 82v20M44 104h32" />
        </g>
      );
    case "bass": // bass guitar with strings
      return (
        <g {...line}>
          <path d="M90 22 60 52" />
          <path d="M60 52c-16-4-30 6-30 22s14 28 26 22 16-18 12-28" />
          <path d="M84 28 56 56M78 22 50 50" strokeWidth="2.5" strokeOpacity=".6" />
        </g>
      );
    case "turntable":
      return (
        <g {...line}>
          <circle cx="56" cy="70" r="30" />
          <circle cx="56" cy="70" r="5" fill="#fff" />
          <path d="M96 34 74 62" />
        </g>
      );
    case "hat": // cowboy hat
      return (
        <g {...line}>
          <path d="M40 70c0-18 6-30 20-30s20 12 20 30" />
          <path d="M18 74c14 10 28 14 42 14s28-4 42-14c-8-2-14 2-20 2H38c-6 0-12-4-20-2Z" fill="#fff" stroke="none" />
        </g>
      );
    case "banjo":
      return (
        <g {...line}>
          <circle cx="46" cy="76" r="26" />
          <circle cx="46" cy="76" r="14" strokeWidth="2.5" strokeOpacity=".6" />
          <path d="M64 58 98 24" />
        </g>
      );
    case "acoustic": // acoustic guitar body
      return (
        <g {...line}>
          <path d="M56 40c14 0 22 10 22 22 0 8-4 12-4 20s6 14 6 22c0 12-10 20-24 20s-24-8-24-20c0-8 6-14 6-22s-4-12-4-20c0-12 8-22 22-22Z" />
          <circle cx="56" cy="76" r="8" />
        </g>
      );
    case "sax": // trumpet — a horn reads at this size where a sax does not
      return (
        <g {...line}>
          <path d="M18 66h56" strokeWidth="9" />
          <path d="M74 44c12 4 20 11 20 22s-8 18-20 22V44Z" fill="#fff" stroke="none" />
          <path d="M34 66V50M48 66V50M62 66V50" strokeWidth="5" />
        </g>
      );
    case "harmonica":
      return (
        <g {...line}>
          <rect x="18" y="52" width="84" height="30" rx="6" />
          <path d="M34 52v30M50 52v30M66 52v30M82 52v30" strokeWidth="3" strokeOpacity=".7" />
        </g>
      );
    case "waveform":
      return (
        <g fill="#fff">
          {[26, 20, 40, 30, 54, 36, 44, 24].map((h, i) => (
            <rect key={i} x={20 + i * 12} y={66 - h / 2} width="7" height={h} rx="3.5" />
          ))}
        </g>
      );
    case "piano": // keys
      return (
        <g {...line}>
          <rect x="18" y="44" width="84" height="46" rx="5" />
          <path d="M39 44v46M60 44v46M81 44v46" strokeWidth="3" />
          <g fill="#fff" stroke="none">
            <rect x="33" y="44" width="10" height="26" rx="2" />
            <rect x="54" y="44" width="10" height="26" rx="2" />
            <rect x="75" y="44" width="10" height="26" rx="2" />
          </g>
        </g>
      );
    case "note":
      return (
        <g {...line}>
          <path d="M50 88V34l34-8v54" />
          <circle cx="40" cy="90" r="11" fill="#fff" stroke="none" />
          <circle cx="74" cy="82" r="11" fill="#fff" stroke="none" />
        </g>
      );
  }
}

export function CategoryArt({
  genre,
  className,
}: {
  genre: Genre;
  className?: string;
}) {
  const art = ART[genre] ?? ART.OTHER;
  const id = `genre-${genre.toLowerCase()}`;

  return (
    <svg
      viewBox="0 0 200 116"
      aria-hidden
      focusable="false"
      className={className}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={art.from} />
          <stop offset="100%" stopColor={art.to} />
        </linearGradient>
      </defs>
      <rect width="200" height="116" fill={`url(#${id})`} />
      {/* Bled off the right edge and held back in contrast, so the label
          keeps a clean corner the way it does over a real photograph. */}
      <g transform="translate(96 -4) scale(1.05)" opacity=".38">
        <Shape motif={art.motif} />
      </g>
    </svg>
  );
}

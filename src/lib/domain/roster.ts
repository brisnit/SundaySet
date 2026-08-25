/**
 * The positions a normal Sunday is expected to fill.
 *
 * MVP simplification: one church-wide list. The schema already supports
 * per-ServiceType roster templates, which is where this belongs once churches
 * run services with genuinely different shapes (a Saturday acoustic set does
 * not need a full band). Until then a single list is honest and predictable —
 * and it is what makes "Keys — OPEN" appear on the dashboard.
 */
export const DEFAULT_ROSTER = [
  "Worship Leader",
  "Acoustic Guitar",
  "Electric Guitar",
  "Bass",
  "Drums",
  "Keys",
  "Vocal",
  "Sound",
  "Slides",
] as const;

export function openPositions(assignedPositionNames: string[]): string[] {
  const filled = new Set(assignedPositionNames);
  return DEFAULT_ROSTER.filter((p) => !filled.has(p));
}

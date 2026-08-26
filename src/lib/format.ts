/**
 * Formatting for calendar dates and wall-clock times.
 *
 * Service dates are stored as @db.Date and read back as UTC-midnight. They are
 * calendar dates, not instants, so every formatter here pins timeZone to UTC.
 * Formatting them in the viewer's local zone would shift a Sunday service to
 * Saturday for anyone west of the church.
 */
const UTC = "UTC";

export function formatServiceDate(
  date: Date,
  opts: { weekday?: boolean; year?: boolean } = {},
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: UTC,
    weekday: opts.weekday === false ? undefined : "long",
    month: "long",
    day: "numeric",
    year: opts.year ? "numeric" : undefined,
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: UTC,
    month: "short",
    day: "numeric",
  }).format(date);
}

/** "SEP 6" — the stacked date chip used in list and musician views. */
export function formatDateChip(date: Date): { month: string; day: string } {
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: UTC,
    month: "short",
  })
    .format(date)
    .toUpperCase();
  return { month, day: String(date.getUTCDate()) };
}

/** "10:00" → "10:00 AM". Times are church-local wall clock, never converted. */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m ?? 0).padStart(2, "0")} ${period}`;
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * What to call a set in lists and headings.
 *
 * Sets used to fall back to the sermon title when unnamed. Sermons are gone
 * from the product, so an unnamed set is named by its date — which is what a
 * musician recognises it by anyway.
 */
export function setName(set: { title?: string | null; date: Date }): string {
  return set.title?.trim() || formatServiceDate(set.date, { weekday: false });
}

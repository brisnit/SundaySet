import { z } from "zod";

import { blankToUndefined, optionalFormId, optionalFormText } from "./form";

/**
 * Service input.
 *
 * Dates and times follow the model set in §9 D5 of the handoff: a service is a
 * calendar date plus a local wall-clock time, interpreted in the church's
 * timezone. We never build a UTC instant from them, because a recurring 10:00
 * service must not drift an hour when daylight saving changes.
 */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" → UTC-midnight Date, matching how @db.Date reads back. */
export function parseServiceDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** UTC-midnight Date → "YYYY-MM-DD" for a date input's value. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const serviceDate = z
  .string()
  .trim()
  .regex(ISO_DATE, "Choose a date")
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const parsed = new Date(Date.UTC(y, m - 1, d));
    // Rejects 2026-02-31, which Date would silently roll into March.
    return (
      parsed.getUTCFullYear() === y &&
      parsed.getUTCMonth() === m - 1 &&
      parsed.getUTCDate() === d
    );
  }, "That date does not exist")
  .transform(parseServiceDate);

const time = (message: string) =>
  z.string().trim().regex(TIME, message);

const optionalTime = optionalFormText(5).refine(
  (v) => v === undefined || TIME.test(v),
  { message: "Use a 24-hour time such as 08:30" },
);

export const serviceInputSchema = z.object({
  date: serviceDate,
  serviceTypeId: optionalFormId(),
  startTime: time("Use a 24-hour time such as 10:00"),
  callTime: optionalTime,
  title: optionalFormText(160),
  notes: optionalFormText(4000),
  status: z
    .enum(["DRAFT", "READY", "INVITATIONS_SENT", "CONFIRMED", "COMPLETED"])
    .default("DRAFT"),

  // Sermon is a 1:1 relation on Service, so it belongs on the same form. These
  // themes are what the AI planner will match songs against later.
  sermonTitle: optionalFormText(200),
  sermonSeries: optionalFormText(160),
  sermonScripture: optionalFormText(160),
  sermonDescription: optionalFormText(4000),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

/** True when any sermon field was filled in. */
export function hasSermonContent(input: ServiceInput): boolean {
  return Boolean(
    input.sermonTitle ||
      input.sermonSeries ||
      input.sermonScripture ||
      input.sermonDescription,
  );
}

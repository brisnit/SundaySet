import { z } from "zod";

import { blankToUndefined, optionalFormId, optionalFormText } from "./form";

/**
 * Team member input.
 *
 * A team member is a person the church schedules, not an account. `userId`
 * stays optional and is never set here — adding someone to the roster must not
 * require them to sign up for SetMeister.
 */
/**
 * Phone numbers are stored as typed, not normalised. Churches have
 * international numbers, extensions and "call the house" notes, and mangling
 * them helps nobody — we only reject input that cannot be a phone number.
 */
const phone = optionalFormText(40).refine(
  (v) => v === undefined || /^[\d\s()+.\-x]{6,40}$/i.test(v),
  { message: "That does not look like a phone number" },
);

const email = optionalFormText(200)
  .transform((v) => v?.toLowerCase())
  .refine((v) => v === undefined || z.string().email().safeParse(v).success, {
    message: "Enter a valid email address",
  });

export const teamMemberInputSchema = z.object({
  name: z.string().trim().min(1, "Give this person a name").max(120),
  email,
  phone,
  vocalRange: optionalFormText(60),
  notes: optionalFormText(4000),
  active: z.boolean().default(true),

  /** Rotation fairness target. 0 means "no preference". */
  preferredPerMonth: z
    .unknown()
    .optional()
    .transform((v) => {
      const blank = blankToUndefined(v);
      return blank === undefined ? 2 : Number(blank);
    })
    .refine((v) => Number.isInteger(v) && v >= 0 && v <= 31, {
      message: "Choose between 0 and 31 times a month",
    }),

  preferredServiceTypeId: optionalFormId(),

  /** Position ids this person can serve in. May be empty. */
  positionIds: z.array(z.string().trim().min(1)).default([]),
});

export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;

/** Checkbox fields arrive absent when unchecked, so coerce explicitly. */
export function checkboxToBoolean(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true" || value === "1";
}

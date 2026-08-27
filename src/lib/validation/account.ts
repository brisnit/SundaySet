import { z } from "zod";

import { optionalFormText } from "./form";

/**
 * Avatar monogram colours.
 *
 * A colour picker works with no file storage at all, so changing your icon is
 * never blocked on blob storage being configured. A photo can be uploaded on
 * top where storage is available.
 */
export const AVATAR_COLORS = [
  { value: "violet", label: "Violet", className: "bg-[#370061] text-white" },
  { value: "grape", label: "Grape", className: "bg-[#8b42c2] text-white" },
  { value: "sky", label: "Sky", className: "bg-[#1d4ed8] text-white" },
  { value: "teal", label: "Teal", className: "bg-[#0f766e] text-white" },
  { value: "moss", label: "Moss", className: "bg-[#15803d] text-white" },
  { value: "amber", label: "Amber", className: "bg-[#a16207] text-white" },
  { value: "rose", label: "Rose", className: "bg-[#b91c1c] text-white" },
  { value: "slate", label: "Slate", className: "bg-[#475569] text-white" },
] as const;

export const AVATAR_COLOR_VALUES = AVATAR_COLORS.map((c) => c.value) as [
  string,
  ...string[],
];

export function avatarColorClass(value: string | null | undefined): string {
  return (
    AVATAR_COLORS.find((c) => c.value === value)?.className ??
    "bg-ember-soft text-ember-ink"
  );
}

/**
 * Phone numbers are stored as typed — international formats and extensions are
 * normal, and normalising them helps nobody. Same rule as the team roster.
 */
const phone = optionalFormText(40).refine(
  (v) => v === undefined || /^[\d\s()+.\-x]{6,40}$/i.test(v),
  { message: "That does not look like a phone number" },
);

export const accountInputSchema = z.object({
  name: z.string().trim().min(1, "Give your account a name").max(120),
  phone,
  avatarColor: z
    .preprocess(
      (v) => (v === "" || v === null ? undefined : v),
      z.enum(AVATAR_COLOR_VALUES).optional(),
    )
    .optional(),
});

export type AccountInput = z.infer<typeof accountInputSchema>;

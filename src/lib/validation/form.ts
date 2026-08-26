import { z } from "zod";

/**
 * Helpers for fields that come out of a FormData.
 *
 * `formData.get()` returns `null` for a field that is absent, and `""` for one
 * that is present but empty. Both mean "the user left this blank", but a plain
 * `.optional()` only accepts `undefined` — so an absent field failed with
 * "Invalid input: expected string, received null", which is both wrong and
 * unreadable. Anything that can legitimately be missing goes through here.
 */
export function blankToUndefined(value: unknown): unknown {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}

/** Optional free text, trimmed, with a maximum length. */
export function optionalFormText(max: number) {
  return z.preprocess(
    blankToUndefined,
    z.string().trim().max(max).optional(),
  );
}

/** An optional id reference — blank means "none selected". */
export function optionalFormId(max = 64) {
  return z.preprocess(
    blankToUndefined,
    z.string().trim().max(max).optional(),
  );
}

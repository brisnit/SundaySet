import { z } from "zod";

/** Keys a service song may be set to. Blank means "use the song's own key". */
export const SETLIST_KEYS = [
  "C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb",
  "G", "G#", "Ab", "A", "A#", "Bb", "B",
] as const;

const id = z.string().trim().min(1).max(64);

export const addSongSchema = z.object({
  serviceId: id,
  songId: id,
});

export const setKeySchema = z.object({
  serviceSongId: id,
  // An empty selection clears the key rather than storing "".
  key: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v))
    .refine(
      (v) => v === null || (SETLIST_KEYS as readonly string[]).includes(v),
      { message: "That is not a musical key" },
    ),
});

export const moveSchema = z.object({
  serviceSongId: id,
  direction: z.enum(["up", "down"]),
});

export const removeSchema = z.object({
  serviceSongId: id,
});

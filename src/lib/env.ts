import "server-only";

import { z } from "zod";

/**
 * Server-side environment contract.
 *
 * Only DATABASE_URL and AUTH_SECRET are hard requirements — the app must still
 * boot and be explorable when AI, email, and blob storage are unconfigured, so
 * those features degrade with a clear message instead of crashing the process.
 */
const schema = z.object({
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),

  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url().optional(),

  AI_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  AI_MODEL: z.string().default("gpt-5"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("SetMeister <noreply@example.com>"),

  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  /**
   * MusicBrainz requires a User-Agent that identifies the application and gives
   * them a way to make contact — anonymous agents are throttled hard. There is
   * no API key; this string is the whole credential.
   */
  MUSICBRAINZ_CONTACT: z.string().optional(),

  APP_URL: z.string().url().default("http://localhost:3000"),
  INVITATION_TOKEN_SECRET: z.string().optional(),
});

/**
 * An environment variable that exists with an empty value means "not set".
 *
 * Hosting dashboards create variables from a template, so `AI_PROVIDER=""` and
 * `OPENAI_BASE_URL=""` are entirely normal. Passing those through made an enum
 * reject "" as an invalid option and a URL field reject "" as a malformed URL,
 * taking down every request that read config — rather than falling back to the
 * defaults that exist for exactly this case.
 */
function withoutBlanks(source: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return out;
}

function load() {
  const parsed = schema.safeParse(withoutBlanks(process.env));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill in the missing values.`,
    );
  }
  return parsed.data;
}

let cached: z.infer<typeof schema> | undefined;

export function env() {
  cached ??= load();
  return cached;
}

/** Feature availability, so the UI can explain what is switched off and why. */
export const features = {
  get ai() {
    const e = env();
    return e.AI_PROVIDER === "anthropic"
      ? Boolean(e.ANTHROPIC_API_KEY)
      : Boolean(e.OPENAI_API_KEY);
  },
  get email() {
    return Boolean(env().RESEND_API_KEY);
  },
  get uploads() {
    return Boolean(env().BLOB_READ_WRITE_TOKEN);
  },
};

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Invitation tokens.
 *
 * The raw token is the bearer credential and is NEVER stored. Only a keyed
 * digest goes in the database, so a dump of the Invitation table cannot be
 * turned back into working links, and precomputation is useless without the
 * server-side pepper.
 *
 * Tokens are 32 bytes of CSPRNG output — opaque, unguessable, and carrying no
 * church, service or member identifier. Nothing about who or what the link is
 * for can be read off the URL.
 */
const TOKEN_BYTES = 32;

/** base64url has no characters that need escaping in a URL or a text message. */
export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

function pepper(): string {
  // Falls back to AUTH_SECRET so tokens are always keyed, never bare SHA-256.
  const secret = process.env.INVITATION_TOKEN_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "Cannot hash invitation tokens: set INVITATION_TOKEN_SECRET or AUTH_SECRET.",
    );
  }
  return secret;
}

export function hashToken(token: string): string {
  return createHmac("sha256", pepper()).update(token).digest("hex");
}

/** Constant-time compare, for anywhere two digests are checked directly. */
export function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Rejects anything that cannot be one of our tokens before it reaches the
 * database, so malformed input costs no query.
 */
export function looksLikeToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 32 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

/**
 * A link stays usable through the service day and one day after, then dies.
 * Absolute rather than rolling, so a leader can invite months ahead and the
 * link still expires the moment it stops being useful.
 */
export function expiryForService(serviceDate: Date): Date {
  return new Date(serviceDate.getTime() + 2 * 86_400_000);
}

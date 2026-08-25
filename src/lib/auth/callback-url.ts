/**
 * Auth.js stores the post-login destination in an `authjs.callback-url` cookie
 * and validates it on every sign-in POST. If the value is not a valid absolute
 * http(s) URL — or a root-relative path — the whole config assertion fails and
 * Auth.js returns a raw JSON 500 *before* the configured error page applies:
 *
 *   {"message":"There was a problem with the server configuration. ..."}
 *
 * The cookie then persists, so every later attempt fails identically. Browsers
 * scope cookies by host and ignore the port, so a stale cookie from any other
 * localhost project can poison sign-in here. We validate it ourselves and clear
 * it when it is unusable, which turns a dead end into a self-healing redirect.
 *
 * Mirrors @auth/core's own `isValidHttpUrl`.
 */
export const CALLBACK_URL_COOKIES = [
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
] as const;

export function isValidCallbackUrl(value: string, origin: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value, value.startsWith("/") ? origin : undefined);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

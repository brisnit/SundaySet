import { describe, expect, it } from "vitest";

import {
  CALLBACK_URL_COOKIES,
  isValidCallbackUrl,
} from "@/lib/auth/callback-url";

const ORIGIN = "http://localhost:3000";

/**
 * Regression guard. A malformed authjs.callback-url cookie makes Auth.js return
 * a raw JSON 500 that no error page can intercept, and the cookie persists so
 * every later sign-in fails the same way. proxy.ts clears anything this
 * rejects, so the rule must match @auth/core's.
 */
describe("isValidCallbackUrl", () => {
  it.each([
    "http://localhost:3000/home",
    "https://setmeister.example.com/home",
    "/home",
    "/plan/abc123",
    "/",
  ])("accepts %s", (value) => {
    expect(isValidCallbackUrl(value, ORIGIN)).toBe(true);
  });

  it.each([
    ["not-a-url", "the exact value that reproduced the reported 500"],
    ["", "empty cookie"],
    ["home", "relative without a leading slash"],
    ["javascript:alert(1)", "non-http scheme"],
    ["data:text/html,x", "data URI"],
    ["ftp://example.com", "unsupported protocol"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidCallbackUrl(value, ORIGIN)).toBe(false);
  });

  it("resolves a root-relative path against the current origin, not a fixed port", () => {
    // The app must work on whatever port Next picks.
    expect(isValidCallbackUrl("/home", "http://localhost:3200")).toBe(true);
  });

  it("covers both the plain and __Secure- cookie names", () => {
    expect(CALLBACK_URL_COOKIES).toContain("authjs.callback-url");
    expect(CALLBACK_URL_COOKIES).toContain("__Secure-authjs.callback-url");
  });
});

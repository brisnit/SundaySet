import { describe, expect, it, vi } from "vitest";

import {
  expiryForService,
  generateToken,
  hashToken,
  looksLikeToken,
  tokensMatch,
} from "@/lib/invitations/token";

describe("generateToken", () => {
  it("produces a URL-safe token with no padding", () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t).not.toContain("=");
  });

  it("is long enough to be unguessable", () => {
    // 32 bytes -> 43 base64url characters.
    expect(generateToken().length).toBeGreaterThanOrEqual(43);
  });

  it("never repeats", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateToken()));
    expect(seen.size).toBe(500);
  });

  it("carries no identifiers — it is pure randomness", () => {
    // Two tokens share no long common substring.
    const [a, b] = [generateToken(), generateToken()];
    expect(a.slice(0, 20)).not.toBe(b.slice(0, 20));
  });
});

describe("hashToken", () => {
  it("is deterministic for the same token", () => {
    const t = generateToken();
    expect(hashToken(t)).toBe(hashToken(t));
  });

  it("differs for different tokens", () => {
    expect(hashToken(generateToken())).not.toBe(hashToken(generateToken()));
  });

  it("never returns the token itself", () => {
    const t = generateToken();
    const h = hashToken(t);
    expect(h).not.toBe(t);
    expect(h).not.toContain(t);
  });

  it("is a 64-character hex digest", () => {
    expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is keyed — the same token hashes differently under a different pepper", () => {
    const t = generateToken();
    vi.stubEnv("INVITATION_TOKEN_SECRET", "pepper-one");
    const first = hashToken(t);
    vi.stubEnv("INVITATION_TOKEN_SECRET", "pepper-two");
    const second = hashToken(t);
    vi.unstubAllEnvs();
    expect(first).not.toBe(second);
  });
});

describe("looksLikeToken", () => {
  it("accepts a generated token", () => {
    expect(looksLikeToken(generateToken())).toBe(true);
  });

  it.each([
    ["", "empty"],
    ["short", "too short"],
    ["a".repeat(200), "too long"],
    ["has spaces in it aaaaaaaaaaaaaaaaaaaaaaaaaaaa", "spaces"],
    ["../../etc/passwd-aaaaaaaaaaaaaaaaaaaaaaaaaaaa", "path traversal"],
    ["<script>aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "markup"],
    ["' OR 1=1 --aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "sql-ish"],
  ])("rejects %s (%s)", (value) => {
    expect(looksLikeToken(value)).toBe(false);
  });

  it.each([null, undefined, 42, {}, []])("rejects non-string %s", (value) => {
    expect(looksLikeToken(value)).toBe(false);
  });
});

describe("tokensMatch", () => {
  it("matches identical digests", () => {
    expect(tokensMatch("abc123", "abc123")).toBe(true);
  });

  it("rejects different digests and different lengths", () => {
    expect(tokensMatch("abc123", "abc124")).toBe(false);
    expect(tokensMatch("abc", "abcdef")).toBe(false);
  });
});

describe("expiryForService", () => {
  it("keeps the link alive through the service day and one day after", () => {
    const service = new Date(Date.UTC(2026, 8, 6));
    const expiry = expiryForService(service);
    expect(expiry.toISOString()).toBe("2026-09-08T00:00:00.000Z");
    expect(expiry.getTime()).toBeGreaterThan(service.getTime());
  });

  it("is absolute, so inviting months early still expires on time", () => {
    const service = new Date(Date.UTC(2027, 0, 3));
    expect(expiryForService(service).getUTCFullYear()).toBe(2027);
  });
});

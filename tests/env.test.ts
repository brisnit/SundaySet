import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: a hosting dashboard creates variables from a template, so an
 * variable that exists with an empty value is normal and must mean "unset".
 * Treating "" as a real value made AI_PROVIDER fail its enum and
 * OPENAI_BASE_URL fail its URL check, which 500'd every request reading config.
 */
async function freshEnv() {
  vi.resetModules();
  return (await import("@/lib/env")).env;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("environment configuration", () => {
  it("treats empty optional values as unset and falls back to defaults", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("OPENAI_BASE_URL", "");
    vi.stubEnv("EMAIL_FROM", "");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");

    const env = await freshEnv();
    expect(() => env()).not.toThrow();
    expect(env().AI_PROVIDER).toBe("openai");
    expect(env().OPENAI_BASE_URL).toBeUndefined();
    expect(env().EMAIL_FROM).toMatch(/SetMeister/);
  });

  it("still honours a real value", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("AI_PROVIDER", "anthropic");
    const env = await freshEnv();
    expect(env().AI_PROVIDER).toBe("anthropic");
  });

  it("still rejects a genuinely invalid value", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("AI_PROVIDER", "not-a-provider");
    const env = await freshEnv();
    expect(() => env()).toThrow(/AI_PROVIDER/);
  });

  it("still requires AUTH_SECRET", async () => {
    vi.stubEnv("AUTH_SECRET", "");
    const env = await freshEnv();
    expect(() => env()).toThrow(/AUTH_SECRET/);
  });

  it("reports an empty AI key as the feature being switched off, not an error", async () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(mod.features.ai).toBe(false);
    expect(mod.features.email).toBe(false);
  });
});

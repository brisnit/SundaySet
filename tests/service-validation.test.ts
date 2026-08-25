import { describe, expect, it } from "vitest";

import {
  hasSermonContent,
  parseServiceDate,
  serviceInputSchema,
  toDateInputValue,
  type ServiceInput,
} from "@/lib/validation/service";

const base = {
  date: "2026-08-30",
  startTime: "10:00",
  serviceTypeId: "",
  callTime: "",
  title: "",
  notes: "",
  sermonTitle: "",
  sermonSeries: "",
  sermonScripture: "",
  sermonDescription: "",
};

describe("service date handling", () => {
  it("parses a date input to UTC midnight, never a local instant", () => {
    const d = parseServiceDate("2026-08-30");
    expect(d.toISOString()).toBe("2026-08-30T00:00:00.000Z");
    expect(d.getUTCHours()).toBe(0);
  });

  it("round-trips through the date input format", () => {
    expect(toDateInputValue(parseServiceDate("2026-12-25"))).toBe("2026-12-25");
  });

  it("keeps the calendar day across a DST boundary", () => {
    // US DST ends 2026-11-01. A service that day must stay on the 1st.
    const d = parseServiceDate("2026-11-01");
    expect(toDateInputValue(d)).toBe("2026-11-01");
  });

  it("rejects a date that does not exist", () => {
    const r = serviceInputSchema.safeParse({ ...base, date: "2026-02-31" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toMatch(/does not exist/i);
    }
  });

  it("rejects a malformed date", () => {
    expect(serviceInputSchema.safeParse({ ...base, date: "30/08/2026" }).success).toBe(false);
    expect(serviceInputSchema.safeParse({ ...base, date: "" }).success).toBe(false);
  });
});

describe("time validation", () => {
  it.each(["00:00", "09:30", "10:00", "23:59"])("accepts %s", (t) => {
    expect(serviceInputSchema.safeParse({ ...base, startTime: t }).success).toBe(true);
  });

  it.each(["24:00", "9:30", "10:60", "10", "morning", ""])("rejects %s", (t) => {
    expect(serviceInputSchema.safeParse({ ...base, startTime: t }).success).toBe(false);
  });

  it("treats a blank call time as unset rather than invalid", () => {
    const r = serviceInputSchema.safeParse({ ...base, callTime: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.callTime).toBeUndefined();
  });

  it("still rejects a malformed call time", () => {
    expect(serviceInputSchema.safeParse({ ...base, callTime: "8am" }).success).toBe(false);
  });
});

describe("optional fields", () => {
  it("turns blank strings into undefined, not empty strings", () => {
    const r = serviceInputSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.title).toBeUndefined();
      expect(r.data.serviceTypeId).toBeUndefined();
      expect(r.data.sermonTitle).toBeUndefined();
    }
  });

  it("defaults status to DRAFT so nothing is published by accident", () => {
    const r = serviceInputSchema.safeParse(base);
    expect(r.success && r.data.status).toBe("DRAFT");
  });

  it("trims whitespace from text fields", () => {
    const r = serviceInputSchema.safeParse({ ...base, title: "  Sunday  " });
    expect(r.success && r.data.title).toBe("Sunday");
  });
});

describe("hasSermonContent", () => {
  const parsed = (over: Record<string, string>) => {
    const r = serviceInputSchema.safeParse({ ...base, ...over });
    if (!r.success) throw new Error("bad fixture");
    return r.data as ServiceInput;
  };

  it("is false when every sermon field is blank", () => {
    expect(hasSermonContent(parsed({}))).toBe(false);
  });

  it.each([
    ["sermonTitle", "The Prodigal Son"],
    ["sermonSeries", "Lost & Found"],
    ["sermonScripture", "Luke 15"],
    ["sermonDescription", "Grace and return."],
  ])("is true when only %s is filled in", (field, value) => {
    expect(hasSermonContent(parsed({ [field]: value }))).toBe(true);
  });

  it("ignores whitespace-only input", () => {
    expect(hasSermonContent(parsed({ sermonTitle: "   " }))).toBe(false);
  });
});

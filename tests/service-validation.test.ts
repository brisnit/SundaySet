import { describe, expect, it } from "vitest";

import {
  parseServiceDate,
  serviceInputSchema,
  toDateInputValue,
} from "@/lib/validation/service";

const base = {
  date: "2026-08-30",
  startTime: "10:00",
  serviceTypeId: "",
  callTime: "",
  title: "",
  notes: "",
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
      expect(r.data.notes).toBeUndefined();
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


describe("absent form fields", () => {
  // Same null-from-FormData regression as the team form.
  it("treats optional service fields arriving as null as blank", () => {
    const r = serviceInputSchema.safeParse({
      date: "2026-08-30",
      startTime: "10:00",
      serviceTypeId: null,
      callTime: null,
      title: null,
      notes: null,
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.callTime).toBeUndefined();
      expect(r.data.title).toBeUndefined();
      expect(r.data.serviceTypeId).toBeUndefined();
    }
  });
});

import { describe, expect, it } from "vitest";

import type { Role } from "@/generated/prisma/enums";
import {
  AuthorizationError,
  assertCan,
  can,
  isPlanner,
  PERMISSIONS,
  permissionsFor,
} from "@/lib/auth/roles";

const ALL_ROLES: Role[] = [
  "OWNER",
  "ADMIN",
  "WORSHIP_LEADER",
  "TEAM_LEADER",
  "MUSICIAN",
  "TECH",
  "PASTOR",
];

describe("role matrix", () => {
  it("defines permissions for every role", () => {
    for (const role of ALL_ROLES) {
      expect(permissionsFor(role).length).toBeGreaterThan(0);
    }
  });

  it("grants owners and admins everything", () => {
    for (const permission of PERMISSIONS) {
      expect(can("OWNER", permission)).toBe(true);
      expect(can("ADMIN", permission)).toBe(true);
    }
  });

  it("lets every role see their own schedule and availability", () => {
    for (const role of ALL_ROLES) {
      expect(can(role, "schedule:view-own")).toBe(true);
      expect(can(role, "availability:manage-own")).toBe(true);
    }
  });
});

describe("least privilege", () => {
  it("keeps church and member administration to owners and admins", () => {
    for (const role of ALL_ROLES) {
      const privileged = role === "OWNER" || role === "ADMIN";
      expect(can(role, "church:manage")).toBe(privileged);
      expect(can(role, "members:manage")).toBe(privileged);
      expect(can(role, "settings:manage")).toBe(privileged);
    }
  });

  it("does not let musicians, tech or pastors edit the song library", () => {
    for (const role of ["MUSICIAN", "TECH", "PASTOR"] as Role[]) {
      expect(can(role, "songs:manage")).toBe(false);
    }
  });

  it("does not let musicians or tech schedule the team or send invitations", () => {
    for (const role of ["MUSICIAN", "TECH"] as Role[]) {
      expect(can(role, "team:schedule")).toBe(false);
      expect(can(role, "invitations:send")).toBe(false);
    }
  });

  it("restricts AI usage to owners, admins and worship leaders", () => {
    const allowed = ALL_ROLES.filter((r) => can(r, "ai:use"));
    expect(allowed.sort()).toEqual(["ADMIN", "OWNER", "WORSHIP_LEADER"]);
  });

  it("gives pastors sermon access without service or song editing", () => {
    expect(can("PASTOR", "sermon:manage")).toBe(true);
    expect(can("PASTOR", "services:view")).toBe(true);
    expect(can("PASTOR", "services:manage")).toBe(false);
    expect(can("PASTOR", "songs:manage")).toBe(false);
  });

  it("keeps tech out of the song library entirely", () => {
    expect(can("TECH", "songs:view")).toBe(false);
    expect(can("TECH", "services:view")).toBe(true);
  });
});

describe("isPlanner", () => {
  it("separates admin-facing roles from purely participant roles", () => {
    expect(isPlanner("OWNER")).toBe(true);
    expect(isPlanner("WORSHIP_LEADER")).toBe(true);
    expect(isPlanner("TEAM_LEADER")).toBe(true);
    expect(isPlanner("MUSICIAN")).toBe(false);
    expect(isPlanner("TECH")).toBe(false);
    expect(isPlanner("PASTOR")).toBe(false);
  });
});

describe("assertCan", () => {
  it("throws AuthorizationError naming the missing permission", () => {
    expect(() => assertCan("MUSICIAN", "songs:manage")).toThrowError(
      AuthorizationError,
    );
    try {
      assertCan("MUSICIAN", "songs:manage");
    } catch (e) {
      expect((e as AuthorizationError).permission).toBe("songs:manage");
    }
  });

  it("passes silently when permitted", () => {
    expect(() => assertCan("WORSHIP_LEADER", "songs:manage")).not.toThrow();
  });
});

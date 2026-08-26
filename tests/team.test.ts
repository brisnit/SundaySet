import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Role } from "@/generated/prisma/enums";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { NotFoundError, type ChurchContext } from "@/lib/data/context";
import {
  createTeamMember,
  getTeamMemberById,
  listPositions,
  listTeamMembers,
  setTeamMemberActive,
  updateTeamMember,
} from "@/lib/data/team";
import { teamMemberInputSchema, type TeamMemberInput } from "@/lib/validation/team";

const SLUG_A = "vitest-team-alpha";
const SLUG_B = "vitest-team-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[team] No database reachable — skipping integration checks.\n");
}

const input = (over: Partial<TeamMemberInput> = {}): TeamMemberInput => ({
  name: "Alex Player",
  email: undefined,
  phone: undefined,
  vocalRange: undefined,
  notes: undefined,
  active: true,
  preferredPerMonth: 2,
  preferredServiceTypeId: undefined,
  positionIds: [],
  ...over,
});

async function makeChurch(slug: string) {
  const church = await db.church.create({ data: { name: slug, slug } });
  const user = await db.user.create({ data: { email: `${slug}@example.test` } });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });
  const positions = await Promise.all(
    [
      ["Worship Leader", "WORSHIP"],
      ["Bass", "WORSHIP"],
      ["Drums", "WORSHIP"],
      ["Sound", "TECH"],
    ].map(([name, category], i) =>
      db.position.create({
        data: {
          churchId: church.id,
          name,
          category: category as "WORSHIP" | "TECH",
          sortOrder: i,
        },
      }),
    ),
  );
  const serviceType = await db.serviceType.create({
    data: { churchId: church.id, name: "Sunday 10:00 AM", dayOfWeek: 0 },
  });
  const ctx: ChurchContext = {
    userId: user.id,
    user: { id: user.id, name: null, email: user.email, image: null },
    churchId: church.id,
    church: {
      id: church.id, name: church.name, slug: church.slug,
      timezone: church.timezone, logoUrl: null,
    },
    role: "OWNER",
  };
  return { ctx, positions, serviceTypeId: serviceType.id };
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
}

// ---------------------------------------------------------------------------
// Validation — no database needed
// ---------------------------------------------------------------------------

describe("team member validation", () => {
  const form = (over: Record<string, unknown> = {}) => ({
    name: "Alex Player",
    email: "",
    phone: "",
    vocalRange: "",
    notes: "",
    active: true,
    preferredPerMonth: "2",
    preferredServiceTypeId: "",
    positionIds: [],
    ...over,
  });

  it("requires a name", () => {
    expect(teamMemberInputSchema.safeParse(form({ name: "  " })).success).toBe(false);
  });

  it("treats blank contact fields as unset rather than empty strings", () => {
    const r = teamMemberInputSchema.safeParse(form());
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBeUndefined();
      expect(r.data.phone).toBeUndefined();
    }
  });

  it("lowercases email so duplicates are easier to spot later", () => {
    const r = teamMemberInputSchema.safeParse(form({ email: "  Alex@Example.COM " }));
    expect(r.success && r.data.email).toBe("alex@example.com");
  });

  it("rejects a malformed email", () => {
    expect(teamMemberInputSchema.safeParse(form({ email: "not-an-email" })).success).toBe(false);
  });

  it.each([
    "555-123-4567",
    "+44 20 7946 0958",
    "(555) 123 4567 x22",
  ])("accepts real-world phone format %s", (phone) => {
    expect(teamMemberInputSchema.safeParse(form({ phone })).success).toBe(true);
  });

  it("rejects a phone number that is clearly not one", () => {
    expect(teamMemberInputSchema.safeParse(form({ phone: "call me maybe" })).success).toBe(false);
  });

  it("defaults serving frequency to 2 when left blank", () => {
    const r = teamMemberInputSchema.safeParse(form({ preferredPerMonth: "" }));
    expect(r.success && r.data.preferredPerMonth).toBe(2);
  });

  it("allows 0 to mean no preference", () => {
    const r = teamMemberInputSchema.safeParse(form({ preferredPerMonth: "0" }));
    expect(r.success && r.data.preferredPerMonth).toBe(0);
  });

  it.each(["-1", "32", "2.5"])("rejects an impossible frequency %s", (v) => {
    expect(teamMemberInputSchema.safeParse(form({ preferredPerMonth: v })).success).toBe(false);
  });

  it("allows a member with no positions at all", () => {
    const r = teamMemberInputSchema.safeParse(form({ positionIds: [] }));
    expect(r.success && r.data.positionIds).toEqual([]);
  });
});

describe("who may manage the roster", () => {
  const roles: Role[] = [
    "OWNER", "ADMIN", "WORSHIP_LEADER", "TEAM_LEADER", "MUSICIAN", "TECH", "PASTOR",
  ];

  it("restricts team:manage to owners and admins", () => {
    // The team actions all call requirePermission("team:manage").
    expect(roles.filter((r) => can(r, "team:manage")).sort()).toEqual([
      "ADMIN", "OWNER",
    ]);
  });

  it("still lets planners view the roster", () => {
    expect(can("WORSHIP_LEADER", "team:view")).toBe(true);
    expect(can("TEAM_LEADER", "team:view")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

describe.skipIf(!dbReachable)("team member writes", () => {
  let alpha: Awaited<ReturnType<typeof makeChurch>>;
  let beta: Awaited<ReturnType<typeof makeChurch>>;

  beforeAll(async () => {
    await purge();
    alpha = await makeChurch(SLUG_A);
    beta = await makeChurch(SLUG_B);
  });
  afterAll(async () => {
    await purge();
  });

  it("creates a member scoped to the caller's church", async () => {
    const m = await createTeamMember(alpha.ctx, input({ name: "Created Person" }));
    expect(m.churchId).toBe(alpha.ctx.churchId);
    expect((await listTeamMembers(beta.ctx)).map((x) => x.name)).not.toContain(
      "Created Person",
    );
  });

  it("does NOT require or create a user account", async () => {
    const m = await createTeamMember(alpha.ctx, input({ name: "No Account" }));
    expect(m.userId).toBeNull();
    const read = await getTeamMemberById(alpha.ctx, m.id);
    expect(read.userId).toBeNull();
  });

  it("creates with multiple positions across categories", async () => {
    const m = await createTeamMember(
      alpha.ctx,
      input({
        name: "Multi Role",
        positionIds: [alpha.positions[0].id, alpha.positions[3].id],
      }),
    );
    const read = await getTeamMemberById(alpha.ctx, m.id);
    expect(read.positions.map((p) => p.position.name).sort()).toEqual([
      "Sound", "Worship Leader",
    ]);
  });

  it("stores contact details and scheduling preferences", async () => {
    const m = await createTeamMember(
      alpha.ctx,
      input({
        name: "Full Details",
        email: "full@example.test",
        phone: "555-0100",
        vocalRange: "Alto",
        preferredPerMonth: 3,
        preferredServiceTypeId: alpha.serviceTypeId,
      }),
    );
    const read = await getTeamMemberById(alpha.ctx, m.id);
    expect(read.email).toBe("full@example.test");
    expect(read.phone).toBe("555-0100");
    expect(read.vocalRange).toBe("Alto");
    expect(read.preferredPerMonth).toBe(3);
    expect(read.preferredServiceType?.name).toBe("Sunday 10:00 AM");
  });

  it("edits core details", async () => {
    const m = await createTeamMember(alpha.ctx, input({ name: "Before Edit" }));
    await updateTeamMember(
      alpha.ctx,
      m.id,
      input({ name: "After Edit", email: "after@example.test" }),
    );
    const read = await getTeamMemberById(alpha.ctx, m.id);
    expect(read.name).toBe("After Edit");
    expect(read.email).toBe("after@example.test");
  });

  it("clears a contact field when it is emptied", async () => {
    const m = await createTeamMember(
      alpha.ctx,
      input({ name: "Clear Me", email: "clear@example.test" }),
    );
    await updateTeamMember(alpha.ctx, m.id, input({ name: "Clear Me" }));
    expect((await getTeamMemberById(alpha.ctx, m.id)).email).toBeNull();
  });

  describe("positions", () => {
    it("adds a position on edit", async () => {
      const m = await createTeamMember(
        alpha.ctx,
        input({ name: "Add Pos", positionIds: [alpha.positions[0].id] }),
      );
      await updateTeamMember(
        alpha.ctx,
        m.id,
        input({
          name: "Add Pos",
          positionIds: [alpha.positions[0].id, alpha.positions[1].id],
        }),
      );
      const read = await getTeamMemberById(alpha.ctx, m.id);
      expect(read.positions.map((p) => p.position.name).sort()).toEqual([
        "Bass", "Worship Leader",
      ]);
    });

    it("removes a position on edit", async () => {
      const m = await createTeamMember(
        alpha.ctx,
        input({
          name: "Remove Pos",
          positionIds: [alpha.positions[0].id, alpha.positions[1].id],
        }),
      );
      await updateTeamMember(
        alpha.ctx,
        m.id,
        input({ name: "Remove Pos", positionIds: [alpha.positions[1].id] }),
      );
      const read = await getTeamMemberById(alpha.ctx, m.id);
      expect(read.positions.map((p) => p.position.name)).toEqual(["Bass"]);
    });

    it("removes every position when the selection is cleared", async () => {
      const m = await createTeamMember(
        alpha.ctx,
        input({ name: "Clear Pos", positionIds: [alpha.positions[0].id] }),
      );
      await updateTeamMember(alpha.ctx, m.id, input({ name: "Clear Pos", positionIds: [] }));
      expect((await getTeamMemberById(alpha.ctx, m.id)).positions).toEqual([]);
    });

    it("keeps untouched positions rather than rewriting them", async () => {
      // Existing rows carry a scheduler priority that a delete-all would lose.
      const m = await createTeamMember(
        alpha.ctx,
        input({ name: "Keep Pos", positionIds: [alpha.positions[0].id] }),
      );
      const before = await getTeamMemberById(alpha.ctx, m.id);
      const keptId = before.positions[0].id;

      await updateTeamMember(
        alpha.ctx,
        m.id,
        input({
          name: "Keep Pos",
          positionIds: [alpha.positions[0].id, alpha.positions[2].id],
        }),
      );
      const after = await getTeamMemberById(alpha.ctx, m.id);
      expect(after.positions.map((p) => p.id)).toContain(keptId);
    });

    it("is idempotent when the same positions are saved twice", async () => {
      const m = await createTeamMember(
        alpha.ctx,
        input({ name: "Same Pos", positionIds: [alpha.positions[0].id] }),
      );
      await updateTeamMember(
        alpha.ctx,
        m.id,
        input({ name: "Same Pos", positionIds: [alpha.positions[0].id] }),
      );
      expect((await getTeamMemberById(alpha.ctx, m.id)).positions).toHaveLength(1);
    });

    it("REFUSES a position belonging to another church", async () => {
      await expect(
        createTeamMember(
          alpha.ctx,
          input({ name: "Bad Pos", positionIds: [beta.positions[0].id] }),
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("REFUSES a mix of own and foreign positions", async () => {
      await expect(
        createTeamMember(
          alpha.ctx,
          input({
            name: "Mixed",
            positionIds: [alpha.positions[0].id, beta.positions[0].id],
          }),
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects an unknown position id", async () => {
      await expect(
        createTeamMember(alpha.ctx, input({ positionIds: ["no-such-position"] })),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("only lists this church's positions", async () => {
      const positions = await listPositions(alpha.ctx);
      expect(positions).toHaveLength(4);
      expect(positions.every((p) => p.churchId === alpha.ctx.churchId)).toBe(true);
    });
  });

  describe("tenancy", () => {
    it("REFUSES to edit another church's member", async () => {
      const m = await createTeamMember(alpha.ctx, input({ name: "Alpha Only" }));
      await expect(
        updateTeamMember(beta.ctx, m.id, input({ name: "Hijacked" })),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect((await getTeamMemberById(alpha.ctx, m.id)).name).toBe("Alpha Only");
    });

    it("REFUSES to deactivate another church's member", async () => {
      const m = await createTeamMember(alpha.ctx, input({ name: "Stay Active" }));
      await expect(
        setTeamMemberActive(beta.ctx, m.id, false),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect((await getTeamMemberById(alpha.ctx, m.id)).active).toBe(true);
    });

    it("treats another church's member id as not found", async () => {
      const m = await createTeamMember(alpha.ctx, input({ name: "Hidden" }));
      await expect(getTeamMemberById(beta.ctx, m.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("REFUSES another church's preferred service type", async () => {
      await expect(
        createTeamMember(
          alpha.ctx,
          input({ preferredServiceTypeId: beta.serviceTypeId }),
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("invalid ids", () => {
    it("rejects editing an unknown member", async () => {
      await expect(
        updateTeamMember(alpha.ctx, "no-such-member", input()),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects reading an unknown member", async () => {
      await expect(
        getTeamMemberById(alpha.ctx, "no-such-member"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects deactivating an unknown member", async () => {
      await expect(
        setTeamMemberActive(alpha.ctx, "no-such-member", false),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("active state", () => {
    it("deactivates and reactivates without losing positions", async () => {
      const m = await createTeamMember(
        alpha.ctx,
        input({ name: "Toggle Me", positionIds: [alpha.positions[0].id] }),
      );
      await setTeamMemberActive(alpha.ctx, m.id, false);
      let read = await getTeamMemberById(alpha.ctx, m.id);
      expect(read.active).toBe(false);
      expect(read.positions).toHaveLength(1);

      await setTeamMemberActive(alpha.ctx, m.id, true);
      read = await getTeamMemberById(alpha.ctx, m.id);
      expect(read.active).toBe(true);
    });

    it("excludes inactive people from the activeOnly roster", async () => {
      const m = await createTeamMember(alpha.ctx, input({ name: "Benched" }));
      await setTeamMemberActive(alpha.ctx, m.id, false);
      const active = await listTeamMembers(alpha.ctx, { activeOnly: true });
      expect(active.map((x) => x.name)).not.toContain("Benched");
      const all = await listTeamMembers(alpha.ctx);
      expect(all.map((x) => x.name)).toContain("Benched");
    });
  });
});

// ---------------------------------------------------------------------------
// Regression: FormData.get() returns null for an absent field
// ---------------------------------------------------------------------------

describe("absent form fields", () => {
  /**
   * formData.get() yields null when a field is missing entirely. That has to
   * mean "left blank", not "Invalid input: expected string, received null",
   * which is what a bare .optional() produced.
   */
  it("treats every optional field arriving as null as blank", () => {
    const r = teamMemberInputSchema.safeParse({
      name: "Only A Name",
      email: null,
      phone: null,
      vocalRange: null,
      notes: null,
      active: true,
      preferredPerMonth: null,
      preferredServiceTypeId: null,
      positionIds: [],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBeUndefined();
      expect(r.data.phone).toBeUndefined();
      expect(r.data.vocalRange).toBeUndefined();
      expect(r.data.notes).toBeUndefined();
      expect(r.data.preferredServiceTypeId).toBeUndefined();
      expect(r.data.preferredPerMonth).toBe(2);
    }
  });

  it("still rejects a null name, which is not optional", () => {
    expect(
      teamMemberInputSchema.safeParse({ name: null, positionIds: [] }).success,
    ).toBe(false);
  });

  it("treats whitespace-only text as blank too", () => {
    const r = teamMemberInputSchema.safeParse({
      name: "Spacey",
      email: "   ",
      notes: "  ",
      positionIds: [],
    });
    expect(r.success && r.data.email).toBeUndefined();
    expect(r.success && r.data.notes).toBeUndefined();
  });
});

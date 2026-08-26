import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Role } from "@/generated/prisma/enums";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import {
  assignMember,
  DuplicateAssignmentError,
  getServiceTeam,
  listCandidatePool,
  listCandidates,
  reassignMember,
  removeAssignment,
} from "@/lib/data/assignments";
import { NotFoundError, type ChurchContext } from "@/lib/data/context";
import { createService } from "@/lib/data/services";
import { parseServiceDate, type ServiceInput } from "@/lib/validation/service";

const SLUG_A = "vitest-assign-alpha";
const SLUG_B = "vitest-assign-beta";
const SERVICE_DAY = "2026-09-06";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[assignments] No database reachable — skipping.\n");
}

const serviceInput = (date = SERVICE_DAY): ServiceInput => ({
  date: parseServiceDate(date),
  serviceTypeId: undefined,
  startTime: "10:00",
  callTime: "08:30",
  title: "Assign Test",
  notes: undefined,
  status: "DRAFT",
  sermonTitle: undefined,
  sermonSeries: undefined,
  sermonScripture: undefined,
  sermonDescription: undefined,
});

async function makeChurch(slug: string) {
  const church = await db.church.create({ data: { name: slug, slug } });
  const user = await db.user.create({ data: { email: `${slug}@example.test` } });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });
  const [bass, drums, sound] = await Promise.all(
    [
      ["Bass", "WORSHIP"],
      ["Drums", "WORSHIP"],
      ["Sound", "TECH"],
    ].map(([name, category], i) =>
      db.position.create({
        data: {
          churchId: church.id, name,
          category: category as "WORSHIP" | "TECH", sortOrder: i,
        },
      }),
    ),
  );
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
  return { ctx, churchId: church.id, bass, drums, sound };
}

async function addMember(
  churchId: string,
  name: string,
  positionIds: string[],
  extra: { active?: boolean; preferredPerMonth?: number } = {},
) {
  return db.teamMember.create({
    data: {
      churchId,
      name,
      active: extra.active ?? true,
      preferredPerMonth: extra.preferredPerMonth ?? 2,
      positions: { create: positionIds.map((positionId) => ({ positionId })) },
    },
  });
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
}

describe("who may build a team", () => {
  const roles: Role[] = [
    "OWNER", "ADMIN", "WORSHIP_LEADER", "TEAM_LEADER", "MUSICIAN", "TECH", "PASTOR",
  ];

  it("gates assignment on team:schedule", () => {
    // The team actions all call requirePermission("team:schedule").
    expect(roles.filter((r) => can(r, "team:schedule")).sort()).toEqual([
      "ADMIN", "OWNER", "TEAM_LEADER", "WORSHIP_LEADER",
    ]);
  });

  it("does not let musicians, tech or pastors schedule", () => {
    for (const r of ["MUSICIAN", "TECH", "PASTOR"] as Role[]) {
      expect(can(r, "team:schedule")).toBe(false);
    }
  });
});

describe.skipIf(!dbReachable)("assignments", () => {
  let alpha: Awaited<ReturnType<typeof makeChurch>>;
  let beta: Awaited<ReturnType<typeof makeChurch>>;
  let bassist: { id: string };
  let drummer: { id: string };

  beforeAll(async () => {
    await purge();
    alpha = await makeChurch(SLUG_A);
    beta = await makeChurch(SLUG_B);
    bassist = await addMember(alpha.churchId, "Bea Bassist", [alpha.bass.id]);
    drummer = await addMember(alpha.churchId, "Dee Drummer", [alpha.drums.id]);
  });
  afterAll(async () => {
    await purge();
  });

  const freshService = async (ctx = alpha.ctx, date = SERVICE_DAY) =>
    (await createService(ctx, serviceInput(date))).id;

  const slotFor = (slots: Awaited<ReturnType<typeof getServiceTeam>>, id: string) =>
    slots.find((s) => s.positionId === id)!;

  describe("creating", () => {
    it("assigns a person to a position at PENDING", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      expect(a.status).toBe("PENDING");

      const slots = await getServiceTeam(alpha.ctx, sid);
      expect(slotFor(slots, alpha.bass.id).assignments[0].name).toBe("Bea Bassist");
    });

    it("inherits the service call time", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      expect(a.callTime).toBe("08:30");
    });

    it("lists every active position, filled or open", async () => {
      const sid = await freshService();
      const slots = await getServiceTeam(alpha.ctx, sid);
      expect(slots.map((s) => s.positionName).sort()).toEqual(["Bass", "Drums", "Sound"]);
      expect(slots.every((s) => s.assignments.length === 0)).toBe(true);
    });

    it("allows the same person in two different positions", async () => {
      // @@unique([serviceId, teamMemberId, positionId]) permits this.
      const sid = await freshService();
      await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await assignMember(alpha.ctx, sid, bassist.id, alpha.sound.id);
      const slots = await getServiceTeam(alpha.ctx, sid);
      expect(slotFor(slots, alpha.bass.id).assignments).toHaveLength(1);
      expect(slotFor(slots, alpha.sound.id).assignments).toHaveLength(1);
    });

    it("allows two people in the same position", async () => {
      const sid = await freshService();
      await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await assignMember(alpha.ctx, sid, drummer.id, alpha.bass.id);
      const slots = await getServiceTeam(alpha.ctx, sid);
      expect(slotFor(slots, alpha.bass.id).assignments).toHaveLength(2);
    });

    it("rejects the same person twice in the same position", async () => {
      const sid = await freshService();
      await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await expect(
        assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id),
      ).rejects.toBeInstanceOf(DuplicateAssignmentError);
    });

    it("allows assigning someone who is NOT qualified for the position", async () => {
      // The leader keeps final say; lack of the position is a warning only.
      const sid = await freshService();
      await expect(
        assignMember(alpha.ctx, sid, drummer.id, alpha.bass.id),
      ).resolves.toBeTruthy();
      const slots = await getServiceTeam(alpha.ctx, sid);
      const conflicts = slotFor(slots, alpha.bass.id).assignments[0].conflicts;
      expect(conflicts.map((c) => c.kind)).toContain("NOT_QUALIFIED");
    });

    it("allows assigning an inactive person, and says so", async () => {
      const sid = await freshService();
      const benched = await addMember(alpha.churchId, "Ben Benched", [alpha.drums.id], {
        active: false,
      });
      await expect(
        assignMember(alpha.ctx, sid, benched.id, alpha.drums.id),
      ).resolves.toBeTruthy();
      const slots = await getServiceTeam(alpha.ctx, sid);
      expect(
        slotFor(slots, alpha.drums.id).assignments[0].conflicts.map((c) => c.kind),
      ).toContain("INACTIVE");
    });
  });

  describe("blockouts", () => {
    it("warns rather than blocks when the person is unavailable", async () => {
      const sid = await freshService();
      const away = await addMember(alpha.churchId, "Ava Away", [alpha.bass.id]);
      await db.blockoutDate.create({
        data: {
          teamMemberId: away.id,
          startDate: parseServiceDate("2026-09-01"),
          endDate: parseServiceDate("2026-09-10"),
          note: "Holiday",
        },
      });

      // Still offered as a candidate, with the reason attached.
      const candidates = await listCandidates(alpha.ctx, sid, alpha.bass.id);
      const entry = candidates.find((c) => c.id === away.id);
      expect(entry).toBeDefined();
      expect(entry!.conflicts.map((c) => c.kind)).toContain("BLOCKED_OUT");
      expect(entry!.conflicts[0].message).toMatch(/Holiday/);

      // And can still be assigned.
      await expect(
        assignMember(alpha.ctx, sid, away.id, alpha.bass.id),
      ).resolves.toBeTruthy();
    });

    it("does not warn when the blockout misses the service date", async () => {
      const sid = await freshService();
      const later = await addMember(alpha.churchId, "Lee Later", [alpha.bass.id]);
      await db.blockoutDate.create({
        data: {
          teamMemberId: later.id,
          startDate: parseServiceDate("2026-10-01"),
          endDate: parseServiceDate("2026-10-05"),
          note: null,
        },
      });
      const candidates = await listCandidates(alpha.ctx, sid, alpha.bass.id);
      const entry = candidates.find((c) => c.id === later.id);
      expect(entry!.conflicts.map((c) => c.kind)).not.toContain("BLOCKED_OUT");
    });

    it("recomputes conflicts on read, so a blockout added later still shows", async () => {
      const sid = await freshService();
      const person = await addMember(alpha.churchId, "Pat Post", [alpha.drums.id]);
      await assignMember(alpha.ctx, sid, person.id, alpha.drums.id);

      let slots = await getServiceTeam(alpha.ctx, sid);
      expect(slotFor(slots, alpha.drums.id).assignments[0].conflicts).toEqual([]);

      await db.blockoutDate.create({
        data: {
          teamMemberId: person.id,
          startDate: parseServiceDate(SERVICE_DAY),
          endDate: parseServiceDate(SERVICE_DAY),
          note: "Sick",
        },
      });

      slots = await getServiceTeam(alpha.ctx, sid);
      expect(
        slotFor(slots, alpha.drums.id).assignments[0].conflicts.map((c) => c.kind),
      ).toContain("BLOCKED_OUT");
    });
  });

  describe("candidates", () => {
    it("ranks qualified people above unqualified ones", async () => {
      const sid = await freshService();
      const candidates = await listCandidates(alpha.ctx, sid, alpha.bass.id);
      const bassIndex = candidates.findIndex((c) => c.id === bassist.id);
      const drumIndex = candidates.findIndex((c) => c.id === drummer.id);
      expect(bassIndex).toBeLessThan(drumIndex);
    });

    it("excludes inactive members by default but can include them", async () => {
      const sid = await freshService();
      const benched = await addMember(alpha.churchId, "Zed Inactive", [alpha.bass.id], {
        active: false,
      });
      const active = await listCandidates(alpha.ctx, sid, alpha.bass.id);
      expect(active.map((c) => c.id)).not.toContain(benched.id);

      const all = await listCandidates(alpha.ctx, sid, alpha.bass.id, {
        includeInactive: true,
      });
      expect(all.map((c) => c.id)).toContain(benched.id);
    });

    it("counts how often each person already serves that month", async () => {
      const first = await freshService(alpha.ctx, "2026-11-01");
      const second = await freshService(alpha.ctx, "2026-11-08");
      const busy = await addMember(alpha.churchId, "Bess Busy", [alpha.bass.id], {
        preferredPerMonth: 1,
      });
      await assignMember(alpha.ctx, first, busy.id, alpha.bass.id);

      const candidates = await listCandidates(alpha.ctx, second, alpha.bass.id);
      const entry = candidates.find((c) => c.id === busy.id)!;
      expect(entry.assignmentsThisMonth).toBe(1);
      expect(entry.conflicts.map((c) => c.kind)).toContain("OVER_COMMITTED");
    });

    it("only offers this church's people", async () => {
      const sid = await freshService();
      const pool = await listCandidatePool(alpha.ctx, sid);
      expect(pool.every((m) => m.name !== "Beta Person")).toBe(true);
    });

    it("rejects a position from another church", async () => {
      const sid = await freshService();
      await expect(
        listCandidates(alpha.ctx, sid, beta.bass.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("reassigning", () => {
    it("swaps in a different person, keeping the slot", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await reassignMember(alpha.ctx, a.id, drummer.id);
      const slots = await getServiceTeam(alpha.ctx, sid);
      const row = slotFor(slots, alpha.bass.id).assignments[0];
      expect(row.name).toBe("Dee Drummer");
      expect(row.id).toBe(a.id);
    });

    it("resets status and clears the previous person's response", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await db.assignment.updateMany({
        where: { id: a.id },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      await reassignMember(alpha.ctx, a.id, drummer.id);
      const after = await db.assignment.findFirst({ where: { id: a.id } });
      expect(after?.status).toBe("PENDING");
      expect(after?.respondedAt).toBeNull();
    });

    it("is a no-op when reassigning to the same person", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await db.assignment.updateMany({ where: { id: a.id }, data: { status: "ACCEPTED" } });
      await reassignMember(alpha.ctx, a.id, bassist.id);
      const after = await db.assignment.findFirst({ where: { id: a.id } });
      expect(after?.status).toBe("ACCEPTED");
    });

    it("refuses a swap that would duplicate an existing assignment", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await assignMember(alpha.ctx, sid, drummer.id, alpha.bass.id);
      await expect(
        reassignMember(alpha.ctx, a.id, drummer.id),
      ).rejects.toBeInstanceOf(DuplicateAssignmentError);
    });
  });

  describe("removing", () => {
    it("removes an assignment and reopens the position", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await removeAssignment(alpha.ctx, a.id);
      const slots = await getServiceTeam(alpha.ctx, sid);
      expect(slotFor(slots, alpha.bass.id).assignments).toEqual([]);
    });

    it("frees the person to be assigned to that position again", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await removeAssignment(alpha.ctx, a.id);
      await expect(
        assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id),
      ).resolves.toBeTruthy();
    });
  });

  describe("tenancy", () => {
    it("REFUSES to assign another church's member", async () => {
      const sid = await freshService();
      const outsider = await addMember(beta.churchId, "Beta Person", [beta.bass.id]);
      await expect(
        assignMember(alpha.ctx, sid, outsider.id, alpha.bass.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("REFUSES to assign to another church's position", async () => {
      const sid = await freshService();
      await expect(
        assignMember(alpha.ctx, sid, bassist.id, beta.bass.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("REFUSES to assign into another church's service", async () => {
      const otherService = await freshService(beta.ctx);
      await expect(
        assignMember(alpha.ctx, otherService, bassist.id, alpha.bass.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("REFUSES to reassign another church's assignment", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await expect(
        reassignMember(beta.ctx, a.id, bassist.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("REFUSES to remove another church's assignment", async () => {
      const sid = await freshService();
      const a = await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await expect(removeAssignment(beta.ctx, a.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      const slots = await getServiceTeam(alpha.ctx, sid);
      expect(slotFor(slots, alpha.bass.id).assignments).toHaveLength(1);
    });

    it("does not leak the team through getServiceTeam", async () => {
      const sid = await freshService();
      await assignMember(alpha.ctx, sid, bassist.id, alpha.bass.id);
      await expect(getServiceTeam(beta.ctx, sid)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("invalid ids", () => {
    it("rejects an unknown service", async () => {
      await expect(
        assignMember(alpha.ctx, "no-such-service", bassist.id, alpha.bass.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects an unknown member", async () => {
      const sid = await freshService();
      await expect(
        assignMember(alpha.ctx, sid, "no-such-member", alpha.bass.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects an unknown position", async () => {
      const sid = await freshService();
      await expect(
        assignMember(alpha.ctx, sid, bassist.id, "no-such-position"),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects an unknown assignment on remove and reassign", async () => {
      await expect(
        removeAssignment(alpha.ctx, "no-such-assignment"),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        reassignMember(alpha.ctx, "no-such-assignment", bassist.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

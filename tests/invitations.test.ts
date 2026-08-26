import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Role } from "@/generated/prisma/enums";
import { can } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { assignMember } from "@/lib/data/assignments";
import { NotFoundError, type ChurchContext } from "@/lib/data/context";
import {
  getInvitationStates,
  InvalidTokenError,
  inviteMemberToService,
  resolveInvitation,
  resolveInvitationChart,
  respondToInvitation,
  revokeInvitations,
} from "@/lib/data/invitations";
import { createService } from "@/lib/data/services";
import { addSongToService } from "@/lib/data/setlist";
import { generateToken, hashToken } from "@/lib/invitations/token";
import { parseServiceDate, type ServiceInput } from "@/lib/validation/service";

const SLUG_A = "vitest-inv-alpha";
const SLUG_B = "vitest-inv-beta";
/** Far enough ahead that links are live for the whole run. */
const FUTURE = "2099-09-06";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[invitations] No database reachable — skipping.\n");
}

const serviceInput = (date = FUTURE): ServiceInput => ({
  date: parseServiceDate(date),
  serviceTypeId: undefined,
  startTime: "10:00",
  callTime: "08:30",
  title: "Invite Test",
  notes: "PLANNER ONLY SECRET",
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
  const [bass, keys] = await Promise.all(
    ["Bass", "Keys"].map((name, i) =>
      db.position.create({
        data: { churchId: church.id, name, category: "WORSHIP", sortOrder: i },
      }),
    ),
  );
  const member = await db.teamMember.create({
    data: { churchId: church.id, name: `${slug} Musician` },
  });
  const song = await db.song.create({
    data: {
      churchId: church.id, title: `${slug} Song`, artist: "Someone",
      churchKey: "G", songTypes: [], themes: [],
    },
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
  return { ctx, churchId: church.id, bass, keys, member, song };
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
}

describe("who may send invitations", () => {
  const roles: Role[] = [
    "OWNER", "ADMIN", "WORSHIP_LEADER", "TEAM_LEADER", "MUSICIAN", "TECH", "PASTOR",
  ];

  it("gates invitation generation on invitations:send", () => {
    expect(roles.filter((r) => can(r, "invitations:send")).sort()).toEqual([
      "ADMIN", "OWNER", "TEAM_LEADER", "WORSHIP_LEADER",
    ]);
  });

  it("does not let musicians or pastors generate invite links", () => {
    for (const r of ["MUSICIAN", "TECH", "PASTOR"] as Role[]) {
      expect(can(r, "invitations:send")).toBe(false);
    }
  });
});

describe.skipIf(!dbReachable)("invitations", () => {
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

  async function scheduled(positions: Array<"bass" | "keys"> = ["bass"]) {
    const serviceId = (await createService(alpha.ctx, serviceInput())).id;
    await addSongToService(alpha.ctx, serviceId, alpha.song.id);
    for (const p of positions) {
      await assignMember(alpha.ctx, serviceId, alpha.member.id, alpha[p].id);
    }
    return serviceId;
  }

  describe("creating", () => {
    it("returns a raw token and never stores it", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);

      const rows = await db.invitation.findMany({ select: { tokenHash: true } });
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.tokenHash).not.toBe(token);
        expect(r.tokenHash).not.toContain(token);
      }
      // Only the digest is a valid lookup key.
      expect(
        await db.invitation.findUnique({ where: { tokenHash: hashToken(token) } }),
      ).not.toBeNull();
    });

    it("moves the assignment from PENDING to INVITED", async () => {
      const serviceId = await scheduled();
      let a = await db.assignment.findFirstOrThrow({ where: { serviceId } });
      expect(a.status).toBe("PENDING");

      await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      a = await db.assignment.findFirstOrThrow({ where: { serviceId } });
      expect(a.status).toBe("INVITED");
    });

    it("sets an expiry just after the service, not a rolling window", async () => {
      const serviceId = await scheduled();
      await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      const inv = await db.invitation.findFirstOrThrow({
        where: { assignment: { serviceId } },
      });
      expect(inv.expiresAt.toISOString()).toBe("2099-09-08T00:00:00.000Z");
    });

    it("covers every position the person holds", async () => {
      const serviceId = await scheduled(["bass", "keys"]);
      const { positions } = await inviteMemberToService(
        alpha.ctx, serviceId, alpha.member.id,
      );
      expect(positions).toBe(2);
      const statuses = await db.assignment.findMany({
        where: { serviceId }, select: { status: true },
      });
      expect(statuses.every((s) => s.status === "INVITED")).toBe(true);
    });

    it("regenerating invalidates the previous link", async () => {
      const serviceId = await scheduled();
      const first = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await expect(resolveInvitation(first.token)).resolves.toBeTruthy();

      const second = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      expect(second.token).not.toBe(first.token);
      await expect(resolveInvitation(first.token)).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
      await expect(resolveInvitation(second.token)).resolves.toBeTruthy();
    });

    it("does not erase an existing answer when a link is reissued", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await respondToInvitation(token, "ACCEPTED");

      const again = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      const after = await resolveInvitation(again.token);
      expect(after.status).toBe("ACCEPTED");
    });

    it("refuses to invite someone who is not scheduled", async () => {
      const serviceId = (await createService(alpha.ctx, serviceInput())).id;
      await expect(
        inviteMemberToService(alpha.ctx, serviceId, alpha.member.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("revoking", () => {
    it("kills the link and returns the assignment to PENDING", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await revokeInvitations(alpha.ctx, serviceId, alpha.member.id);

      await expect(resolveInvitation(token)).rejects.toBeInstanceOf(InvalidTokenError);
      const a = await db.assignment.findFirstOrThrow({ where: { serviceId } });
      expect(a.status).toBe("PENDING");
    });
  });

  describe("resolving a token", () => {
    it("shows the service, positions, call time and setlist with keys", async () => {
      const serviceId = await scheduled(["bass", "keys"]);
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);

      const inv = await resolveInvitation(token);
      expect(inv.churchName).toBe(SLUG_A);
      expect(inv.memberName).toBe(`${SLUG_A} Musician`);
      expect(inv.positions.sort()).toEqual(["Bass", "Keys"]);
      expect(inv.callTime).toBe("08:30");
      expect(inv.startTime).toBe("10:00");
      expect(inv.songs[0].title).toBe(`${SLUG_A} Song`);
      expect(inv.songs[0].key).toBe("G");
    });

    it("exposes no planner-only information", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      const inv = await resolveInvitation(token);
      expect(JSON.stringify(inv)).not.toContain("PLANNER ONLY SECRET");
    });

    it.each([
      ["", "empty"],
      ["short", "too short"],
      ["../../secrets-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "traversal"],
      ["' OR 1=1 --aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "sql-ish"],
    ])("rejects malformed token %s (%s)", async (bad) => {
      await expect(resolveInvitation(bad)).rejects.toMatchObject({
        reason: "MALFORMED",
      });
    });

    it("rejects a well-formed token that was never issued", async () => {
      await expect(resolveInvitation(generateToken())).rejects.toMatchObject({
        reason: "NOT_FOUND",
      });
    });

    it("rejects an expired token", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await db.invitation.updateMany({
        where: { assignment: { serviceId } },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await expect(resolveInvitation(token)).rejects.toMatchObject({
        reason: "EXPIRED",
      });
    });

    it("cannot be pointed at another church's data", async () => {
      // The token is looked up by digest alone; no id from the URL is trusted.
      const mineId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, mineId, alpha.member.id);

      const theirService = (await createService(beta.ctx, serviceInput())).id;
      await assignMember(beta.ctx, theirService, beta.member.id, beta.bass.id);
      const theirs = await inviteMemberToService(beta.ctx, theirService, beta.member.id);

      expect((await resolveInvitation(token)).churchName).toBe(SLUG_A);
      expect((await resolveInvitation(theirs.token)).churchName).toBe(SLUG_B);
    });
  });

  describe("responding", () => {
    it("accepts and records the time", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);

      const after = await respondToInvitation(token, "ACCEPTED");
      expect(after.status).toBe("ACCEPTED");

      const a = await db.assignment.findFirstOrThrow({ where: { serviceId } });
      expect(a.status).toBe("ACCEPTED");
      expect(a.respondedAt).not.toBeNull();
    });

    it("declines and records the time", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      const after = await respondToInvitation(token, "DECLINED");
      expect(after.status).toBe("DECLINED");
      const a = await db.assignment.findFirstOrThrow({ where: { serviceId } });
      expect(a.respondedAt).not.toBeNull();
    });

    it("answers for EVERY position at once, not one screen per role", async () => {
      const serviceId = await scheduled(["bass", "keys"]);
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await respondToInvitation(token, "ACCEPTED");

      const all = await db.assignment.findMany({ where: { serviceId } });
      expect(all).toHaveLength(2);
      expect(all.every((a) => a.status === "ACCEPTED")).toBe(true);
    });

    it("shows the current answer when the link is reopened", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await respondToInvitation(token, "ACCEPTED");
      expect((await resolveInvitation(token)).status).toBe("ACCEPTED");
      expect((await resolveInvitation(token)).status).toBe("ACCEPTED");
    });

    it("allows changing a response while the link is valid", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await respondToInvitation(token, "ACCEPTED");
      await respondToInvitation(token, "DECLINED");
      expect((await resolveInvitation(token)).status).toBe("DECLINED");
    });

    it("refuses to respond with an expired token", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await db.invitation.updateMany({
        where: { assignment: { serviceId } },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await expect(respondToInvitation(token, "ACCEPTED")).rejects.toMatchObject({
        reason: "EXPIRED",
      });
    });

    it("refuses to respond with a revoked token", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await revokeInvitations(alpha.ctx, serviceId, alpha.member.id);
      await expect(respondToInvitation(token, "ACCEPTED")).rejects.toBeInstanceOf(
        InvalidTokenError,
      );
    });

    it("refuses malformed tokens", async () => {
      await expect(respondToInvitation("nope", "ACCEPTED")).rejects.toMatchObject({
        reason: "MALFORMED",
      });
    });
  });

  describe("charts through the token", () => {
    it("serves a song that is in the setlist", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      const chart = await resolveInvitationChart(token, alpha.song.id);
      expect(chart.title).toBe(`${SLUG_A} Song`);
      expect(chart.key).toBe("G");
    });

    it("refuses a song that is NOT in this service's setlist", async () => {
      // Otherwise a token would read the church's whole library.
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      const other = await db.song.create({
        data: {
          churchId: alpha.churchId, title: "Not In Set",
          songTypes: [], themes: [],
        },
      });
      await expect(
        resolveInvitationChart(token, other.id),
      ).rejects.toBeInstanceOf(InvalidTokenError);
    });

    it("refuses another church's song", async () => {
      const serviceId = await scheduled();
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await expect(
        resolveInvitationChart(token, beta.song.id),
      ).rejects.toBeInstanceOf(InvalidTokenError);
    });
  });

  describe("service page state", () => {
    it("reports who has a live invitation", async () => {
      const serviceId = await scheduled();
      let states = await getInvitationStates(alpha.ctx, serviceId);
      expect(states.get(alpha.member.id)?.invited).toBe(false);

      await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      states = await getInvitationStates(alpha.ctx, serviceId);
      expect(states.get(alpha.member.id)?.invited).toBe(true);
    });

    it("does not leak another church's invitation state", async () => {
      const serviceId = await scheduled();
      await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      expect((await getInvitationStates(beta.ctx, serviceId)).size).toBe(0);
    });

    it("reflects the musician's answer back on the service", async () => {
      const serviceId = await scheduled(["bass", "keys"]);
      const { token } = await inviteMemberToService(alpha.ctx, serviceId, alpha.member.id);
      await respondToInvitation(token, "DECLINED");

      const rows = await db.assignment.findMany({
        where: { serviceId }, select: { status: true },
      });
      expect(rows.every((r) => r.status === "DECLINED")).toBe(true);
    });
  });

  describe("tenancy on the admin side", () => {
    it("REFUSES to invite into another church's service", async () => {
      const theirs = (await createService(beta.ctx, serviceInput())).id;
      await assignMember(beta.ctx, theirs, beta.member.id, beta.bass.id);
      await expect(
        inviteMemberToService(alpha.ctx, theirs, beta.member.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("REFUSES to revoke another church's invitation", async () => {
      const theirs = (await createService(beta.ctx, serviceInput())).id;
      await assignMember(beta.ctx, theirs, beta.member.id, beta.bass.id);
      await inviteMemberToService(beta.ctx, theirs, beta.member.id);
      await expect(
        revokeInvitations(alpha.ctx, theirs, beta.member.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});

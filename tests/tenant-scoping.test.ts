import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Proves the structural tenancy guarantee without needing a database: every
 * query a repository issues must carry the caller's churchId, and no by-id
 * lookup may reach the database keyed on the id alone.
 *
 * This runs everywhere, including CI with no Postgres. The companion
 * tests/tenant-isolation.test.ts exercises the same guarantee against real data.
 */

type Call = { model: string; op: string; args: Record<string, unknown> };
const calls: Call[] = [];

function defaultResult(op: string) {
  if (op === "findMany" || op === "groupBy") return [];
  if (op === "count") return 0;
  return null;
}

vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get: (_t, model: string) =>
        new Proxy(
          {},
          {
            get: (_t2, op: string) => (args: Record<string, unknown> = {}) => {
              calls.push({ model, op, args });
              return Promise.resolve(defaultResult(op));
            },
          },
        ),
    },
  ),
}));

const { listSongs, getSongById, songLibraryStats } = await import(
  "@/lib/data/songs"
);
const {
  listServices,
  getNextService,
  listUpcomingServices,
  listRecentServices,
  getServiceById,
  serviceCounts,
} = await import("@/lib/data/services");
const { listTeamMembers, getTeamMemberById, listPositions, teamStats } =
  await import("@/lib/data/team");
const { getWorshipProfile, listServiceTypes, listSpecialDates } = await import(
  "@/lib/data/church"
);
const { scope, scopedById } = await import("@/lib/data/context");
type ChurchContext = import("@/lib/data/context").ChurchContext;

const OURS = "church_northminster";
const THEIRS = "church_someone_else";

const ctx = {
  userId: "user_1",
  user: { id: "user_1", name: "Britt", email: "b@example.com", image: null },
  churchId: OURS,
  church: {
    id: OURS,
    name: "Northminster Community Church",
    slug: "northminster",
    timezone: "America/New_York",
    logoUrl: null,
  },
  role: "OWNER",
} as ChurchContext;

/** Every churchId value appearing anywhere in a query argument tree. */
function churchIdsIn(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) churchIdsIn(v, found);
    return found;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "churchId" && typeof v === "string") found.push(v);
      else churchIdsIn(v, found);
    }
  }
  return found;
}

async function ignoreNotFound(fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch {
    // Scoped lookups throw NotFoundError against the empty stub; the query
    // itself is what we are inspecting.
  }
}

async function exerciseEveryRepository() {
  await listSongs(ctx);
  await songLibraryStats(ctx);
  await listServices(ctx);
  await getNextService(ctx);
  await listUpcomingServices(ctx);
  await listRecentServices(ctx);
  await serviceCounts(ctx);
  await listTeamMembers(ctx);
  await listPositions(ctx);
  await teamStats(ctx);
  await getWorshipProfile(ctx);
  await listServiceTypes(ctx);
  await listSpecialDates(ctx);
  await ignoreNotFound(() => getSongById(ctx, "song_from_another_church"));
  await ignoreNotFound(() => getServiceById(ctx, "service_from_another_church"));
  await ignoreNotFound(() =>
    getTeamMemberById(ctx, "member_from_another_church"),
  );
}

beforeEach(() => {
  calls.length = 0;
});

describe("scope helpers", () => {
  it("scope() yields only the caller's church", () => {
    expect(scope(ctx)).toEqual({ churchId: OURS });
  });

  it("scopedById() pairs the id with the church, never the id alone", () => {
    expect(scopedById(ctx, "abc")).toEqual({ id: "abc", churchId: OURS });
  });
});

describe("repository tenant scoping", () => {
  it("issues queries (sanity check that the stub is wired up)", async () => {
    await exerciseEveryRepository();
    expect(calls.length).toBeGreaterThan(15);
  });

  it("carries the caller's churchId on every single query", async () => {
    await exerciseEveryRepository();
    const unscoped = calls.filter(
      (c) => !churchIdsIn(c.args).includes(OURS),
    );
    expect(
      unscoped.map((c) => `${c.model}.${c.op}`),
    ).toEqual([]);
  });

  it("never leaks another church's id into a query", async () => {
    await exerciseEveryRepository();
    const foreign = calls.filter((c) => churchIdsIn(c.args).includes(THEIRS));
    expect(foreign).toEqual([]);
  });

  it("resolves records by id only in combination with the church", async () => {
    await exerciseEveryRepository();
    const byId = calls.filter(
      (c) => c.op === "findFirst" || c.op === "findUnique",
    );
    expect(byId.length).toBeGreaterThan(0);
    for (const call of byId) {
      expect(churchIdsIn(call.args)).toContain(OURS);
    }
  });

  it("does not fetch a single record with findUnique on a bare id", async () => {
    await exerciseEveryRepository();
    const bareIdLookups = calls.filter((c) => {
      if (c.op !== "findUnique") return false;
      const where = (c.args as { where?: Record<string, unknown> }).where ?? {};
      return "id" in where && !("churchId" in where);
    });
    expect(bareIdLookups).toEqual([]);
  });
});

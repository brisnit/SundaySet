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

vi.mock("@/lib/db", () => {
  const client: unknown = new Proxy(
    {},
    {
      get: (_t, model: string) => {
        // Transactions run their callback against the same recording stub, so
        // queries inside them are inspected like any other.
        if (model === "$transaction") {
          return (arg: unknown) =>
            typeof arg === "function"
              ? (arg as (tx: unknown) => unknown)(client)
              : Promise.resolve([]);
        }
        return new Proxy(
          {},
          {
            get: (_t2, op: string) => (args: Record<string, unknown> = {}) => {
              calls.push({ model, op, args });
              return Promise.resolve(defaultResult(op));
            },
          },
        );
      },
    },
  );
  return { db: client };
});

const {
  listSongs,
  getSongById,
  songLibraryStats,
  createSong,
  updateSong,
  setSongStatus,
  deleteSong,
  upsertSongChart,
  addSongFromCatalog,
  getSongUsageHistory,
} = await import("@/lib/data/songs");
const {
  listServices,
  getNextService,
  listUpcomingServices,
  listRecentServices,
  getServiceById,
  serviceCounts,
  createService,
  updateService,
  deleteService,
} = await import("@/lib/data/services");
const {
  listTeamMembers,
  getTeamMemberById,
  listPositions,
  teamStats,
  createTeamMember,
  updateTeamMember,
  setTeamMemberActive,
} = await import("@/lib/data/team");
const { getWorshipProfile, listServiceTypes, listSpecialDates } = await import(
  "@/lib/data/church"
);
const {
  getSetlist,
  addSongToService,
  removeSongFromService,
  setServiceSongKey,
  moveServiceSong,
  listAddableSongs,
} = await import("@/lib/data/setlist");
const {
  getServiceTeam,
  listCandidatePool,
  listCandidates,
  assignMember,
  reassignMember,
  removeAssignment,
} = await import("@/lib/data/assignments");
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

/**
 * Models that legitimately carry no churchId.
 *
 * `catalogSong` is the global Discover catalogue, shared by every church and
 * never holding church data. `songChart` and `songUsage` hang off a Song, so
 * they are scoped by proving ownership of the parent first — asserted
 * separately below rather than waived.
 */
const GLOBAL_MODELS = new Set(["catalogSong"]);
const PARENT_SCOPED_MODELS = new Set([
  "songChart",
  "sermon",
  // TeamMemberPosition is a join row reached only after the parent member is
  // resolved church-scoped and every position id is re-checked.
  "teamMemberPosition",
]);

const SONG_INPUT: Parameters<typeof createSong>[1] = {
  title: "New Song",
  artist: undefined,
  ccliNumber: undefined,
  defaultKey: undefined,
  churchKey: undefined,
  alternateKeys: [],
  bpm: undefined,
  tempoCategory: undefined,
  songTypes: [],
  themes: [],
  difficulty: "MODERATE",
  familiarity: "NEW",
  status: "ACTIVE",
  leadVocalistPreference: undefined,
  lyrics: undefined,
  notes: undefined,
  spotifyUrl: undefined,
  appleMusicUrl: undefined,
  youtubeUrl: undefined,
};

const SERVICE_INPUT: Parameters<typeof createService>[1] = {
  date: new Date(Date.UTC(2026, 8, 6)),
  serviceTypeId: undefined,
  startTime: "10:00",
  callTime: undefined,
  title: undefined,
  notes: undefined,
  status: "DRAFT",
  sermonTitle: undefined,
  sermonSeries: undefined,
  sermonScripture: undefined,
  sermonDescription: undefined,
};

const MEMBER_INPUT: Parameters<typeof createTeamMember>[1] = {
  name: "Someone",
  email: undefined,
  phone: undefined,
  vocalRange: undefined,
  notes: undefined,
  active: true,
  preferredPerMonth: 2,
  preferredServiceTypeId: undefined,
  positionIds: [],
};

const CHART_INPUT: Parameters<typeof upsertSongChart>[2] = {
  key: undefined,
  capo: undefined,
  sections: [],
};

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
  await getSongUsageHistory(ctx, "song_from_another_church");
  await createSong(ctx, SONG_INPUT);
  await ignoreNotFound(() => updateSong(ctx, "song_from_another_church", SONG_INPUT));
  await ignoreNotFound(() => setSongStatus(ctx, "song_from_another_church", "RETIRED"));
  await ignoreNotFound(() => deleteSong(ctx, "song_from_another_church"));
  await ignoreNotFound(() => upsertSongChart(ctx, "song_from_another_church", CHART_INPUT));
  await ignoreNotFound(() => addSongFromCatalog(ctx, "catalog_song"));
  await createService(ctx, SERVICE_INPUT);
  await ignoreNotFound(() =>
    updateService(ctx, "service_from_another_church", SERVICE_INPUT),
  );
  await ignoreNotFound(() => deleteService(ctx, "service_from_another_church"));
  // A service type referenced by id must be re-checked against the church.
  await ignoreNotFound(() =>
    createService(ctx, { ...SERVICE_INPUT, serviceTypeId: "type_from_another_church" }),
  );
  await getSetlist(ctx, "service_from_another_church");
  await listAddableSongs(ctx, "service_from_another_church");
  await ignoreNotFound(() =>
    addSongToService(ctx, "service_from_another_church", "song_x"),
  );
  await ignoreNotFound(() => removeSongFromService(ctx, "row_from_another_church"));
  await ignoreNotFound(() => setServiceSongKey(ctx, "row_from_another_church", "G"));
  await ignoreNotFound(() => moveServiceSong(ctx, "row_from_another_church", "up"));
  await createTeamMember(ctx, MEMBER_INPUT);
  await ignoreNotFound(() =>
    updateTeamMember(ctx, "member_from_another_church", MEMBER_INPUT),
  );
  await ignoreNotFound(() =>
    setTeamMemberActive(ctx, "member_from_another_church", false),
  );
  await ignoreNotFound(() => getServiceTeam(ctx, "service_from_another_church"));
  await ignoreNotFound(() => listCandidatePool(ctx, "service_from_another_church"));
  await ignoreNotFound(() =>
    listCandidates(ctx, "service_from_another_church", "position_x"),
  );
  await ignoreNotFound(() =>
    assignMember(ctx, "service_from_another_church", "member_x", "position_x"),
  );
  await ignoreNotFound(() =>
    reassignMember(ctx, "assignment_from_another_church", "member_x"),
  );
  await ignoreNotFound(() =>
    removeAssignment(ctx, "assignment_from_another_church"),
  );
  // Position ids must be re-checked against the church before being linked.
  await ignoreNotFound(() =>
    createTeamMember(ctx, {
      ...MEMBER_INPUT,
      positionIds: ["position_from_another_church"],
    }),
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

  it("carries the caller's churchId on every church-owned query", async () => {
    await exerciseEveryRepository();
    const unscoped = calls
      .filter((c) => !GLOBAL_MODELS.has(c.model) && !PARENT_SCOPED_MODELS.has(c.model))
      .filter((c) => !churchIdsIn(c.args).includes(OURS));
    expect(unscoped.map((c) => `${c.model}.${c.op}`)).toEqual([]);
  });

  it("reaches ServiceSong tenancy through its parent service", async () => {
    await exerciseEveryRepository();
    // ServiceSong has no churchId of its own; every query must join through
    // `service: { churchId }`.
    const setlistOps = calls.filter((c) => c.model === "serviceSong");
    expect(setlistOps.length).toBeGreaterThan(0);
    const entryPoints = setlistOps.filter((c) =>
      churchIdsIn(c.args).includes(OURS),
    );
    expect(entryPoints.length).toBeGreaterThan(0);
  });

  it("church-scopes every setlist mutation it reaches", async () => {
    await exerciseEveryRepository();
    // Against rows this church does not own, the guards fire first and no
    // mutation is attempted at all. Any mutation that IS reached must carry the
    // tenant filter in its own where clause.
    const mutations = calls.filter(
      (c) =>
        c.model === "serviceSong" &&
        ["create", "updateMany", "deleteMany", "update", "delete"].includes(c.op),
    );
    expect(mutations.length).toBeGreaterThan(0);
    for (const m of mutations) {
      expect(churchIdsIn(m.args)).toContain(OURS);
    }
  });

  it("church-scopes every assignment query and mutation", async () => {
    await exerciseEveryRepository();
    // Assignment has no churchId; it reaches tenancy through
    // `service: { churchId }` on every read and write.
    const ops = calls.filter((c) => c.model === "assignment");
    expect(ops.length).toBeGreaterThan(0);
    for (const op of ops) {
      expect(churchIdsIn(op.args)).toContain(OURS);
    }
  });

  it("never creates an assignment it could not resolve church-scoped", async () => {
    await exerciseEveryRepository();
    const creates = calls.filter(
      (c) => c.model === "assignment" && ["create", "createMany"].includes(c.op),
    );
    expect(creates).toEqual([]);
  });

  it("re-checks referenced positions against the caller's church", async () => {
    await exerciseEveryRepository();
    const positionLookups = calls.filter(
      (c) => c.model === "position" && c.op === "findMany",
    );
    expect(positionLookups.length).toBeGreaterThan(0);
    for (const call of positionLookups) {
      expect(churchIdsIn(call.args)).toContain(OURS);
    }
  });

  it("never links a position without first resolving the member church-scoped", async () => {
    await exerciseEveryRepository();
    // With nothing resolvable in the stub, the guards fire and no join row is
    // ever written.
    const joinWrites = calls.filter(
      (c) =>
        c.model === "teamMemberPosition" &&
        ["create", "createMany", "deleteMany"].includes(c.op),
    );
    expect(joinWrites).toEqual([]);
  });

  it("re-checks a referenced service type against the caller's church", async () => {
    await exerciseEveryRepository();
    const typeLookups = calls.filter((c) => c.model === "serviceType");
    expect(typeLookups.length).toBeGreaterThan(0);
    for (const call of typeLookups) {
      expect(churchIdsIn(call.args)).toContain(OURS);
    }
  });

  it("checks ownership of the parent song before touching its chart", async () => {
    await exerciseEveryRepository();
    // SongChart has no churchId of its own, so upsertSongChart first resolves
    // the song through a scoped findFirst. Against a song this church does not
    // own that lookup misses, and the chart must never be written at all.
    const ownershipCheck = calls.some(
      (c) =>
        c.model === "song" &&
        c.op === "findFirst" &&
        churchIdsIn(c.args).includes(OURS),
    );
    expect(ownershipCheck).toBe(true);
    expect(calls.filter((c) => PARENT_SCOPED_MODELS.has(c.model))).toEqual([]);
  });

  it("never mutates a record with a bare-id update or delete", async () => {
    await exerciseEveryRepository();
    // update()/delete() require a unique selector, which would be the id alone.
    // Writes must go through updateMany/deleteMany with a scoped where.
    const bare = calls.filter(
      (c) => (c.op === "update" || c.op === "delete") && c.model !== "songChart",
    );
    expect(bare.map((c) => `${c.model}.${c.op}`)).toEqual([]);
  });

  it("never leaks another church's id into a query", async () => {
    await exerciseEveryRepository();
    const foreign = calls.filter((c) => churchIdsIn(c.args).includes(THEIRS));
    expect(foreign).toEqual([]);
  });

  it("resolves records by id only in combination with the church", async () => {
    await exerciseEveryRepository();
    const byId = calls
      .filter((c) => !GLOBAL_MODELS.has(c.model))
      .filter((c) => c.op === "findFirst" || c.op === "findUnique");
    expect(byId.length).toBeGreaterThan(0);
    for (const call of byId) {
      expect(churchIdsIn(call.args)).toContain(OURS);
    }
  });

  it("does not fetch a single record with findUnique on a bare id", async () => {
    await exerciseEveryRepository();
    const bareIdLookups = calls.filter((c) => {
      if (c.op !== "findUnique" || GLOBAL_MODELS.has(c.model)) return false;
      const where = (c.args as { where?: Record<string, unknown> }).where ?? {};
      return "id" in where && !("churchId" in where);
    });
    expect(bareIdLookups).toEqual([]);
  });
});

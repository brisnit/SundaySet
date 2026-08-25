import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { NotFoundError, type ChurchContext } from "@/lib/data/context";
import {
  createService,
  deleteService,
  getServiceById,
  listServices,
  updateService,
} from "@/lib/data/services";
import { parseServiceDate, type ServiceInput } from "@/lib/validation/service";

const SLUG_A = "vitest-svc-alpha";
const SLUG_B = "vitest-svc-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[service-writes] No database reachable — skipping.\n");
}

const input = (over: Partial<ServiceInput> = {}): ServiceInput => ({
  date: parseServiceDate("2026-09-06"),
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
  ...over,
});

async function makeChurch(slug: string) {
  const church = await db.church.create({ data: { name: slug, slug } });
  const user = await db.user.create({ data: { email: `${slug}@example.test` } });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });
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
  return { ctx, serviceTypeId: serviceType.id };
}

async function purge() {
  await db.church.deleteMany({ where: { slug: { in: [SLUG_A, SLUG_B] } } });
  await db.user.deleteMany({
    where: { email: { in: [`${SLUG_A}@example.test`, `${SLUG_B}@example.test`] } },
  });
}

describe.skipIf(!dbReachable)("service writes", () => {
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

  it("creates a service scoped to the caller's church", async () => {
    const s = await createService(alpha.ctx, input({ title: "Created" }));
    expect(s.churchId).toBe(alpha.ctx.churchId);
    expect(s.status).toBe("DRAFT");
    expect((await listServices(beta.ctx)).map((x) => x.title)).not.toContain("Created");
  });

  it("stores the date as a calendar date at UTC midnight", async () => {
    const s = await createService(alpha.ctx, input({ date: parseServiceDate("2026-11-01") }));
    const read = await getServiceById(alpha.ctx, s.id);
    expect(read.date.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("records who created it", async () => {
    const s = await createService(alpha.ctx, input());
    expect(s.createdById).toBe(alpha.ctx.userId);
  });

  it("creates a sermon only when sermon fields were filled in", async () => {
    const bare = await createService(alpha.ctx, input());
    expect((await getServiceById(alpha.ctx, bare.id)).sermon).toBeNull();

    const withSermon = await createService(
      alpha.ctx,
      input({ sermonTitle: "The Prodigal Son", sermonScripture: "Luke 15:11–32" }),
    );
    const read = await getServiceById(alpha.ctx, withSermon.id);
    expect(read.sermon?.title).toBe("The Prodigal Son");
    expect(read.sermon?.scripture).toBe("Luke 15:11–32");
  });

  it("accepts a service type belonging to the same church", async () => {
    const s = await createService(
      alpha.ctx,
      input({ serviceTypeId: alpha.serviceTypeId }),
    );
    expect(s.serviceTypeId).toBe(alpha.serviceTypeId);
  });

  it("REFUSES a service type belonging to another church", async () => {
    // Otherwise one church could attach services to another's schedule.
    await expect(
      createService(alpha.ctx, input({ serviceTypeId: beta.serviceTypeId })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("updates a service the church owns", async () => {
    const s = await createService(alpha.ctx, input({ title: "Before" }));
    await updateService(alpha.ctx, s.id, input({ title: "After", status: "READY" }));
    const read = await getServiceById(alpha.ctx, s.id);
    expect(read.title).toBe("After");
    expect(read.status).toBe("READY");
  });

  it("REFUSES to update another church's service", async () => {
    const s = await createService(alpha.ctx, input({ title: "Alpha Only" }));
    await expect(
      updateService(beta.ctx, s.id, input({ title: "Hijacked" })),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect((await getServiceById(alpha.ctx, s.id)).title).toBe("Alpha Only");
  });

  it("REFUSES to delete another church's service", async () => {
    const s = await createService(alpha.ctx, input());
    await expect(deleteService(beta.ctx, s.id)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getServiceById(alpha.ctx, s.id)).id).toBe(s.id);
  });

  it("REFUSES to attach another church's service type on update", async () => {
    const s = await createService(alpha.ctx, input());
    await expect(
      updateService(alpha.ctx, s.id, input({ serviceTypeId: beta.serviceTypeId })),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("adds a sermon on update when one did not exist", async () => {
    const s = await createService(alpha.ctx, input());
    await updateService(alpha.ctx, s.id, input({ sermonTitle: "Added Later" }));
    expect((await getServiceById(alpha.ctx, s.id)).sermon?.title).toBe("Added Later");
  });

  it("removes the sermon when every sermon field is cleared", async () => {
    // An empty sermon row would read as a real theme to the AI planner.
    const s = await createService(alpha.ctx, input({ sermonTitle: "Temporary" }));
    expect((await getServiceById(alpha.ctx, s.id)).sermon).not.toBeNull();
    await updateService(alpha.ctx, s.id, input({ sermonTitle: undefined }));
    expect((await getServiceById(alpha.ctx, s.id)).sermon).toBeNull();
  });

  it("deletes a service the church owns", async () => {
    const s = await createService(alpha.ctx, input());
    await deleteService(alpha.ctx, s.id);
    await expect(getServiceById(alpha.ctx, s.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});

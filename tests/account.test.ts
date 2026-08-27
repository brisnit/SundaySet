import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { ChurchContext } from "@/lib/data/context";
import {
  clearAvatarImage,
  getAccount,
  setAvatarImage,
  updateAccount,
} from "@/lib/data/account";
import { accountInputSchema } from "@/lib/validation/account";

const SLUG_A = "vitest-account-alpha";
const SLUG_B = "vitest-account-beta";

let dbReachable = false;
try {
  await db.$queryRaw`SELECT 1`;
  dbReachable = true;
} catch {
  console.warn("\n[account] No database reachable — skipping integration checks.\n");
}

async function makeChurch(slug: string) {
  const church = await db.church.create({ data: { name: slug, slug } });
  const user = await db.user.create({
    data: { email: `${slug}@example.test`, name: "Original Name" },
  });
  await db.membership.create({
    data: { userId: user.id, churchId: church.id, role: "OWNER" },
  });
  const ctx: ChurchContext = {
    userId: user.id,
    user: { id: user.id, name: user.name, email: user.email, image: null, avatarColor: null },
    churchId: church.id,
    church: {
      id: church.id,
      name: church.name,
      slug: church.slug,
      timezone: church.timezone,
      logoUrl: null,
    },
    role: "OWNER",
  };
  return { ctx };
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

describe("account validation", () => {
  const form = (over: Record<string, unknown> = {}) => ({
    name: "Britt Hollis",
    phone: "",
    avatarColor: "",
    ...over,
  });

  it("requires a name", () => {
    expect(accountInputSchema.safeParse(form({ name: "   " })).success).toBe(false);
  });

  it("treats a blank phone and colour as unset rather than empty strings", () => {
    const r = accountInputSchema.safeParse(form());
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.phone).toBeUndefined();
    expect(r.data.avatarColor).toBeUndefined();
  });

  it("accepts a phone number as typed, punctuation and all", () => {
    const r = accountInputSchema.safeParse(form({ phone: "(555) 987-6543 x12" }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.phone).toBe("(555) 987-6543 x12");
  });

  it("rejects a phone number that is not one", () => {
    expect(accountInputSchema.safeParse(form({ phone: "call me" })).success).toBe(false);
  });

  it("rejects a colour that is not on the palette", () => {
    expect(
      accountInputSchema.safeParse(form({ avatarColor: "chartreuse" })).success,
    ).toBe(false);
  });

  // formData.get() yields null for a field the browser did not send.
  it("survives nulls the way FormData hands them over", () => {
    const r = accountInputSchema.safeParse({
      name: "Britt Hollis",
      phone: null,
      avatarColor: null,
    });
    expect(r.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Data layer
// ---------------------------------------------------------------------------

describe.skipIf(!dbReachable)("account data layer", () => {
  let a: Awaited<ReturnType<typeof makeChurch>>;
  let b: Awaited<ReturnType<typeof makeChurch>>;

  beforeAll(async () => {
    await purge();
    a = await makeChurch(SLUG_A);
    b = await makeChurch(SLUG_B);
  });
  afterAll(purge);

  it("reads the signed-in account with its role and workspace", async () => {
    const account = await getAccount(a.ctx);
    expect(account.email).toBe(`${SLUG_A}@example.test`);
    expect(account.role).toBe("OWNER");
    expect(account.workspace).toBe(SLUG_A);
  });

  it("saves a name, phone and monogram colour", async () => {
    await updateAccount(a.ctx, {
      name: "Britt Hollis",
      phone: "(555) 987-6543",
      avatarColor: "violet",
    });
    const account = await getAccount(a.ctx);
    expect(account.name).toBe("Britt Hollis");
    expect(account.phone).toBe("(555) 987-6543");
    expect(account.avatarColor).toBe("violet");
  });

  it("clears a phone and colour back out when they are dropped", async () => {
    await updateAccount(a.ctx, { name: "Britt Hollis" });
    const account = await getAccount(a.ctx);
    expect(account.phone).toBeNull();
    expect(account.avatarColor).toBeNull();
  });

  it("returns the replaced photo so the old file can be cleaned up", async () => {
    expect(await setAvatarImage(a.ctx, "/uploads/one.png")).toBeNull();
    expect(await setAvatarImage(a.ctx, "/uploads/two.png")).toBe("/uploads/one.png");
    expect(await clearAvatarImage(a.ctx)).toBe("/uploads/two.png");
    expect((await getAccount(a.ctx)).image).toBeNull();
  });

  // The whole point of never accepting a user id: editing one account must not
  // be able to reach another, even one in a different workspace.
  it("only ever touches the account the context belongs to", async () => {
    await updateAccount(a.ctx, { name: "Alpha Person", phone: "555-0100" });
    await updateAccount(b.ctx, { name: "Beta Person" });

    expect((await getAccount(a.ctx)).name).toBe("Alpha Person");
    expect((await getAccount(a.ctx)).phone).toBe("555-0100");
    expect((await getAccount(b.ctx)).name).toBe("Beta Person");
    expect((await getAccount(b.ctx)).phone).toBeNull();
  });

  it("leaves the role alone — it is not a profile field", async () => {
    await updateAccount(a.ctx, { name: "Alpha Person" });
    const membership = await db.membership.findFirstOrThrow({
      where: { userId: a.ctx.userId },
      select: { role: true },
    });
    expect(membership.role).toBe("OWNER");
  });
});

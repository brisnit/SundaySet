import "server-only";

import { db } from "@/lib/db";
import type { AccountInput } from "@/lib/validation/account";

import { type ChurchContext } from "./context";

/**
 * The signed-in user's own profile.
 *
 * Every function here scopes to `ctx.userId` and never accepts a user id from
 * the caller — an account page must only ever edit the account it belongs to.
 *
 * Role is deliberately read-only. It lives on Membership, and letting someone
 * change their own would be straightforward privilege escalation: a MUSICIAN
 * could make themselves OWNER. Changing roles belongs in member management,
 * performed by someone who already holds members:manage.
 *
 * Email is read-only too: it is the sign-in identifier, so changing it needs a
 * verification round-trip rather than a text field.
 */
export async function getAccount(ctx: ChurchContext) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      image: true,
      avatarColor: true,
      createdAt: true,
    },
  });
  return { ...user, role: ctx.role, workspace: ctx.church.name };
}

export async function updateAccount(ctx: ChurchContext, input: AccountInput) {
  await db.user.update({
    where: { id: ctx.userId },
    data: {
      name: input.name,
      phone: input.phone ?? null,
      avatarColor: input.avatarColor ?? null,
    },
  });
}

/** Stores an uploaded avatar. Returns the URL it replaced, if any. */
export async function setAvatarImage(ctx: ChurchContext, url: string) {
  const previous = await db.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { image: true },
  });
  await db.user.update({ where: { id: ctx.userId }, data: { image: url } });
  return previous.image;
}

export async function clearAvatarImage(ctx: ChurchContext) {
  const previous = await db.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { image: true },
  });
  await db.user.update({ where: { id: ctx.userId }, data: { image: null } });
  return previous.image;
}

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { AuthorizationError, can, type Permission } from "@/lib/auth/roles";

/**
 * Everything a server-side caller needs to act on behalf of one user inside one
 * church. Every church-scoped query in lib/data requires one of these.
 */
export type ChurchContext = {
  userId: string;
  user: { id: string; name: string | null; email: string; image: string | null };
  churchId: string;
  church: { id: string; name: string; slug: string; timezone: string; logoUrl: string | null };
  role: Role;
};

/**
 * Roles are ordered so that a user who belongs to several churches lands in the
 * one where they do the most work.
 */
const ROLE_PRIORITY: Record<Role, number> = {
  OWNER: 0,
  ADMIN: 1,
  WORSHIP_LEADER: 2,
  TEAM_LEADER: 3,
  PASTOR: 4,
  MUSICIAN: 5,
  TECH: 6,
};

/**
 * Resolve the caller's church context.
 *
 * The session only establishes WHO the user is. Which church they may act in,
 * and with what role, is re-read from the database on every request — a JWT is
 * never trusted for authorization, so revoking a membership takes effect
 * immediately rather than when the token expires.
 *
 * `cache` dedupes this within a single request.
 */
export const getChurchContext = cache(async (): Promise<ChurchContext | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const memberships = await db.membership.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      church: { select: { id: true, name: true, slug: true, timezone: true, logoUrl: true } },
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  if (memberships.length === 0) return null;

  const active = memberships.sort(
    (a, b) => ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role],
  )[0];

  return {
    userId,
    user: active.user,
    churchId: active.churchId,
    church: active.church,
    role: active.role,
  };
});

/** Redirects to sign-in when there is no usable context. */
export async function requireChurchContext(): Promise<ChurchContext> {
  const ctx = await getChurchContext();
  if (!ctx) redirect("/login");
  return ctx;
}

/** Redirects when signed out; throws AuthorizationError when under-privileged. */
export async function requirePermission(
  permission: Permission,
): Promise<ChurchContext> {
  const ctx = await requireChurchContext();
  if (!can(ctx.role, permission)) throw new AuthorizationError(permission);
  return ctx;
}

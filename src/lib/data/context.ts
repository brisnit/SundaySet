import type { ChurchContext } from "@/lib/auth/session";

export type { ChurchContext };

/**
 * The single source of the tenant filter.
 *
 * Every church-scoped query in lib/data composes its `where` from this, so
 * there is exactly one place that decides what "belongs to this church" means.
 * Never write `{ churchId }` by hand in a repository.
 */
export function scope(ctx: ChurchContext): { churchId: string } {
  return { churchId: ctx.churchId };
}

/**
 * Scope a lookup that also targets one row by id.
 *
 * Deliberately shaped for `findFirst`, not `findUnique`: looking a record up by
 * its primary key alone and checking ownership afterwards is the classic
 * cross-tenant leak. Here a row from another church simply does not match.
 */
export function scopedById(
  ctx: ChurchContext,
  id: string,
): { id: string; churchId: string } {
  return { id, churchId: ctx.churchId };
}

/** Raised when a scoped lookup finds nothing — indistinguishable from "not yours". */
export class NotFoundError extends Error {
  constructor(entity: string) {
    super(`${entity} not found`);
    this.name = "NotFoundError";
  }
}

import type { Role } from "@/generated/prisma/enums";

/**
 * Role → permission matrix.
 *
 * Kept pure and dependency-free so it can be unit tested exhaustively and
 * reasoned about in one place. Authorization is ALWAYS enforced server-side in
 * the data layer and server actions; hiding UI is never the control.
 */
export const PERMISSIONS = [
  "church:manage",
  "members:manage",
  "settings:manage",
  "songs:view",
  "songs:manage",
  "services:view",
  "services:manage",
  "sermon:manage",
  "team:view",
  "team:manage",
  "team:schedule",
  "invitations:send",
  "ai:use",
  "schedule:view-own",
  "availability:manage-own",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

/** Everyone who can sign in can at least see their own schedule. */
const BASE: Permission[] = ["schedule:view-own", "availability:manage-own"];

const MATRIX: Record<Role, Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL,
  WORSHIP_LEADER: [
    ...BASE,
    "songs:view",
    "songs:manage",
    "services:view",
    "services:manage",
    "sermon:manage",
    "team:view",
    "team:schedule",
    "invitations:send",
    "ai:use",
  ],
  TEAM_LEADER: [
    ...BASE,
    "songs:view",
    "services:view",
    "team:view",
    "team:schedule",
    "invitations:send",
  ],
  PASTOR: [...BASE, "songs:view", "services:view", "sermon:manage"],
  MUSICIAN: [...BASE, "songs:view", "services:view"],
  TECH: [...BASE, "services:view"],
};

export function permissionsFor(role: Role): readonly Permission[] {
  return MATRIX[role];
}

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

/** Roles allowed into the admin-facing app shell at all. */
export function isPlanner(role: Role): boolean {
  return can(role, "services:manage") || can(role, "team:schedule");
}

export class AuthorizationError extends Error {
  constructor(readonly permission: Permission) {
    super(`Missing required permission: ${permission}`);
    this.name = "AuthorizationError";
  }
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new AuthorizationError(permission);
}

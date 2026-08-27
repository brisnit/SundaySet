import "server-only";

import type { AssignmentStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { transposeSections } from "@/lib/music/transpose";
import { chartSectionSchema } from "@/lib/validation/song";
import {
  expiryForService,
  generateToken,
  hashToken,
  looksLikeToken,
} from "@/lib/invitations/token";

import { NotFoundError, scope, scopedById, type ChurchContext } from "./context";

/**
 * Invitations.
 *
 * `Invitation.assignmentId` is @unique, so the schema models one invitation per
 * ASSIGNMENT, not per person-per-service. A musician holding two positions
 * therefore has two assignments and two invitations.
 *
 * Rather than migrate, we make that invisible to the musician: every one of a
 * person's tokens for a service resolves to the same page, which shows all of
 * their positions and responds to all of them together. One link, one decision.
 * Keeping an invitation per assignment also means removing one position does
 * not kill the links belonging to the others.
 */

export type ResponseOutcome = "ACCEPTED" | "DECLINED";

/** Why a token could not be used. Deliberately coarse — see resolveInvitation. */
export type TokenFailure = "MALFORMED" | "NOT_FOUND" | "EXPIRED";

export class InvalidTokenError extends Error {
  constructor(readonly reason: TokenFailure) {
    super(`Invitation token ${reason.toLowerCase()}`);
    this.name = "InvalidTokenError";
  }
}

/**
 * Issues invitations for every position this person holds in the service.
 *
 * Regeneration is explicit and total: existing invitations for the person on
 * this service are deleted first, so any previously shared link stops working.
 * Returns the raw token exactly once — it is never readable again.
 */
export async function inviteMemberToService(
  ctx: ChurchContext,
  serviceId: string,
  teamMemberId: string,
): Promise<{ token: string; positions: number }> {
  const service = await db.service.findFirst({
    where: scopedById(ctx, serviceId),
    select: { id: true, date: true },
  });
  if (!service) throw new NotFoundError("Service");

  const assignments = await db.assignment.findMany({
    where: { serviceId, teamMemberId, service: scope(ctx) },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (assignments.length === 0) throw new NotFoundError("Assignment");

  const assignmentIds = assignments.map((a) => a.id);
  const expiresAt = expiryForService(service.date);
  const now = new Date();

  // One raw token is surfaced; the rest are distinct rows because tokenHash is
  // unique. Any of them opens the same page.
  const primaryToken = generateToken();

  await db.$transaction(async (tx) => {
    // Replace rather than add, so regenerating revokes what came before.
    await tx.invitation.deleteMany({ where: { assignmentId: { in: assignmentIds } } });

    for (const [index, assignmentId] of assignmentIds.entries()) {
      await tx.invitation.create({
        data: {
          assignmentId,
          tokenHash: hashToken(index === 0 ? primaryToken : generateToken()),
          expiresAt,
          sentAt: now,
        },
      });
    }

    // PENDING means "scheduled but not asked". Once a link exists they have
    // been asked, so every position moves to INVITED. An existing answer is
    // left alone — re-sending a link must not erase a reply.
    await tx.assignment.updateMany({
      where: { id: { in: assignmentIds }, status: { in: ["PENDING", "CANCELLED"] } },
      data: { status: "INVITED" },
    });
  });

  return { token: primaryToken, positions: assignmentIds.length };
}

/** Drops every invitation for a person on a service; their links stop working. */
export async function revokeInvitations(
  ctx: ChurchContext,
  serviceId: string,
  teamMemberId: string,
) {
  const assignments = await db.assignment.findMany({
    where: { serviceId, teamMemberId, service: scope(ctx) },
    select: { id: true },
  });
  if (assignments.length === 0) throw new NotFoundError("Assignment");
  const ids = assignments.map((a) => a.id);

  await db.$transaction(async (tx) => {
    await tx.invitation.deleteMany({ where: { assignmentId: { in: ids } } });
    // Back to "scheduled but not asked".
    await tx.assignment.updateMany({
      where: { id: { in: ids }, status: "INVITED" },
      data: { status: "PENDING", respondedAt: null },
    });
  });
}

export type PublicInvitation = {
  memberName: string;
  churchName: string;
  serviceId: string;
  serviceTitle: string;
  serviceTypeName: string | null;
  date: Date;
  startTime: string;
  callTime: string | null;
  status: AssignmentStatus;
  respondedAt: Date | null;
  expiresAt: Date;
  positions: string[];
  songs: Array<{
    position: number;
    title: string;
    artist: string | null;
    key: string | null;
    songId: string;
    hasChart: boolean;
  }>;
};

/**
 * Resolves a bearer token to exactly what the musician may see.
 *
 * The token is the only authorization. It is looked up by digest, never by any
 * id from the URL, so a token cannot be pointed at another church, service or
 * member. Nothing beyond this projection is returned — no planner notes, no
 * other people's contact details, no admin state.
 */
export async function resolveInvitation(token: unknown): Promise<PublicInvitation> {
  if (!looksLikeToken(token)) throw new InvalidTokenError("MALFORMED");

  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      expiresAt: true,
      assignment: {
        select: {
          serviceId: true,
          teamMemberId: true,
          teamMember: { select: { name: true } },
        },
      },
    },
  });
  if (!invitation) throw new InvalidTokenError("NOT_FOUND");
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new InvalidTokenError("EXPIRED");
  }

  const { serviceId, teamMemberId, teamMember } = invitation.assignment;

  const service = await db.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      title: true,
      date: true,
      startTime: true,
      callTime: true,
      church: { select: { name: true } },
      serviceType: { select: { name: true } },
      songs: {
        orderBy: { position: "asc" },
        select: {
          position: true,
          key: true,
          song: {
            select: {
              id: true,
              title: true,
              artist: true,
              chart: { select: { id: true } },
              attachments: { select: { id: true }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!service) throw new InvalidTokenError("NOT_FOUND");

  // Every position this person holds in this service, not just the one the
  // token happens to hang off.
  const assignments = await db.assignment.findMany({
    where: { serviceId, teamMemberId },
    select: {
      status: true,
      respondedAt: true,
      callTime: true,
      position: { select: { name: true, sortOrder: true } },
    },
    orderBy: { position: { sortOrder: "asc" } },
  });
  if (assignments.length === 0) throw new InvalidTokenError("NOT_FOUND");

  return {
    memberName: teamMember.name,
    churchName: service.church.name,
    serviceId: service.id,
    serviceTitle: service.title ?? "Your set",
    serviceTypeName: service.serviceType?.name ?? null,
    date: service.date,
    startTime: service.startTime,
    callTime: assignments.find((a) => a.callTime)?.callTime ?? service.callTime,
    status: summariseStatus(assignments.map((a) => a.status)),
    respondedAt: assignments.find((a) => a.respondedAt)?.respondedAt ?? null,
    expiresAt: invitation.expiresAt,
    positions: assignments.map((a) => a.position.name),
    songs: service.songs.map((s) => ({
      position: s.position,
      title: s.song.title,
      artist: s.song.artist,
      key: s.key,
      songId: s.song.id,
      hasChart: Boolean(s.song.chart) || s.song.attachments.length > 0,
    })),
  };
}

/**
 * One headline status across all of a person's positions.
 * A single decline is the honest summary — the leader has a hole to fill.
 */
function summariseStatus(statuses: AssignmentStatus[]): AssignmentStatus {
  if (statuses.includes("DECLINED")) return "DECLINED";
  if (statuses.every((s) => s === "ACCEPTED")) return "ACCEPTED";
  if (statuses.includes("INVITED")) return "INVITED";
  return statuses[0] ?? "PENDING";
}

/**
 * Records the musician's answer against every position they hold.
 *
 * Responding again is allowed while the link is valid — people change their
 * minds, and forcing them to phone the leader helps nobody. Each response
 * overwrites the last and re-stamps the time.
 */
export async function respondToInvitation(
  token: unknown,
  outcome: ResponseOutcome,
): Promise<PublicInvitation> {
  if (!looksLikeToken(token)) throw new InvalidTokenError("MALFORMED");

  const invitation = await db.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      assignment: { select: { serviceId: true, teamMemberId: true } },
    },
  });
  if (!invitation) throw new InvalidTokenError("NOT_FOUND");
  if (invitation.expiresAt.getTime() < Date.now()) {
    throw new InvalidTokenError("EXPIRED");
  }

  const { serviceId, teamMemberId } = invitation.assignment;
  const now = new Date();

  await db.$transaction(async (tx) => {
    await tx.assignment.updateMany({
      where: { serviceId, teamMemberId },
      data: { status: outcome, respondedAt: now },
    });
    await tx.invitation.updateMany({
      where: { assignment: { serviceId, teamMemberId } },
      data: { respondedAt: now },
    });
  });

  return resolveInvitation(token);
}

/** Invitation state per person, for the service page. */
export async function getInvitationStates(
  ctx: ChurchContext,
  serviceId: string,
): Promise<Map<string, { invited: boolean; expiresAt: Date | null }>> {
  const rows = await db.assignment.findMany({
    where: { serviceId, service: scope(ctx) },
    select: {
      teamMemberId: true,
      invitation: { select: { expiresAt: true } },
    },
  });

  const out = new Map<string, { invited: boolean; expiresAt: Date | null }>();
  for (const r of rows) {
    const existing = out.get(r.teamMemberId);
    const invited = Boolean(r.invitation) || existing?.invited || false;
    out.set(r.teamMemberId, {
      invited,
      expiresAt: r.invitation?.expiresAt ?? existing?.expiresAt ?? null,
    });
  }
  return out;
}

export type PublicChart = {
  title: string;
  artist: string | null;
  /** The key the chords below are actually written in. */
  key: string | null;
  /** Set when the chart was moved to the set's key, so the view can say so. */
  transposedFrom: string | null;
  capo: number | null;
  bpm: number | null;
  sections: unknown;
  attachmentUrl: string | null;
};

/**
 * A chart for one song, authorised by the invitation token.
 *
 * The song must be in the setlist of the service the token belongs to, so a
 * token cannot be used to read the church's wider library.
 */
export async function resolveInvitationChart(
  token: unknown,
  songId: string,
): Promise<PublicChart> {
  const invitation = await resolveInvitation(token);
  if (!invitation.songs.some((s) => s.songId === songId)) {
    throw new InvalidTokenError("NOT_FOUND");
  }

  const song = await db.song.findUnique({
    where: { id: songId },
    select: {
      title: true,
      artist: true,
      bpm: true,
      churchKey: true,
      chart: { select: { key: true, capo: true, sections: true } },
      attachments: { select: { url: true }, take: 1 },
    },
  });
  if (!song) throw new InvalidTokenError("NOT_FOUND");

  const setlistKey =
    invitation.songs.find((s) => s.songId === songId)?.key ?? null;

  const chartKey = song.chart?.key ?? null;

  /**
   * Transpose to the key this set is playing it in.
   *
   * Until now the header said "Key of A" while the chords underneath were still
   * in G, which is worse than saying nothing: a musician reads the chart, not
   * the header. The stored chart is never modified — this is a view of it.
   */
  const parsed = chartSectionSchema.array().safeParse(song.chart?.sections ?? []);
  const stored = parsed.success ? parsed.data : [];

  const shouldTranspose =
    Boolean(setlistKey) && Boolean(chartKey) && setlistKey !== chartKey;
  const sections = shouldTranspose
    ? transposeSections(stored, chartKey, setlistKey)
    : stored;

  return {
    title: song.title,
    artist: song.artist,
    // The key the chords are really in, which is the point of all this.
    key: shouldTranspose ? setlistKey : (chartKey ?? setlistKey ?? song.churchKey),
    transposedFrom: shouldTranspose ? chartKey : null,
    capo: song.chart?.capo ?? null,
    bpm: song.bpm,
    sections,
    attachmentUrl: song.attachments[0]?.url ?? null,
  };
}

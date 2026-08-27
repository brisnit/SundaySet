"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Plus, Repeat, UserPlus, Users, X } from "lucide-react";

import {
  assignAction,
  reassignAction,
  removeAssignmentAction,
  type TeamResult,
} from "@/app/(app)/plan/[serviceId]/team-actions";
import { InviteButton } from "@/components/services/invite-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { findConflicts, candidateRank, type Conflict } from "@/lib/domain/scheduling";
import { titleCase } from "@/lib/format";

export type InviteState = { invited: boolean };

export type PositionOption = { id: string; name: string; category: string };

export type TeamSlotView = {
  positionId: string;
  positionName: string;
  category: string;
  assignments: Array<{
    id: string;
    status: string;
    teamMemberId: string;
    name: string;
    active: boolean;
    conflicts: Conflict[];
  }>;
};

/** Serialised form of CandidatePoolMember — dates cross as ISO strings. */
export type PoolMember = {
  id: string;
  name: string;
  active: boolean;
  qualifiedPositionIds: string[];
  blockouts: Array<{ startDate: string; endDate: string; note: string | null }>;
  preferredPerMonth: number;
  assignmentsThisMonth: number;
  preferredServiceTypeName: string | null;
  positionsInThisService: string[];
  declinedThisService: boolean;
};

/**
 * Position categories are stored as WORSHIP / TECH / OTHER, but the product is
 * not church-specific, so they are shown generically. The enum values stay put
 * — renaming them would be a destructive migration for a label.
 */
const CATEGORY_LABEL: Record<string, string> = {
  WORSHIP: "Band",
  TECH: "Tech",
  OTHER: "Other",
};

const STATUS_TONE: Record<string, "neutral" | "amber" | "sage" | "clay" | "slate"> = {
  PENDING: "neutral",
  INVITED: "amber",
  ACCEPTED: "sage",
  DECLINED: "clay",
  CANCELLED: "slate",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Not invited yet",
  INVITED: "Awaiting reply",
  ACCEPTED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

function ConflictList({ conflicts }: { conflicts: Conflict[] }) {
  if (conflicts.length === 0) return null;
  return (
    <ul className="mt-1 grid gap-0.5">
      {conflicts.map((c) => (
        <li
          key={c.kind}
          className={
            c.severity === "conflict"
              ? "flex items-center gap-1.5 text-xs text-clay"
              : "flex items-center gap-1.5 text-xs text-ink-subtle"
          }
        >
          <AlertTriangle aria-hidden className="size-3 shrink-0" />
          {c.message}
        </li>
      ))}
    </ul>
  );
}

export function TeamBuilder({
  serviceId,
  serviceDate,
  slots,
  positions,
  pool,
  canEdit,
  canInvite,
  invites,
}: {
  serviceId: string;
  /** ISO date of the service, for evaluating blockouts in the browser. */
  serviceDate: string;
  slots: TeamSlotView[];
  positions: PositionOption[];
  pool: PoolMember[];
  canEdit: boolean;
  canInvite: boolean;
  /** teamMemberId -> whether a live invitation exists. */
  invites: Record<string, boolean>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  /** positionId when adding, or `swap:<assignmentId>` when replacing. */
  const [picking, setPicking] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const date = useMemo(() => new Date(serviceDate), [serviceDate]);

  const run = (fn: () => Promise<TeamResult>) =>
    start(async () => {
      const result = await fn();
      setError(result.error ?? null);
      if (!result.error) setPicking(null);
      router.refresh();
    });

  /** Ranked candidates for one position, computed in the browser. */
  const candidatesFor = (positionId: string) =>
    pool
      .filter((m) => showAll || m.active)
      .map((m) => {
        const conflicts = findConflicts(
          {
            active: m.active,
            qualifiedPositionIds: m.qualifiedPositionIds,
            blockouts: m.blockouts.map((b) => ({
              startDate: new Date(b.startDate),
              endDate: new Date(b.endDate),
              note: b.note,
            })),
            preferredPerMonth: m.preferredPerMonth,
            positionsInThisService: m.positionsInThisService,
            assignmentsThisMonth: m.assignmentsThisMonth,
            declinedThisService: m.declinedThisService,
          },
          positionId,
          date,
        );
        const qualified = m.qualifiedPositionIds.includes(positionId);
        return { m, conflicts, qualified, rank: candidateRank(conflicts, qualified) };
      })
      .sort((a, b) => a.rank - b.rank || a.m.name.localeCompare(b.m.name));

  const picker = (
    positionId: string,
    onPick: (memberId: string) => void,
    excludeIds: string[],
  ) => {
    const rows = candidatesFor(positionId).filter((c) => !excludeIds.includes(c.m.id));
    return (
      <div className="mt-2 rounded-2xl border border-line/70 bg-surface p-2 shadow-card">
        <div className="mb-1.5 flex items-center justify-between px-1">
          <p className="text-xs text-ink-subtle">
            People who play this are listed first. Nobody is hidden for a
            conflict.
          </p>
          <label className="flex items-center gap-1.5 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="size-3.5 accent-[var(--ember)]"
            />
            Include inactive
          </label>
        </div>

        {rows.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-ink-muted">
            No one left to add.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {rows.map(({ m, conflicts, qualified }) => (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onPick(m.id)}
                  className="flex w-full items-start gap-2.5 px-2 py-2 text-left hover:bg-sunken disabled:opacity-50"
                >
                  <Plus aria-hidden className="mt-0.5 size-4 shrink-0 text-ember" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-medium text-ink">{m.name}</span>
                      {qualified ? (
                        <Badge tone="sage">Plays this</Badge>
                      ) : null}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {[
                        `${m.assignmentsThisMonth}× this month`,
                        m.preferredPerMonth > 0
                          ? `prefers ${m.preferredPerMonth}×`
                          : "no limit set",
                        m.preferredServiceTypeName,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <ConflictList conflicts={conflicts} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1.5 flex justify-end border-t border-line pt-1.5">
          <Button variant="ghost" size="sm" onClick={() => setPicking(null)}>
            Close
          </Button>
        </div>
      </div>
    );
  };

  /** Step one of adding: which spot are we filling? */
  const positionChooser = () => {
    const grouped = positions.reduce<Record<string, PositionOption[]>>((acc, p) => {
      (acc[p.category] ??= []).push(p);
      return acc;
    }, {});
    return (
      <div className="mt-2 rounded-2xl border border-line/70 bg-surface p-3 shadow-card">
        <p className="mb-2 px-1 text-xs text-ink-subtle">
          Which spot are they covering?
        </p>
        <div className="grid gap-3">
          {Object.entries(grouped).map(([category, options]) => (
            <div key={category}>
              <p className="mb-1.5 text-xs font-bold tracking-[0.08em] text-ink-muted uppercase">
                {CATEGORY_LABEL[category] ?? titleCase(category)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {options.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPicking(`pos:${p.id}`)}
                    className="rounded-full border-[0.5px] border-ember px-3 py-1.5 text-xs font-medium text-ember transition-colors hover:bg-ember-soft"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-end border-t border-line pt-2">
          <Button variant="ghost" size="sm" onClick={() => setPicking(null)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  /**
   * The two-step "add team member" flow: pick the spot, then pick the person.
   * It lives outside the slot list because a brand-new set has no slots yet —
   * a slot only exists once somebody is in it.
   */
  const addFlow = () => {
    if (picking === "choose-position") return positionChooser();
    if (picking?.startsWith("pos:")) {
      const positionId = picking.slice(4);
      const existing = slots.find((s) => s.positionId === positionId);
      return picker(
        positionId,
        (memberId) => run(() => assignAction(serviceId, memberId, positionId)),
        existing?.assignments.map((a) => a.teamMemberId) ?? [],
      );
    }
    return null;
  };

  const byCategory = slots.reduce<Record<string, TeamSlotView[]>>((acc, s) => {
    (acc[s.category] ??= []).push(s);
    return acc;
  }, {});

  const totalPeople = slots.reduce((n, s) => n + s.assignments.length, 0);

  return (
    <div className="grid gap-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-clay/30 bg-clay-soft px-3 py-2 text-sm text-clay"
        >
          {error}
        </p>
      ) : null}

      {positions.length === 0 ? (
        <EmptyState
          compact
          icon={<Users className="size-5" />}
          title="No positions set up"
          description="Add the roles you schedule before building a team."
        />
      ) : slots.length === 0 ? (
        <>
          <EmptyState
            compact
            icon={<Users className="size-5" />}
            title="No team yet"
            description="Add the people playing this set and the spot each of them is covering."
          />
          {canEdit ? (
            <div>
              <Button variant="secondary" onClick={() => setPicking("choose-position")}>
                <UserPlus aria-hidden />
                Add team member
              </Button>
              {addFlow()}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-xs text-ink-subtle">
            {totalPeople} {totalPeople === 1 ? "person" : "people"} on this set
          </p>

          {Object.entries(byCategory).map(([category, rows]) => (
            <section key={category}>
              <h3 className="mb-1.5 text-xs font-bold tracking-[0.08em] text-ink-muted uppercase">
                {CATEGORY_LABEL[category] ?? titleCase(category)}
              </h3>
              <ul className="grid gap-1.5">
                {rows.map((slot) => (
                  <li
                    key={slot.positionId}
                    className="rounded-xl border-[0.5px] border-line-strong/60 bg-surface px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                      <span className="w-32 shrink-0 pt-0.5 font-display text-sm font-semibold text-ink">
                        {slot.positionName}
                      </span>

                      <div className="min-w-40 flex-1">
                        {slot.assignments.length === 0 ? (
                          <span className="text-sm text-ink-subtle">Open</span>
                        ) : (
                          <ul className="grid gap-1.5">
                            {slot.assignments.map((a) => (
                              <li key={a.id} className="flex flex-wrap items-start gap-2">
                                <span className="min-w-0 flex-1">
                                  <span className="flex flex-wrap items-center gap-1.5">
                                    <Link
                                      href={`/team/${a.teamMemberId}`}
                                      className="text-sm text-ink hover:text-ember hover:underline"
                                    >
                                      {a.name}
                                    </Link>
                                    <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>
                                      {STATUS_LABEL[a.status] ?? titleCase(a.status)}
                                    </Badge>
                                  </span>
                                  <ConflictList conflicts={a.conflicts} />
                                </span>

                                {canInvite ? (
                                  <InviteButton
                                    serviceId={serviceId}
                                    teamMemberId={a.teamMemberId}
                                    name={a.name}
                                    invited={invites[a.teamMemberId] ?? false}
                                  />
                                ) : null}

                                {canEdit ? (
                                  <span className="flex gap-0.5">
                                    <button
                                      type="button"
                                      aria-label={`Replace ${a.name} on ${slot.positionName}`}
                                      disabled={pending}
                                      onClick={() =>
                                        setPicking(
                                          picking === `swap:${a.id}` ? null : `swap:${a.id}`,
                                        )
                                      }
                                      className="rounded p-1.5 text-ink-subtle hover:bg-sunken hover:text-ink disabled:opacity-30"
                                    >
                                      <Repeat aria-hidden className="size-4" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Remove ${a.name} from ${slot.positionName}`}
                                      disabled={pending}
                                      onClick={() =>
                                        run(() => removeAssignmentAction(serviceId, a.id))
                                      }
                                      className="rounded p-1.5 text-ink-subtle hover:bg-clay-soft hover:text-clay disabled:opacity-30"
                                    >
                                      <X aria-hidden className="size-4" />
                                    </button>
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {canEdit ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            setPicking(
                              picking === slot.positionId ? null : slot.positionId,
                            )
                          }
                        >
                          <UserPlus aria-hidden />
                          Assign
                        </Button>
                      ) : null}
                    </div>

                    {canEdit && picking === slot.positionId
                      ? picker(
                          slot.positionId,
                          (memberId) =>
                            run(() => assignAction(serviceId, memberId, slot.positionId)),
                          slot.assignments.map((a) => a.teamMemberId),
                        )
                      : null}

                    {canEdit
                      ? slot.assignments
                          .filter((a) => picking === `swap:${a.id}`)
                          .map((a) => (
                            <div key={a.id}>
                              {picker(
                                slot.positionId,
                                (memberId) =>
                                  run(() => reassignAction(serviceId, a.id, memberId)),
                                slot.assignments.map((x) => x.teamMemberId),
                              )}
                            </div>
                          ))
                      : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {canEdit ? (
            <div>
              <Button variant="secondary" onClick={() => setPicking("choose-position")}>
                <UserPlus aria-hidden />
                Add team member
              </Button>
              {addFlow()}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

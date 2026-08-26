import { CalendarDays, Clock, FileMusic, Music } from "lucide-react";
import Link from "next/link";

import { RespondButtons } from "@/components/invitations/respond-buttons";
import { Badge } from "@/components/ui/badge";
import {
  InvalidTokenError,
  resolveInvitation,
  type PublicInvitation,
} from "@/lib/data/invitations";
import { formatServiceDate, formatTime } from "@/lib/format";

export const metadata = {
  title: "Your invitation",
  // A bearer link must never be indexed or leaked through a referrer.
  robots: { index: false, follow: false },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-8">
      {children}
    </main>
  );
}

/** Deliberately vague: never reveal whether a token once existed. */
function Unusable({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div className="my-auto text-center">
        <p className="font-display text-2xl text-ink">{title}</p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
          {body}
        </p>
      </div>
    </Shell>
  );
}

const STATUS: Record<string, { label: string; tone: "sage" | "clay" | "amber" | "neutral" }> = {
  ACCEPTED: { label: "You're confirmed", tone: "sage" },
  DECLINED: { label: "You declined", tone: "clay" },
  INVITED: { label: "Awaiting your reply", tone: "amber" },
  PENDING: { label: "Awaiting your reply", tone: "amber" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export default async function InvitationPage({
  params,
}: PageProps<"/r/[token]">) {
  const { token } = await params;

  let invitation: PublicInvitation;
  try {
    invitation = await resolveInvitation(token);
  } catch (e) {
    if (e instanceof InvalidTokenError) {
      return e.reason === "EXPIRED" ? (
        <Unusable
          title="This link has expired"
          body="Invitation links stop working just after the service. Ask your worship leader to send a new one."
        />
      ) : (
        <Unusable
          title="This link isn't valid"
          body="Check you copied the whole link from your message, or ask your worship leader to send it again."
        />
      );
    }
    throw e;
  }

  const status = STATUS[invitation.status] ?? STATUS.PENDING;

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-semibold tracking-wide text-ember uppercase">
          {invitation.churchName}
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight text-ink">
          Hi {invitation.memberName.split(" ")[0]}, you&rsquo;re scheduled
        </h1>
      </header>

      <section className="mb-5 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-start gap-3">
          <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
          <div>
            <p className="font-medium text-ink">
              {formatServiceDate(invitation.date)}
            </p>
            <p className="text-sm text-ink-muted">
              {invitation.serviceTypeName ?? invitation.serviceTitle}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
          <div>
            <p className="text-sm text-ink">
              Service at {formatTime(invitation.startTime)}
            </p>
            {invitation.callTime ? (
              <p className="text-sm font-medium text-ember-ink">
                Be there by {formatTime(invitation.callTime)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <Music aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
          <div>
            <p className="text-sm text-ink">
              {invitation.positions.length > 1 ? "You're playing" : "Your spot"}
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {invitation.positions.map((p) => (
                <Badge key={p} tone="ember">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mb-5 text-center">
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="mb-8">
        <RespondButtons token={token} status={invitation.status} />
      </div>

      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
          The set
        </h2>
        {invitation.songs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line-strong bg-surface/60 px-4 py-6 text-center text-sm text-ink-muted">
            The setlist isn&rsquo;t ready yet. Check back closer to Sunday.
          </p>
        ) : (
          <ol className="grid gap-1.5">
            {invitation.songs.map((s) => (
              <li
                key={s.position}
                className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5"
              >
                <span
                  aria-hidden
                  className="w-5 shrink-0 text-center font-display text-base text-ink-subtle tabular-nums"
                >
                  {s.position}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink">
                    {s.title}
                  </span>
                  {s.artist ? (
                    <span className="block truncate text-xs text-ink-muted">
                      {s.artist}
                    </span>
                  ) : null}
                </span>
                {s.key ? (
                  <span className="shrink-0 rounded-md bg-sunken px-2 py-1 font-display text-sm text-ink">
                    {s.key}
                  </span>
                ) : null}
                {s.hasChart ? (
                  <Link
                    href={`/r/${token}/chart/${s.songId}`}
                    className="shrink-0 text-ink-subtle"
                    aria-label={`Chart for ${s.title}`}
                  >
                    <FileMusic aria-hidden className="size-4" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="mt-8 text-center text-xs text-ink-subtle">
        Sent by {invitation.churchName} · SetMeister
      </footer>
    </Shell>
  );
}

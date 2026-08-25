import { PageHeader } from "@/components/app/shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { requireChurchContext } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { scope } from "@/lib/data/context";
import { formatShortDate, titleCase } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const ctx = await requireChurchContext();
  const messages = await db.message.findMany({
    where: scope(ctx),
    include: { teamMember: true, service: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Invitations, responses and availability requests"
      />
      {messages.length === 0 ? (
        <EmptyState
          title="Nothing sent yet"
          description="When you send invitations, every message and response shows up here so you can see at a glance who still needs to reply."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {messages.map((m) => (
            <li key={m.id} className="flex items-center gap-4 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{m.subject}</p>
                <p className="text-xs text-ink-muted">
                  {m.teamMember?.name ?? m.toEmail}
                  {m.service ? ` · ${formatShortDate(m.service.date)}` : ""}
                </p>
              </div>
              <Badge tone="outline">{titleCase(m.kind)}</Badge>
              <Badge tone={m.status === "SENT" ? "sage" : m.status === "FAILED" ? "clay" : "neutral"}>
                {titleCase(m.status)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

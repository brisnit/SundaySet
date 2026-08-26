"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Copy, Link2, RotateCw } from "lucide-react";

import {
  createInviteLinkAction,
  revokeInviteAction,
} from "@/app/(app)/plan/[serviceId]/team-actions";
import { Button } from "@/components/ui/button";

/**
 * Produces a shareable link the leader pastes into a text message.
 *
 * The raw token exists only in this response — it is never stored and cannot be
 * read back — so the link is shown until dismissed rather than vanishing.
 */
export function InviteButton({
  serviceId,
  teamMemberId,
  name,
  invited,
}: {
  serviceId: string;
  teamMemberId: string;
  name: string;
  invited: boolean;
}) {
  const [pending, start] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const generate = () =>
    start(async () => {
      const result = await createInviteLinkAction(serviceId, teamMemberId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setUrl(result.url ?? null);
      if (result.url) void copy(result.url);
      router.refresh();
    });

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard is blocked in some mobile browsers; the field below is the
      // fallback and is already selectable.
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex gap-1">
        <Button
          variant={invited ? "ghost" : "soft"}
          size="sm"
          disabled={pending}
          onClick={generate}
          aria-label={
            invited
              ? `Generate a new invite link for ${name}, replacing the old one`
              : `Copy invite link for ${name}`
          }
        >
          {invited ? <RotateCw aria-hidden /> : <Link2 aria-hidden />}
          {pending ? "Working…" : invited ? "New link" : "Copy invite link"}
        </Button>

        {invited ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (
                  !confirm(
                    `Revoke ${name}'s invite link? Any link already sent stops working.`,
                  )
                )
                  return;
                const result = await revokeInviteAction(serviceId, teamMemberId);
                setError(result.error ?? null);
                setUrl(null);
                router.refresh();
              })
            }
          >
            Revoke
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-xs text-clay">
          {error}
        </p>
      ) : null}

      {url ? (
        <div className="grid gap-1 rounded-lg border border-ember/30 bg-ember-soft/40 p-2">
          <p className="text-xs text-ink-muted">
            {copied ? "Copied — paste it into a text." : "Copy this link:"}
          </p>
          <div className="flex gap-1">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={`Invite link for ${name}`}
              className="min-w-0 flex-1 rounded border border-line-strong bg-surface px-2 py-1 font-mono text-xs text-ink"
            />
            <Button variant="secondary" size="sm" onClick={() => copy(url)}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            </Button>
          </div>
          <p className="text-xs text-ink-subtle">
            This link is shown once. Generate a new one if you lose it.
          </p>
        </div>
      ) : null}
    </div>
  );
}

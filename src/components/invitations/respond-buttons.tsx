"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";

import { respondAction } from "@/app/(public)/r/[token]/actions";
import { Button } from "@/components/ui/button";

export function RespondButtons({
  token,
  status,
}: {
  token: string;
  status: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const respond = (outcome: "ACCEPTED" | "DECLINED") =>
    start(async () => {
      const result = await respondAction(token, outcome);
      setError(result.error ?? null);
      router.refresh();
    });

  const answered = status === "ACCEPTED" || status === "DECLINED";

  return (
    <div className="grid gap-3">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-clay/30 bg-clay-soft px-3 py-2 text-sm text-clay"
        >
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          disabled={pending}
          onClick={() => respond("ACCEPTED")}
          aria-pressed={status === "ACCEPTED"}
          className={status === "ACCEPTED" ? "ring-2 ring-sage" : undefined}
        >
          <Check aria-hidden />
          {status === "ACCEPTED" ? "You're in" : "Accept"}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          disabled={pending}
          onClick={() => respond("DECLINED")}
          aria-pressed={status === "DECLINED"}
          className={status === "DECLINED" ? "ring-2 ring-clay" : undefined}
        >
          <X aria-hidden />
          {status === "DECLINED" ? "Can't make it" : "Decline"}
        </Button>
      </div>

      {answered ? (
        <p className="text-center text-xs text-ink-subtle">
          Changed your mind? Tap the other option and your worship leader will
          see the update.
        </p>
      ) : null}
    </div>
  );
}

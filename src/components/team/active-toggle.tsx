"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, UserMinus } from "lucide-react";

import { setActiveAction } from "@/app/(app)/team/actions";
import { Button } from "@/components/ui/button";

export function ActiveToggle({
  teamMemberId,
  active,
  name,
}: {
  teamMemberId: string;
  active: boolean;
  name: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setActiveAction(teamMemberId, !active);
          router.refresh();
        })
      }
      // Deactivating keeps every past assignment; it only stops future
      // scheduling, so it needs no confirmation.
      aria-label={
        active ? `Mark ${name} as not currently serving` : `Mark ${name} as serving`
      }
    >
      {active ? <UserMinus aria-hidden /> : <UserCheck aria-hidden />}
      {pending ? "Saving…" : active ? "Mark inactive" : "Mark active"}
    </Button>
  );
}

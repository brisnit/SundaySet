"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { deleteSongAction, retireSongAction } from "@/app/(app)/songs/actions";

export function SongActions({
  songId,
  retired,
}: {
  songId: string;
  retired: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await retireSongAction(songId, !retired);
            router.refresh();
          })
        }
      >
        {retired ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
        {retired ? "Restore" : "Retire"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          // Deleting loses the play history that repeat protection depends on,
          // so retiring is the reversible option we steer people toward.
          if (
            !confirm(
              "Delete this song and its play history? Retiring keeps the history and is reversible.",
            )
          )
            return;
          start(() => deleteSongAction(songId));
        }}
      >
        <Trash2 aria-hidden />
        Delete
      </Button>
    </div>
  );
}

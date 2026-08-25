"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";

import { addFromCatalogAction } from "@/app/(app)/songs/actions";
import { Button } from "@/components/ui/button";

export function AddFromCatalog({
  catalogSongId,
  inLibrary,
  size = "sm",
}: {
  catalogSongId: string;
  inLibrary: boolean;
  size?: "sm" | "md";
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  if (inLibrary) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-sage">
        <Check aria-hidden className="size-3.5" />
        In your songs
      </span>
    );
  }

  return (
    <Button
      variant="soft"
      size={size}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await addFromCatalogAction(catalogSongId);
          router.refresh();
        })
      }
    >
      <Plus aria-hidden />
      {pending ? "Adding…" : "Add to My Songs"}
    </Button>
  );
}

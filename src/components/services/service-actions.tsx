"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteServiceAction } from "@/app/(app)/plan/actions";
import { Button } from "@/components/ui/button";

export function DeleteServiceButton({
  serviceId,
  label,
}: {
  serviceId: string;
  label: string;
}) {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Delete ${label}? Its setlist and any team assignments go with it. This cannot be undone.`,
          )
        )
          return;
        start(() => deleteServiceAction(serviceId));
      }}
    >
      <Trash2 aria-hidden />
      {pending ? "Deleting…" : "Delete service"}
    </Button>
  );
}

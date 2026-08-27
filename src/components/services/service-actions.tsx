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
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `Delete ${label}? Its songs and team go with it. This cannot be undone.`,
          )
        )
          return;
        start(() => deleteServiceAction(serviceId));
      }}
    >
      <Trash2 aria-hidden />
      {pending ? "Deleting…" : "Delete set"}
    </Button>
  );
}

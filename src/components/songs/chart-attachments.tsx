"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Upload } from "lucide-react";

import {
  deleteAttachmentAction,
  uploadChartPdfAction,
  type FormState,
} from "@/app/(app)/songs/actions";
import { Button } from "@/components/ui/button";

export type Attachment = {
  id: string;
  url: string;
  filename: string;
  sizeBytes: number;
};

export function ChartAttachments({
  songId,
  attachments,
  canManage,
  storageNote,
}: {
  songId: string;
  attachments: Attachment[];
  canManage: boolean;
  storageNote: string | null;
}) {
  const upload = uploadChartPdfAction.bind(null, songId);
  const [state, action, pending] = useActionState(upload, {} as FormState);
  const [removing, startRemove] = useTransition();
  const router = useRouter();

  return (
    <div className="grid gap-3">
      {attachments.length > 0 ? (
        <ul className="grid gap-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-line px-3 py-2"
            >
              <FileText aria-hidden className="size-4 shrink-0 text-ink-subtle" />
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-ember hover:underline"
              >
                {a.filename}
              </a>
              <span className="text-xs text-ink-subtle">
                {(a.sizeBytes / 1024).toFixed(0)} KB
              </span>
              {canManage ? (
                <button
                  type="button"
                  aria-label={`Remove ${a.filename}`}
                  disabled={removing}
                  onClick={() =>
                    startRemove(async () => {
                      await deleteAttachmentAction(songId, a.id);
                      router.refresh();
                    })
                  }
                  className="text-ink-subtle hover:text-clay"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canManage ? (
        <form action={action} className="grid gap-2">
          {state.error ? (
            <p role="alert" className="text-xs text-clay">
              {state.error}
            </p>
          ) : null}
          <label
            htmlFor="chart-pdf"
            className="text-xs font-medium text-ink-muted"
          >
            Upload a PDF chart
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="chart-pdf"
              name="file"
              type="file"
              accept="application/pdf"
              required
              className="min-w-0 flex-1 text-xs text-ink-muted file:mr-3 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-1.5 file:text-xs file:text-ink"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={pending}>
              <Upload aria-hidden />
              {pending ? "Uploading…" : "Upload"}
            </Button>
          </div>
          <p className="text-xs text-ink-subtle">
            PDF, up to 8MB.{storageNote ? ` ${storageNote}` : ""}
          </p>
        </form>
      ) : null}

      {attachments.length === 0 && !canManage ? (
        <p className="text-sm text-ink-muted">No chart uploaded.</p>
      ) : null}
    </div>
  );
}

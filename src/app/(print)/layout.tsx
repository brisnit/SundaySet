import type * as React from "react";

/**
 * Bare layout for print-destined pages.
 *
 * Deliberately outside the (app) group: a chord chart on a music stand should
 * carry no navigation, no avatar and no chrome — just the song. Pages here
 * still call requireChurchContext() themselves, so dropping the shell drops no
 * authorization.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-paper">{children}</div>;
}

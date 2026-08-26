import type * as React from "react";

/**
 * Bare shell for public, unauthenticated pages.
 *
 * No navigation, no account chrome — a musician opening a link from a text
 * message has no session and nothing to navigate to.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-paper">{children}</div>;
}

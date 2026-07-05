import type { ReactNode } from "react";

import { AppSidebar, type NavKey } from "@/components/AppSidebar";

/**
 * Shared left-sidebar + main-content shell for the authenticated surfaces.
 * The sidebar sticks to the top of the viewport as the page scrolls; the main
 * area is a plain flex child so each page controls its own scroll behavior
 * (e.g. the chat page pins its own height for an internally-scrolling panel).
 */
export function AppShell({
  current,
  children,
}: {
  current?: NavKey;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-white dark:bg-neutral-950 md:flex-row">
      <AppSidebar current={current} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

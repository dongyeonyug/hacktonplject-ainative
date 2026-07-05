"use client";

import { useState, type ReactNode } from "react";

/**
 * Client-only shell around the (server-rendered) sidebar content: renders the
 * sidebar as a sticky column on desktop and as an off-canvas drawer opened via
 * a hamburger button below the `md` breakpoint. Sidebar content itself is
 * passed in as `children` so data fetching (user/admin lookup) stays on the
 * server in AppSidebar.
 */
export function SidebarMobileToggle({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4 dark:border-neutral-800 dark:bg-neutral-950 md:hidden">
        <span className="text-base font-bold text-neutral-900 dark:text-neutral-50">
          마음곁
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="메뉴 열기"
          aria-expanded={open}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 dark:border-neutral-700 dark:text-neutral-200"
        >
          ☰
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-dvh w-60 shrink-0 transform border-r border-neutral-200 bg-white transition-transform duration-200 dark:border-neutral-800 dark:bg-neutral-950 md:sticky md:top-0 md:left-auto md:z-auto md:h-dvh md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {children}
      </aside>
    </>
  );
}

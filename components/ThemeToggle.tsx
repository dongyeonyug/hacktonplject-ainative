"use client";

import { useEffect, useState } from "react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { SunIcon, MoonIcon } from "@/components/icons";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Light/dark switch for the 화면 설정 settings tab. Reads the class the
 * blocking init script (lib/theme.ts) already applied to <html> so there is
 * no flash, then persists any manual change to localStorage.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  if (!theme) {
    return <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />;
  }

  return (
    <div className="flex rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
      <button
        type="button"
        onClick={() => {
          setTheme("light");
          applyTheme("light");
        }}
        aria-pressed={theme === "light"}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition ${
          theme === "light"
            ? "bg-indigo-600 text-white"
            : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        }`}
      >
        <SunIcon className="h-4 w-4" />
        라이트
      </button>
      <button
        type="button"
        onClick={() => {
          setTheme("dark");
          applyTheme("dark");
        }}
        aria-pressed={theme === "dark"}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition ${
          theme === "dark"
            ? "bg-indigo-600 text-white"
            : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        }`}
      >
        <MoonIcon className="h-4 w-4" />
        다크
      </button>
    </div>
  );
}

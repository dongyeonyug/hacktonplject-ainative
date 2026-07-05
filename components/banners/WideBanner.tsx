"use client";

import { useState } from "react";

import type { PromoBannerData } from "@/lib/dummy/promoBanners";
import { XIcon, BriefcaseIcon, UsersIcon, ShieldIcon } from "@/components/icons";

// Keyed by promo id rather than accepted as a prop: React component
// functions can't cross the Server->Client boundary as props (RSC only
// allows serializable data + Server Actions), so the icon choice lives here.
const PROMO_ICONS = {
  "promo-1": BriefcaseIcon,
  "promo-2": UsersIcon,
  "promo-3": ShieldIcon,
} as const;

/**
 * Full-width horizontal promo banner (16:5~16:6 desktop ratio) for the
 * 맞춤 정보 page — visually distinct from the vertical institution cards but
 * still reads as an in-service recommendation, not a third-party ad. Clicking
 * opens a dummy detail modal since there is no real program backend yet.
 */
export function WideBanner({ data }: { data: PromoBannerData }) {
  const [open, setOpen] = useState(false);
  const Icon = PROMO_ICONS[data.id as keyof typeof PROMO_ICONS] ?? BriefcaseIcon;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative flex w-full items-center gap-5 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-5 text-left transition hover:border-indigo-200 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-neutral-950 dark:to-sky-950/20 sm:p-6 md:aspect-[16/6] md:items-center"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">
              {data.label}
            </span>
            <span className="text-xs text-neutral-400">{data.deadline}</span>
          </div>
          <h3 className="text-lg font-bold">{data.title}</h3>
          <p className="max-w-lg text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            {data.description}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {data.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-black/20 dark:text-neutral-300"
              >
                {t}
              </span>
            ))}
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {data.benefit}
            </span>
          </div>
          <span className="inline-block pt-1 text-sm font-semibold text-indigo-600 group-hover:underline dark:text-indigo-400">
            {data.buttonLabel} →
          </span>
        </div>

        <div className="relative hidden shrink-0 sm:block">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-200/40 dark:bg-indigo-900/30" />
          <div className="absolute -bottom-6 -right-8 h-16 w-16 rounded-full bg-sky-200/40 dark:bg-sky-900/30" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-indigo-500 shadow-sm dark:bg-neutral-900 dark:text-indigo-300">
            <Icon className="h-9 w-9" />
          </div>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-950">
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">
                {data.label}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <h3 className="text-lg font-bold">{data.title}</h3>
            <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {data.detail}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  {t}
                </span>
              ))}
            </div>
            <p className="text-xs text-neutral-400">{data.deadline}</p>
          </div>
        </div>
      )}
    </>
  );
}

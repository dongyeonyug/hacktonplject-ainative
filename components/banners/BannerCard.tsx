import type { ComponentType } from "react";

import type { IconProps } from "@/components/icons";
import { SparkleBadgeIcon } from "@/components/icons";

export type BannerAccent = "blue" | "purple" | "mint";

const ACCENT_STYLES: Record<
  BannerAccent,
  { card: string; iconWrap: string; deco: string; tag: string }
> = {
  blue: {
    card: "border-sky-100 bg-gradient-to-br from-sky-50 to-white dark:border-sky-900/50 dark:from-sky-950/30 dark:to-neutral-950",
    iconWrap: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300",
    deco: "bg-sky-200/50 dark:bg-sky-900/30",
    tag: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
  },
  purple: {
    card: "border-indigo-100 bg-gradient-to-br from-indigo-50 to-white dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-neutral-950",
    iconWrap: "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
    deco: "bg-indigo-200/50 dark:bg-indigo-900/30",
    tag: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
  },
  mint: {
    card: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-neutral-950",
    iconWrap: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300",
    deco: "bg-emerald-200/50 dark:bg-emerald-900/30",
    tag: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
};

export interface BannerCardProps {
  accent: BannerAccent;
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
  tag?: string;
  meta?: string;
  statusLabel?: string;
  statusVariant?: "pending" | "done";
  primaryLabel: string;
  onPrimaryClick?: () => void;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  footNote?: string;
  large?: boolean;
}

/**
 * Wide banner-style card shared by the 자가진단 hub (상시 진단 / 정기 설문)
 * and any future promo surfaces — one presentational component so new
 * banners only need new data, not new layout code.
 */
export function BannerCard({
  accent,
  icon: Icon,
  title,
  description,
  tag,
  meta,
  statusLabel,
  statusVariant = "pending",
  primaryLabel,
  onPrimaryClick,
  secondaryLabel,
  onSecondaryClick,
  footNote,
  large = false,
}: BannerCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className={`relative flex items-center gap-6 overflow-hidden rounded-2xl border p-6 ${styles.card} ${
        large ? "sm:p-8" : ""
      }`}
    >
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {tag && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles.tag}`}>
              {tag}
            </span>
          )}
          {statusLabel && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                statusVariant === "done"
                  ? "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              }`}
            >
              {statusLabel}
            </span>
          )}
          {meta && <span className="text-xs text-neutral-400">{meta}</span>}
        </div>

        <h3 className={large ? "text-xl font-bold" : "text-base font-semibold"}>{title}</h3>
        <p className="max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onPrimaryClick}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            {primaryLabel}
          </button>
          {secondaryLabel && (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {secondaryLabel}
            </button>
          )}
        </div>

        {footNote && <p className="pt-1 text-xs text-neutral-400">{footNote}</p>}
      </div>

      <div className="relative hidden shrink-0 sm:block">
        <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${styles.deco}`} />
        <div className={`absolute -bottom-6 -right-8 h-16 w-16 rounded-full ${styles.deco}`} />
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${styles.iconWrap}`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <SparkleBadgeIcon className={`absolute -left-3 -top-1 h-4 w-4 ${styles.iconWrap.split(" ")[1]}`} />
      </div>
    </div>
  );
}

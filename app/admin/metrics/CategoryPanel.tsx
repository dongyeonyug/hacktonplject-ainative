"use client";

import { useState } from "react";

export type CategoryItem = { label: string; count: number; tone: string };

type ViewMode = "numbers" | "bars";

// Tailwind JIT는 정적 클래스만 인식하므로 `bg-${tone}-500` 보간 금지 → 룩업 사용.
const TONE_BAR: Record<string, string> = {
  indigo: "bg-indigo-500",
  sky: "bg-sky-500",
  cyan: "bg-cyan-500",
  teal: "bg-teal-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  neutral: "bg-neutral-400",
};

interface CategoryPanelProps {
  title: string;
  items: CategoryItem[];
  /** 헤더에 표시할 뱃지 (예: "샘플 데이터"). */
  badge?: string;
  /** 초기 뷰 모드. */
  defaultView?: ViewMode;
  /** 막대 뷰 상단 설명 문구. */
  caption?: string;
}

/**
 * 감정/니즈 카테고리 등 `{label, count, tone}` 목록을 "숫자 그리드"와
 * "가로 막대 랭킹" 두 형식으로 전환해 보여주는 클라이언트 위젯.
 *
 * 서버 컴포넌트(page.tsx)는 데이터 fetch/집계만 하고, 직렬화된 items만
 * props로 넘긴다. 토글 상태는 각 패널이 독립적으로 소유한다.
 */
export function CategoryPanel({
  title,
  items,
  badge,
  defaultView = "numbers",
  caption,
}: CategoryPanelProps) {
  const [view, setView] = useState<ViewMode>(defaultView);

  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(1, ...items.map((item) => item.count));
  const ranked = [...items].sort((a, b) => b.count - a.count);

  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{title}</h2>
          {badge ? (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {badge}
            </span>
          ) : null}
        </div>
        <div
          role="group"
          aria-label={`${title} 보기 방식`}
          className="inline-flex rounded-lg border border-neutral-200 p-0.5 text-xs dark:border-neutral-700"
        >
          <button
            type="button"
            aria-pressed={view === "numbers"}
            onClick={() => setView("numbers")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              view === "numbers"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            숫자로 보기
          </button>
          <button
            type="button"
            aria-pressed={view === "bars"}
            onClick={() => setView("bars")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              view === "bars"
                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
            }`}
          >
            막대그래프로 보기
          </button>
        </div>
      </div>

      {view === "bars" && caption ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{caption}</p>
      ) : null}

      {view === "numbers" ? (
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900"
            >
              <span>{item.label}</span>
              <span className="font-semibold">{item.count.toLocaleString("ko-KR")}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {ranked.map((item, i) => {
            const barPct = (item.count / max) * 100;
            const sharePct = total > 0 ? (item.count / total) * 100 : 0;
            return (
              <li key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-4 text-xs tabular-nums text-neutral-400">{i + 1}</span>
                    <span className="font-medium">{item.label}</span>
                  </span>
                  <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                    {item.count.toLocaleString("ko-KR")}건 · {sharePct.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className={`h-full rounded-full ${TONE_BAR[item.tone] ?? TONE_BAR.neutral}`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

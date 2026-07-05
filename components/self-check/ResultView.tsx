import Link from "next/link";

import type { CheckResult } from "@/lib/selfCheck/types";
import { CheckIcon } from "@/components/icons";

export function ResultView({
  result,
  onRetake,
}: {
  result: CheckResult;
  onRetake: () => void;
}) {
  const levelStyle =
    result.level === "high"
      ? "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
      : result.level === "medium"
        ? "border-sky-200 bg-sky-50 dark:border-sky-900/50 dark:bg-sky-950/20"
        : "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <div
        className={`space-y-3 rounded-2xl border p-6 ${
          result.level ? levelStyle : "border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/20"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
            <CheckIcon className="h-3 w-3" />
          </span>
          결과가 나왔어요
        </div>
        <h2 className="text-xl font-bold">{result.title}</h2>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          {result.summary}
        </p>
        {result.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {result.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-black/20 dark:text-neutral-200"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        {result.disclaimer && (
          <p className="text-xs text-neutral-400">{result.disclaimer}</p>
        )}
      </div>

      {result.recommendations && result.recommendations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.recommendations.map((r) => (
            <Link
              key={r.href}
              href={r.href}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              {r.label}
            </Link>
          ))}
        </div>
      )}

      <p className="rounded-lg bg-neutral-50 px-4 py-2.5 text-xs text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
        내 기록에 저장됨 — 설정 &gt; 내 기록 &gt; 자가진단 결과에서 다시 볼 수 있어요.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/self-check"
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          자가진단 목록으로
        </Link>
        <button
          type="button"
          onClick={onRetake}
          className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          다시 검사하기
        </button>
      </div>
    </div>
  );
}

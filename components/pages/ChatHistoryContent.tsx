"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CHAT_HISTORY, categoryLabel } from "@/lib/dummy/chatHistory";

type SortMode = "newest" | "oldest" | "category";

const SORT_LABELS: Record<SortMode, string> = {
  newest: "최신순",
  oldest: "오래된 순",
  category: "고민 유형별",
};

const dateFmt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" });

/**
 * Standalone "내 대화 기록" content — dummy data only (lib/dummy/chatHistory.ts).
 * Intended to be dropped into a route later; wiring to real conversation
 * history is future work.
 */
export function ChatHistoryContent() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CHAT_HISTORY;
    return CHAT_HISTORY.filter((entry) => {
      const haystack = [entry.title, entry.preview, categoryLabel(entry.category), ...entry.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort === "newest") {
      list.sort((a, b) => b.date.localeCompare(a.date));
    } else if (sort === "oldest") {
      list.sort((a, b) => a.date.localeCompare(b.date));
    } else {
      list.sort((a, b) => categoryLabel(a.category).localeCompare(categoryLabel(b.category), "ko"));
    }
    return list;
  }, [filtered, sort]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">내 대화 기록</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          이전에 나눈 대화와 상담 내용을 다시 확인할 수 있어요.
        </p>
      </header>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목, 키워드, 태그로 검색"
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 sm:max-w-xs"
        />
        <div className="flex gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-700">
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSort(mode)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                sort === mode
                  ? "bg-indigo-600 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              }`}
            >
              {SORT_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            검색 결과가 없어요. 다른 키워드로 찾아보세요.
          </p>
        )}
        {sorted.map((entry) => (
          <div
            key={entry.id}
            className="space-y-2 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-semibold">{entry.title}</h2>
              <span className="shrink-0 text-xs text-neutral-400">
                {dateFmt.format(new Date(entry.date))}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">
              {entry.preview}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                {categoryLabel(entry.category)}
              </span>
              {entry.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  #{t}
                </span>
              ))}
            </div>
            <Link
              href="/chat"
              className="inline-block rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              대화 다시 보기
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatHistoryContent;

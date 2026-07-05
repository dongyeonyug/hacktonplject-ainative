"use client";

import { useState } from "react";

type Mood = "great" | "good" | "okay" | "hard";

interface CalendarDayEntry {
  date: string; // "YYYY-MM-DD"
  mood: Mood;
  routineCount: number;
  note?: string;
}

const MOOD_LABELS: Record<Mood, string> = {
  great: "아주 좋음",
  good: "좋음",
  okay: "보통",
  hard: "힘들었음",
};

const MOOD_EMOJI: Record<Mood, string> = {
  great: "😄",
  good: "🙂",
  okay: "😐",
  hard: "😔",
};

/** Dummy data — replace with a real query once this is wired into routing. */
const DUMMY_ENTRIES: CalendarDayEntry[] = [
  { date: "2026-07-01", mood: "good", routineCount: 2 },
  { date: "2026-07-02", mood: "okay", routineCount: 1 },
  {
    date: "2026-07-03",
    mood: "hard",
    routineCount: 0,
    note: "면접 결과 발표일이라 긴장됐어요.",
  },
  { date: "2026-07-04", mood: "great", routineCount: 3 },
  { date: "2026-07-05", mood: "good", routineCount: 2 },
];

/**
 * Standalone calendar content component (dummy data only).
 * Intended to be dropped into a route/layout later — no sidebar, app shell,
 * or routing logic here.
 */
export function CalendarContent() {
  const [selectedDate, setSelectedDate] = useState<string>(
    DUMMY_ENTRIES[DUMMY_ENTRIES.length - 1].date,
  );

  const selectedEntry = DUMMY_ENTRIES.find((e) => e.date === selectedDate) ?? null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">기분 캘린더</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          날짜를 눌러 그날의 기분과 루틴 기록을 확인해보세요. (예시 데이터)
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {DUMMY_ENTRIES.map((entry) => (
          <li key={entry.date}>
            <button
              type="button"
              onClick={() => setSelectedDate(entry.date)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-left transition ${
                selectedDate === entry.date
                  ? "border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40"
                  : "border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              }`}
            >
              <span className="text-sm">{entry.date}</span>
              <span className="flex items-center gap-2 text-sm">
                <span aria-hidden>{MOOD_EMOJI[entry.mood]}</span>
                <span className="text-neutral-500 dark:text-neutral-400">
                  루틴 {entry.routineCount}개
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selectedEntry && (
        <section className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">{selectedEntry.date}</h2>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {MOOD_EMOJI[selectedEntry.mood]} {MOOD_LABELS[selectedEntry.mood]}
            </span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            {selectedEntry.note ?? "이 날은 별도로 남긴 메모가 없어요."}
          </p>
        </section>
      )}
    </div>
  );
}

export default CalendarContent;

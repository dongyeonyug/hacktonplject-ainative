"use client";

import { useMemo, useState } from "react";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  CalendarIcon,
  CheckIcon,
  SmileIcon,
  ClipboardListIcon,
  FileTextIcon,
  QuoteIcon,
} from "@/components/icons";

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

const ENTRY_BY_DATE = new Map(DUMMY_ENTRIES.map((e) => [e.date, e]));

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface DayCell {
  day: number;
  key: string;
}

function toKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number): (DayCell | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (DayCell | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: toKey(year, month, day) });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (DayCell | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

const INITIAL_DATE = DUMMY_ENTRIES[DUMMY_ENTRIES.length - 1].date;
const [INITIAL_YEAR, INITIAL_MONTH] = INITIAL_DATE.split("-").map(Number);

/**
 * Standalone calendar content component (dummy data only).
 * Intended to be dropped into a route/layout later — no sidebar, app shell,
 * or routing logic here.
 */
export function CalendarContent() {
  const [viewYear, setViewYear] = useState(INITIAL_YEAR);
  const [viewMonth, setViewMonth] = useState(INITIAL_MONTH - 1);
  const [selectedDate, setSelectedDate] = useState<string>(INITIAL_DATE);

  const weeks = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const selectedEntry = ENTRY_BY_DATE.get(selectedDate) ?? null;

  function goToMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function goToToday() {
    setViewYear(INITIAL_YEAR);
    setViewMonth(INITIAL_MONTH - 1);
    setSelectedDate(INITIAL_DATE);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">기분 캘린더</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          날짜를 눌러 그날의 기분과 루틴 기록을 확인해보세요. (예시 데이터)
        </p>
      </header>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label="이전 달"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ChevronLeftIcon />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToToday}
              aria-label="오늘로 이동"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <span className="whitespace-nowrap text-base font-semibold">
              {viewYear}년 {viewMonth + 1}월
            </span>
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-neutral-400" />
          </div>

          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label="다음 달"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <ChevronRightIcon />
          </button>
        </div>

        <div className="grid grid-cols-7 border-t border-neutral-100 px-3 py-2 text-center text-xs font-medium dark:border-neutral-800">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className={
                i === 0
                  ? "text-rose-500"
                  : i === 6
                    ? "text-sky-500"
                    : "text-neutral-400 dark:text-neutral-500"
              }
            >
              {w}
            </span>
          ))}
        </div>

        <div className="space-y-1 px-3 pb-3">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) => {
                if (!cell) return <div key={ci} className="h-16" />;
                const entry = ENTRY_BY_DATE.get(cell.key);
                const selected = cell.key === selectedDate;
                const dateColor =
                  ci === 0
                    ? "text-rose-500"
                    : ci === 6
                      ? "text-sky-500"
                      : "text-neutral-800 dark:text-neutral-200";
                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelectedDate(cell.key)}
                    className={`flex h-16 flex-col items-center justify-start gap-0.5 rounded-lg border pt-1.5 text-sm transition ${
                      selected
                        ? "border-indigo-400 bg-indigo-50/70 dark:border-indigo-600 dark:bg-indigo-950/30"
                        : "border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <span
                      className={
                        selected
                          ? "font-semibold text-indigo-600 dark:text-indigo-300"
                          : dateColor
                      }
                    >
                      {cell.day}
                    </span>
                    {entry && (
                      <>
                        <span aria-hidden className="text-sm leading-none">
                          {MOOD_EMOJI[entry.mood]}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                          루틴 {entry.routineCount}개
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/40">
              <CalendarIcon className="h-4 w-4" />
            </span>
            <h2 className="font-semibold">{selectedDate}</h2>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
            <CheckIcon /> 선택된 날짜
          </span>
        </div>

        <div className="grid grid-cols-3 divide-x divide-neutral-100 dark:divide-neutral-800">
          <div className="flex flex-col items-center gap-1.5 px-2 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-950/30">
              <SmileIcon className="h-5 w-5" />
            </span>
            <span className="text-xs text-neutral-400">기분</span>
            <span className="text-sm font-medium">
              {selectedEntry
                ? `${MOOD_EMOJI[selectedEntry.mood]} ${MOOD_LABELS[selectedEntry.mood]}`
                : "기록 없음"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-500 dark:bg-sky-950/30">
              <ClipboardListIcon className="h-5 w-5" />
            </span>
            <span className="text-xs text-neutral-400">루틴</span>
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-300">
              {selectedEntry ? `루틴 ${selectedEntry.routineCount}개` : "-"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-500 dark:bg-violet-950/30">
              <FileTextIcon className="h-5 w-5" />
            </span>
            <span className="text-xs text-neutral-400">메모</span>
            <span className="text-sm font-medium">
              {selectedEntry?.note ? "있음" : "-"}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl bg-neutral-50 px-4 py-3 text-sm text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
          <QuoteIcon className="mt-1 h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
          <p>{selectedEntry?.note ?? "이 날은 별도로 남긴 메모가 없어요."}</p>
        </div>
      </section>
    </div>
  );
}

export default CalendarContent;

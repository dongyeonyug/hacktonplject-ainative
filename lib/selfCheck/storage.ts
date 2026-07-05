import type { CheckProgress, AnswerValue } from "./types";

const STORAGE_KEY = "maeumgyeot:selfcheck:v1";

type StoredState = Record<string, CheckProgress>;

function readAll(): StoredState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredState) : {};
  } catch {
    return {};
  }
}

function writeAll(state: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort only — a full/blocked localStorage must never crash the UI.
  }
}

export function getProgress(testId: string): CheckProgress | null {
  return readAll()[testId] ?? null;
}

export function saveProgress(
  testId: string,
  answers: Record<string, AnswerValue>,
  currentIndex: number,
): void {
  const all = readAll();
  all[testId] = {
    status: "in_progress",
    answers,
    currentIndex,
    updatedAt: new Date().toISOString(),
  };
  writeAll(all);
}

export function completeCheck(testId: string, answers: Record<string, AnswerValue>): void {
  const all = readAll();
  const now = new Date().toISOString();
  all[testId] = {
    status: "completed",
    answers,
    currentIndex: 0,
    updatedAt: now,
    completedAt: now,
  };
  writeAll(all);
}

export function resetCheck(testId: string): void {
  const all = readAll();
  delete all[testId];
  writeAll(all);
}

export function listCompleted(): { testId: string; progress: CheckProgress }[] {
  return Object.entries(readAll())
    .filter(([, p]) => p.status === "completed")
    .map(([testId, progress]) => ({ testId, progress }));
}

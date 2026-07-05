"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { CheckDefinition, AnswerValue } from "@/lib/selfCheck/types";
import { computeResult } from "@/lib/selfCheck/scoring";
import { getProgress, saveProgress, completeCheck, resetCheck } from "@/lib/selfCheck/storage";
import { QuestionInput } from "@/components/self-check/QuestionInput";
import { ResultView } from "@/components/self-check/ResultView";
import { ChevronLeftIcon, CheckIcon } from "@/components/icons";

export function SurveyRunner({ def }: { def: CheckDefinition }) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [saveNotice, setSaveNotice] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Resume from localStorage on mount (client-only — nothing to render server-side here).
  useEffect(() => {
    const progress = getProgress(def.id);
    if (progress) {
      setAnswers(progress.answers);
      setIndex(Math.min(progress.currentIndex, def.questions.length - 1));
      setCompleted(progress.status === "completed");
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id]);

  const total = def.questions.length;
  const question = def.questions[index];
  const value = answers[question?.id];

  const canAdvance = useMemo(() => {
    if (!question) return false;
    if (question.type === "text") return true;
    if (question.type === "multi") return Array.isArray(value) && value.length > 0;
    return typeof value === "string" && value.length > 0;
  }, [question, value]);

  function flashSaveNotice() {
    setSaveNotice(true);
    window.setTimeout(() => setSaveNotice(false), 1800);
  }

  function persist(nextAnswers: Record<string, AnswerValue>, nextIndex: number) {
    saveProgress(def.id, nextAnswers, nextIndex);
    flashSaveNotice();
  }

  function handleAnswer(v: AnswerValue) {
    const next = { ...answers, [question.id]: v };
    setAnswers(next);
    persist(next, index);
  }

  function handleNext() {
    if (index < total - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      persist(answers, nextIndex);
    } else {
      completeCheck(def.id, answers);
      setCompleted(true);
    }
  }

  function handlePrev() {
    if (index === 0) return;
    const prevIndex = index - 1;
    setIndex(prevIndex);
    persist(answers, prevIndex);
  }

  function handleRetake() {
    resetCheck(def.id);
    setAnswers({});
    setIndex(0);
    setCompleted(false);
  }

  if (!hydrated) {
    return <div className="mx-auto w-full max-w-xl px-4 py-10" />;
  }

  if (completed) {
    const result = computeResult(def, answers);
    return <ResultView result={result} onRetake={handleRetake} />;
  }

  const progressPct = Math.round(((index + 1) / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
      <header className="space-y-3">
        <Link
          href="/self-check"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          자가진단으로
        </Link>
        <div>
          <h1 className="text-xl font-bold">{def.title}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{def.description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span>{def.duration}</span>
          <span>
            {index + 1} / {total} 문항
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div
          className={`flex items-center gap-1.5 text-xs text-emerald-600 transition-opacity dark:text-emerald-400 ${
            saveNotice ? "opacity-100" : "opacity-0"
          }`}
        >
          <CheckIcon className="h-3 w-3" />
          응답이 자동 저장되었습니다.
        </div>
      </header>

      <div className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
        <p className="text-base font-semibold">{question.text}</p>
        <QuestionInput question={question} value={value} onChange={handleAnswer} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={index === 0}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            이전
          </button>
          <button
            type="button"
            onClick={() => persist(answers, index)}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            임시 저장
          </button>
        </div>
        <div className="flex gap-2">
          <Link
            href="/self-check"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 transition hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            설문 나가기
          </Link>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {index < total - 1 ? "다음" : "완료하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

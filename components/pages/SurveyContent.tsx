"use client";

import { useState } from "react";

interface SurveyQuestion {
  id: string;
  text: string;
}

/** Dummy questions — replace with the real check-in question set later. */
const QUESTIONS: SurveyQuestion[] = [
  { id: "q1", text: "오늘 하루 전반적인 기분은 어땠나요?" },
  { id: "q2", text: "최근 일주일간 불안감을 얼마나 자주 느꼈나요?" },
  { id: "q3", text: "잠은 잘 주무시고 있나요?" },
  { id: "q4", text: "구직 활동에 대해 얼마나 부담을 느끼나요?" },
  { id: "q5", text: "주변 사람들과의 교류에 얼마나 만족하나요?" },
];

const SCALE = [1, 2, 3, 4, 5];

/**
 * Standalone survey content component (dummy data + local-only submit).
 * Intended to be dropped into a route/layout later — no sidebar, app shell,
 * or routing logic here.
 */
export function SurveyContent() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = QUESTIONS.every((q) => answers[q.id] != null);
  const answeredValues = Object.values(answers);
  const average =
    answeredValues.reduce((sum, v) => sum + v, 0) / (answeredValues.length || 1);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">간단 마음 체크</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          1(전혀 아니다) ~ 5(매우 그렇다) 중 선택해주세요. (예시 설문)
        </p>
      </header>

      {submitted ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900 dark:bg-emerald-950/20">
          <h2 className="font-semibold">제출 완료</h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            평균 응답 점수: {average.toFixed(1)} / 5 (예시 결과이며 실제 분석 로직은
            연결 전입니다.)
          </p>
        </section>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="flex flex-col gap-5"
        >
          {QUESTIONS.map((q) => (
            <fieldset key={q.id} className="space-y-2">
              <legend className="text-sm font-medium">{q.text}</legend>
              <div className="flex gap-3">
                {SCALE.map((value) => (
                  <label
                    key={value}
                    className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border text-sm transition ${
                      answers[q.id] === value
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-neutral-200 dark:border-neutral-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={value}
                      className="sr-only"
                      checked={answers[q.id] === value}
                      onChange={() =>
                        setAnswers((prev) => ({ ...prev, [q.id]: value }))
                      }
                    />
                    {value}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <button
            type="submit"
            disabled={!allAnswered}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            제출하기
          </button>
        </form>
      )}
    </div>
  );
}

export default SurveyContent;

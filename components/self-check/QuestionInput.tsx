"use client";

import type { AnswerValue, Question } from "@/lib/selfCheck/types";

interface QuestionInputProps {
  question: Question;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}

/**
 * Renders the right input widget for a question's type (single / scale /
 * multi / text) — the only place that needs to change if a new question
 * type is introduced.
 */
export function QuestionInput({ question, value, onChange }: QuestionInputProps) {
  if (question.type === "text") {
    return (
      <textarea
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.placeholder}
        rows={4}
        className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
    );
  }

  if (question.type === "scale") {
    const current = typeof value === "string" ? value : undefined;
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {question.options?.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`flex-1 min-w-[5.5rem] rounded-xl border px-3 py-3 text-center text-sm font-medium transition ${
                current === opt.value
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {question.scaleLabels && (
          <div className="flex justify-between text-xs text-neutral-400">
            <span>{question.scaleLabels[0]}</span>
            <span>{question.scaleLabels[1]}</span>
          </div>
        )}
      </div>
    );
  }

  if (question.type === "multi") {
    const current = Array.isArray(value) ? value : [];
    const toggle = (v: string) => {
      onChange(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
    };
    return (
      <div className="flex flex-col gap-2">
        {question.options?.map((opt) => {
          const checked = current.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={checked}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                checked
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  checked
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-neutral-300 dark:border-neutral-600"
                }`}
              >
                {checked && "✓"}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // single
  const current = typeof value === "string" ? value : undefined;
  return (
    <div className="flex flex-col gap-2">
      {question.options?.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={current === opt.value}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
            current === opt.value
              ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300"
              : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

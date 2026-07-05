/**
 * Shared question/result types for the 자가진단 hub. Every diagnosis and
 * survey is described as data here so new items only need a new entry in
 * definitions.ts, not new UI code.
 */

export type QuestionType = "single" | "scale" | "multi" | "text";

export interface QuestionOption {
  value: string;
  label: string;
  /** For tally-scored tests (job/workplace/personality fit) — which result archetype this option counts toward. */
  archetype?: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  /** For type "scale": labels for the low/high ends. */
  scaleLabels?: [string, string];
  scaleMax?: number;
  placeholder?: string;
}

export type CheckKind = "diagnosis" | "survey";
export type ScoringMethod = "archetype-tally" | "likert-sum" | "participation";

export interface CheckDefinition {
  id: string;
  kind: CheckKind;
  title: string;
  description: string;
  duration: string;
  tag: string;
  scoring: ScoringMethod;
  questions: Question[];
  /** archetype-tally results only: id -> display copy. */
  archetypes?: Record<string, { title: string; description: string; keywords: string[] }>;
}

export type AnswerValue = string | string[];

export interface CheckProgress {
  status: "in_progress" | "completed";
  answers: Record<string, AnswerValue>;
  currentIndex: number;
  updatedAt: string;
  completedAt?: string;
}

export interface CheckResult {
  title: string;
  tags: string[];
  summary: string;
  level?: "low" | "medium" | "high";
  recommendations?: { label: string; href: string }[];
  disclaimer?: string;
}

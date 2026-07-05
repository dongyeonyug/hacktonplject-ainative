/**
 * AD-7 v1 difficulty taxonomy — the single source of truth for the extraction
 * worker (supabase/functions/extract-difficulty) and this Next app.
 *
 * Mirrors the `difficulty_category` Postgres enum in
 * supabase/migrations/0001_init.sql exactly. Keep both in sync by hand — this
 * file has zero framework dependencies so it can be imported unmodified by
 * the Deno Edge Function worker as well as by Next/tsc and unit tests (T8).
 */

export const DIFFICULTY_CATEGORIES = [
  "career_anxiety",
  "financial_stress",
  "social_isolation",
  "self_worth",
  "sleep_health",
  "family_pressure",
  "burnout",
  "uncertainty_future",
  "other",
] as const;

export type DifficultyCategory = (typeof DIFFICULTY_CATEGORIES)[number];

/** Runtime guard: narrows an untrusted value to `DifficultyCategory`. */
export function isDifficultyCategory(value: unknown): value is DifficultyCategory {
  return (
    typeof value === "string" &&
    (DIFFICULTY_CATEGORIES as readonly string[]).includes(value)
  );
}

/** AD-7: intensity 1 (mild) – 5 (severe / impairs daily life). */
export const MIN_INTENSITY = 1;
export const MAX_INTENSITY = 5;

/** Runtime guard: narrows an untrusted value to a valid intensity integer. */
export function isValidIntensity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_INTENSITY &&
    value <= MAX_INTENSITY
  );
}

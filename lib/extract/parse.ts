import {
  isDifficultyCategory,
  isValidIntensity,
  type DifficultyCategory,
} from "./taxonomy";

/**
 * PURE parser: model JSON -> validated `difficulty_data` row (or a validation
 * failure). No I/O, no model calls — the Claude call itself lives in
 * supabase/functions/extract-difficulty/index.ts and is kept strictly
 * separate so this mapping is unit-testable in isolation (T8).
 *
 * Schema note (AD-1): `difficulty_data.source_message_id` is UNIQUE, so at
 * most one difficulty row may exist per source message. The model therefore
 * reports either "no difficulty in this message" or a single most-salient
 * category/intensity/context — never an array of multiple difficulties for
 * one message. Accumulation across the 9-category taxonomy happens over many
 * messages, not within one.
 */

export interface ParsedDifficultyRecord {
  category: DifficultyCategory;
  intensity: number;
  /** Normalized: trimmed, or null if absent/empty. */
  context: string | null;
}

export type ParseOutcome =
  | { ok: true; record: ParsedDifficultyRecord | null }
  | { ok: false; reason: string };

interface RawExtractionResponse {
  difficulty_detected?: unknown;
  category?: unknown;
  intensity?: unknown;
  context?: unknown;
}

/**
 * Maps a raw (untrusted) model JSON response to either:
 *  - `{ ok: true, record: null }` — message had no detectable difficulty.
 *  - `{ ok: true, record: {...} }` — a validated difficulty record to insert.
 *  - `{ ok: false, reason }` — the model output could not be validated; the
 *    caller should treat this as a transient extraction failure (retry).
 */
export function parseDifficultyExtraction(modelResponse: unknown): ParseOutcome {
  if (typeof modelResponse !== "object" || modelResponse === null) {
    return { ok: false, reason: "response is not a JSON object" };
  }

  const { difficulty_detected, category, intensity, context } =
    modelResponse as RawExtractionResponse;

  if (difficulty_detected === false) {
    return { ok: true, record: null };
  }
  if (difficulty_detected !== true) {
    return {
      ok: false,
      reason: `missing/invalid 'difficulty_detected' boolean: ${String(difficulty_detected)}`,
    };
  }

  if (!isDifficultyCategory(category)) {
    return { ok: false, reason: `invalid category: ${String(category)}` };
  }
  if (!isValidIntensity(intensity)) {
    return { ok: false, reason: `invalid intensity: ${String(intensity)}` };
  }

  const normalizedContext =
    typeof context === "string" && context.trim().length > 0 ? context.trim() : null;

  return {
    ok: true,
    record: { category, intensity, context: normalizedContext },
  };
}

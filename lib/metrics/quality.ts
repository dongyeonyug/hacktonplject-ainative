import { DIFFICULTY_CATEGORIES, type DifficultyCategory } from "@/lib/extract/taxonomy";

/**
 * AD-7 quality/quantity metrics (North-star = 어려움 데이터 품질/양).
 *
 * PURE functions only — no I/O, no Supabase calls, no "server-only" import
 * (mirrors lib/extract/taxonomy.ts) so T8 can unit test this module directly
 * in any JS runtime. Callers (app/admin/metrics) fetch de-identified rows via
 * the service-role client and pass them in here.
 *
 * Formula (plan AD-7):
 *   quality = 0.4*category_coverage + 0.3*context_richness + 0.3*temporal_consistency
 *   target: quality >= QUALITY_TARGET (0.6)
 */

/** Minimal per-record shape needed to compute metrics. `userId` is used only
 * for grouping (temporal consistency, unique-user counts) — it is never
 * rendered by the admin page, only folded into aggregate numbers. */
export interface QualityInputRecord {
  userId: string;
  category: DifficultyCategory;
  intensity: number;
  context: string | null;
  /** ISO 8601 timestamp string (difficulty_data.created_at). */
  createdAt: string;
}

/** `context_richness`: minimum whitespace-delimited token count to count a
 * record's context as "rich" (plan: "≥8 토큰"). */
export const MIN_RICH_CONTEXT_TOKENS = 8;

/** `temporal_consistency`: two consecutive same-category records for one user
 * are considered contradictory if their intensity differs by this much or
 * more (a same-category signal swinging from e.g. intensity 1 to 4 in
 * adjacent sessions indicates an inconsistent/unreliable extraction signal). */
export const CONTRADICTORY_INTENSITY_DELTA = 3;

export const QUALITY_TARGET = 0.6;

function tokenCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** `category_coverage` = distinct categories extracted / total taxonomy size (9). */
export function categoryCoverage(records: readonly QualityInputRecord[]): number {
  const distinct = new Set(records.map((r) => r.category));
  return distinct.size / DIFFICULTY_CATEGORIES.length;
}

/** `context_richness` = fraction of records whose context is non-empty and
 * has >= MIN_RICH_CONTEXT_TOKENS whitespace-delimited tokens. */
export function contextRichness(records: readonly QualityInputRecord[]): number {
  if (records.length === 0) return 0;
  const rich = records.filter(
    (r) => r.context != null && r.context.trim().length > 0 && tokenCount(r.context) >= MIN_RICH_CONTEXT_TOKENS,
  ).length;
  return rich / records.length;
}

/**
 * `temporal_consistency` = fraction of consecutive same-user record pairs
 * that are NOT contradictory. A pair is contradictory when both records
 * share a category but their intensities differ by >= CONTRADICTORY_INTENSITY_DELTA.
 * Users with fewer than 2 records contribute no pairs. If no user has any
 * multi-session pairs at all, there is no evidence of inconsistency, so the
 * metric defaults to 1 (vacuously consistent).
 */
export function temporalConsistency(records: readonly QualityInputRecord[]): number {
  const byUser = new Map<string, QualityInputRecord[]>();
  for (const r of records) {
    const arr = byUser.get(r.userId);
    if (arr) arr.push(r);
    else byUser.set(r.userId, [r]);
  }

  let totalPairs = 0;
  let contradictoryPairs = 0;

  for (const userRecords of byUser.values()) {
    if (userRecords.length < 2) continue;
    const sorted = [...userRecords].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      totalPairs += 1;
      const sameCategory = a.category === b.category;
      const intensityDelta = Math.abs(a.intensity - b.intensity);
      if (sameCategory && intensityDelta >= CONTRADICTORY_INTENSITY_DELTA) {
        contradictoryPairs += 1;
      }
    }
  }

  if (totalPairs === 0) return 1;
  return (totalPairs - contradictoryPairs) / totalPairs;
}

export interface QualityMetrics {
  categoryCoverage: number;
  contextRichness: number;
  temporalConsistency: number;
  qualityScore: number;
  meetsTarget: boolean;
}

/** Computes the full AD-7 quality score plus its sub-metrics from de-identified rows. */
export function computeQualityMetrics(records: readonly QualityInputRecord[]): QualityMetrics {
  const coverage = categoryCoverage(records);
  const richness = contextRichness(records);
  const consistency = temporalConsistency(records);
  const qualityScore = 0.4 * coverage + 0.3 * richness + 0.3 * consistency;
  return {
    categoryCoverage: coverage,
    contextRichness: richness,
    temporalConsistency: consistency,
    qualityScore,
    meetsTarget: qualityScore >= QUALITY_TARGET,
  };
}

export interface VolumeMetrics {
  totalRecords: number;
  uniqueUsers: number;
  /** Average difficulty_data records per user with at least one record. */
  recordsPerUser: number;
  perCategoryCounts: Record<DifficultyCategory, number>;
}

/** Aggregate volume metrics: total records, unique users, per-category counts. */
export function computeVolumeMetrics(records: readonly QualityInputRecord[]): VolumeMetrics {
  const perCategoryCounts = Object.fromEntries(
    DIFFICULTY_CATEGORIES.map((c) => [c, 0]),
  ) as Record<DifficultyCategory, number>;

  const users = new Set<string>();
  for (const r of records) {
    perCategoryCounts[r.category] += 1;
    users.add(r.userId);
  }

  const totalRecords = records.length;
  const uniqueUsers = users.size;
  return {
    totalRecords,
    uniqueUsers,
    recordsPerUser: uniqueUsers === 0 ? 0 : totalRecords / uniqueUsers,
    perCategoryCounts,
  };
}

/** Mirrors the `extraction_state` Postgres enum (AD-1) in 0001_init.sql. */
export const EXTRACTION_STATES = ["queued", "running", "done", "failed"] as const;
export type ExtractionState = (typeof EXTRACTION_STATES)[number];

export interface ExtractionHealth {
  counts: Record<ExtractionState, number>;
  total: number;
  failureRate: number;
}

/** Extraction pipeline health: counts per lifecycle state + failure rate. */
export function computeExtractionHealth(states: readonly ExtractionState[]): ExtractionHealth {
  const counts = Object.fromEntries(
    EXTRACTION_STATES.map((s) => [s, 0]),
  ) as Record<ExtractionState, number>;

  for (const s of states) counts[s] += 1;

  const total = states.length;
  return { counts, total, failureRate: total === 0 ? 0 : counts.failed / total };
}

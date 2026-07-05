import { describe, it, expect } from "vitest";
import {
  categoryCoverage,
  contextRichness,
  temporalConsistency,
  computeQualityMetrics,
  computeVolumeMetrics,
  computeExtractionHealth,
  QUALITY_TARGET,
  MIN_RICH_CONTEXT_TOKENS,
  CONTRADICTORY_INTENSITY_DELTA,
  type QualityInputRecord,
} from "@/lib/metrics/quality";
import { DIFFICULTY_CATEGORIES } from "@/lib/extract/taxonomy";

function record(
  overrides: Partial<QualityInputRecord> & Pick<QualityInputRecord, "userId" | "category">,
): QualityInputRecord {
  return {
    intensity: 3,
    context: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("categoryCoverage", () => {
  it("returns 0 for an empty record set", () => {
    expect(categoryCoverage([])).toBe(0);
  });

  it("returns distinct-categories / total-taxonomy-size (9)", () => {
    const records = [
      record({ userId: "u1", category: "career_anxiety" }),
      record({ userId: "u1", category: "career_anxiety" }), // duplicate category, doesn't double count
      record({ userId: "u1", category: "burnout" }),
    ];
    expect(categoryCoverage(records)).toBeCloseTo(2 / DIFFICULTY_CATEGORIES.length, 10);
  });

  it("returns 1 when every taxonomy category has been extracted at least once", () => {
    const records = DIFFICULTY_CATEGORIES.map((category) => record({ userId: "u1", category }));
    expect(categoryCoverage(records)).toBe(1);
  });
});

describe("contextRichness", () => {
  it("returns 0 for an empty record set", () => {
    expect(contextRichness([])).toBe(0);
  });

  it("excludes null context from the rich count", () => {
    const records = [record({ userId: "u1", category: "burnout", context: null })];
    expect(contextRichness(records)).toBe(0);
  });

  it("excludes context below the minimum token threshold", () => {
    const shortContext = Array(MIN_RICH_CONTEXT_TOKENS - 1).fill("word").join(" ");
    const records = [record({ userId: "u1", category: "burnout", context: shortContext })];
    expect(contextRichness(records)).toBe(0);
  });

  it("counts context at exactly the minimum token threshold as rich", () => {
    const exactContext = Array(MIN_RICH_CONTEXT_TOKENS).fill("word").join(" ");
    const records = [record({ userId: "u1", category: "burnout", context: exactContext })];
    expect(contextRichness(records)).toBe(1);
  });

  it("computes the fraction of rich records across a mixed set", () => {
    const rich = Array(MIN_RICH_CONTEXT_TOKENS).fill("word").join(" ");
    const records = [
      record({ userId: "u1", category: "burnout", context: rich }),
      record({ userId: "u1", category: "burnout", context: null }),
      record({ userId: "u1", category: "burnout", context: "" }),
      record({ userId: "u1", category: "burnout", context: "too short" }),
    ];
    expect(contextRichness(records)).toBe(0.25);
  });
});

describe("temporalConsistency", () => {
  it("defaults to 1 (vacuously consistent) when there are no multi-record users", () => {
    const records = [record({ userId: "u1", category: "burnout" })];
    expect(temporalConsistency(records)).toBe(1);
  });

  it("defaults to 1 for an empty record set", () => {
    expect(temporalConsistency([])).toBe(1);
  });

  it("treats a large same-category intensity swing across sessions as contradictory", () => {
    const records = [
      record({ userId: "u1", category: "burnout", intensity: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
      record({ userId: "u1", category: "burnout", intensity: 5, createdAt: "2026-01-02T00:00:00.000Z" }),
    ];
    expect(temporalConsistency(records)).toBe(0);
  });

  it("does not treat a different-category pair as contradictory regardless of intensity delta", () => {
    const records = [
      record({ userId: "u1", category: "burnout", intensity: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
      record({ userId: "u1", category: "sleep_health", intensity: 5, createdAt: "2026-01-02T00:00:00.000Z" }),
    ];
    expect(temporalConsistency(records)).toBe(1);
  });

  it("does not flag an intensity delta below the contradiction threshold", () => {
    const records = [
      record({ userId: "u1", category: "burnout", intensity: 2, createdAt: "2026-01-01T00:00:00.000Z" }),
      record({
        userId: "u1",
        category: "burnout",
        intensity: 2 + CONTRADICTORY_INTENSITY_DELTA - 1,
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    expect(temporalConsistency(records)).toBe(1);
  });

  it("flags an intensity delta exactly at the contradiction threshold", () => {
    const records = [
      record({ userId: "u1", category: "burnout", intensity: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
      record({
        userId: "u1",
        category: "burnout",
        intensity: 1 + CONTRADICTORY_INTENSITY_DELTA,
        createdAt: "2026-01-02T00:00:00.000Z",
      }),
    ];
    expect(temporalConsistency(records)).toBe(0);
  });

  it("computes a partial ratio across multiple users independently", () => {
    const records = [
      // u1: 1 contradictory pair out of 1
      record({ userId: "u1", category: "burnout", intensity: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
      record({ userId: "u1", category: "burnout", intensity: 5, createdAt: "2026-01-02T00:00:00.000Z" }),
      // u2: 1 consistent pair out of 1
      record({ userId: "u2", category: "sleep_health", intensity: 2, createdAt: "2026-01-01T00:00:00.000Z" }),
      record({ userId: "u2", category: "sleep_health", intensity: 3, createdAt: "2026-01-02T00:00:00.000Z" }),
    ];
    // total pairs = 2, contradictory = 1 -> (2-1)/2 = 0.5
    expect(temporalConsistency(records)).toBe(0.5);
  });

  it("sorts by createdAt before pairing, independent of input array order", () => {
    const records = [
      record({ userId: "u1", category: "burnout", intensity: 5, createdAt: "2026-01-02T00:00:00.000Z" }),
      record({ userId: "u1", category: "burnout", intensity: 1, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    expect(temporalConsistency(records)).toBe(0);
  });
});

describe("computeQualityMetrics", () => {
  it("combines sub-metrics using the AD-7 weighted formula (0.4/0.3/0.3)", () => {
    const richContext = Array(MIN_RICH_CONTEXT_TOKENS).fill("word").join(" ");
    const records: QualityInputRecord[] = [
      record({ userId: "u1", category: "career_anxiety", intensity: 2, context: richContext, createdAt: "2026-01-01T00:00:00.000Z" }),
      record({ userId: "u1", category: "burnout", intensity: 2, context: richContext, createdAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const metrics = computeQualityMetrics(records);
    const expected =
      0.4 * metrics.categoryCoverage + 0.3 * metrics.contextRichness + 0.3 * metrics.temporalConsistency;
    expect(metrics.qualityScore).toBeCloseTo(expected, 10);
  });

  it("flags meetsTarget=true when score is exactly at QUALITY_TARGET boundary", () => {
    // Construct a record set with coverage=1, richness=1, consistency=1 -> score = 1.0 >= 0.6
    const richContext = Array(MIN_RICH_CONTEXT_TOKENS).fill("word").join(" ");
    const records = DIFFICULTY_CATEGORIES.map((category, i) =>
      record({ userId: `u${i}`, category, context: richContext }),
    );
    const metrics = computeQualityMetrics(records);
    expect(metrics.qualityScore).toBe(1);
    expect(metrics.meetsTarget).toBe(true);
  });

  it("flags meetsTarget=false when score falls just under QUALITY_TARGET", () => {
    // 0 coverage-ish, 0 richness, but consistency defaults to 1 (no pairs):
    // score = 0.4*coverage + 0.3*0 + 0.3*1. With a single category out of 9: coverage=1/9.
    const records = [record({ userId: "u1", category: "burnout", context: null })];
    const metrics = computeQualityMetrics(records);
    expect(metrics.qualityScore).toBeLessThan(QUALITY_TARGET);
    expect(metrics.meetsTarget).toBe(false);
  });

  it("returns all-zero sub-metrics with contextRichness 0 for an empty input (coverage 0, richness 0, consistency vacuously 1)", () => {
    const metrics = computeQualityMetrics([]);
    expect(metrics.categoryCoverage).toBe(0);
    expect(metrics.contextRichness).toBe(0);
    expect(metrics.temporalConsistency).toBe(1);
    expect(metrics.qualityScore).toBeCloseTo(0.3, 10);
    expect(metrics.meetsTarget).toBe(false);
  });
});

describe("computeVolumeMetrics", () => {
  it("returns zeroed metrics for no records", () => {
    const metrics = computeVolumeMetrics([]);
    expect(metrics.totalRecords).toBe(0);
    expect(metrics.uniqueUsers).toBe(0);
    expect(metrics.recordsPerUser).toBe(0);
    for (const c of DIFFICULTY_CATEGORIES) {
      expect(metrics.perCategoryCounts[c]).toBe(0);
    }
  });

  it("computes total records, unique users, per-category counts, and average per user", () => {
    const records = [
      record({ userId: "u1", category: "burnout" }),
      record({ userId: "u1", category: "career_anxiety" }),
      record({ userId: "u2", category: "burnout" }),
    ];
    const metrics = computeVolumeMetrics(records);
    expect(metrics.totalRecords).toBe(3);
    expect(metrics.uniqueUsers).toBe(2);
    expect(metrics.recordsPerUser).toBeCloseTo(1.5, 10);
    expect(metrics.perCategoryCounts.burnout).toBe(2);
    expect(metrics.perCategoryCounts.career_anxiety).toBe(1);
    expect(metrics.perCategoryCounts.sleep_health).toBe(0);
  });
});

describe("computeExtractionHealth", () => {
  it("returns zeroed counts and 0 failure rate for no states", () => {
    const health = computeExtractionHealth([]);
    expect(health.total).toBe(0);
    expect(health.failureRate).toBe(0);
    expect(health.counts.failed).toBe(0);
  });

  it("computes per-state counts and failure rate", () => {
    const health = computeExtractionHealth(["queued", "running", "done", "done", "failed"]);
    expect(health.total).toBe(5);
    expect(health.counts.done).toBe(2);
    expect(health.counts.failed).toBe(1);
    expect(health.failureRate).toBeCloseTo(0.2, 10);
  });
});

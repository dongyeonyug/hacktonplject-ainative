import { describe, it, expect } from "vitest";
import { parseDifficultyExtraction } from "@/lib/extract/parse";

describe("parseDifficultyExtraction", () => {
  it("returns ok+null record when the model reports no difficulty detected", () => {
    const result = parseDifficultyExtraction({ difficulty_detected: false });
    expect(result).toEqual({ ok: true, record: null });
  });

  it("ignores extraneous category/intensity/context fields when difficulty_detected is false", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: false,
      category: "career_anxiety",
      intensity: 5,
      context: "should be ignored",
    });
    expect(result).toEqual({ ok: true, record: null });
  });

  it("parses a valid detected difficulty into a validated record", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: true,
      category: "burnout",
      intensity: 4,
      context: "매일 야근하느라 완전히 지쳐버렸어요",
    });
    expect(result).toEqual({
      ok: true,
      record: {
        category: "burnout",
        intensity: 4,
        context: "매일 야근하느라 완전히 지쳐버렸어요",
      },
    });
  });

  it("normalizes an empty/whitespace-only context to null", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: true,
      category: "sleep_health",
      intensity: 2,
      context: "   ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record?.context).toBeNull();
    }
  });

  it("trims surrounding whitespace from a non-empty context", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: true,
      category: "self_worth",
      intensity: 3,
      context: "  잘하는 게 없는 것 같아요  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record?.context).toBe("잘하는 게 없는 것 같아요");
    }
  });

  it("normalizes an absent context field to null", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: true,
      category: "financial_stress",
      intensity: 1,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.record?.context).toBeNull();
    }
  });

  it("rejects a response that is not a JSON object", () => {
    expect(parseDifficultyExtraction(null)).toEqual({
      ok: false,
      reason: "response is not a JSON object",
    });
    expect(parseDifficultyExtraction("not an object").ok).toBe(false);
    expect(parseDifficultyExtraction(42).ok).toBe(false);
    expect(parseDifficultyExtraction(undefined).ok).toBe(false);
  });

  it("rejects when difficulty_detected is missing or not a boolean", () => {
    const missing = parseDifficultyExtraction({ category: "burnout", intensity: 3 });
    expect(missing.ok).toBe(false);

    const wrongType = parseDifficultyExtraction({ difficulty_detected: "true" });
    expect(wrongType.ok).toBe(false);
  });

  it("rejects an invalid/unknown category even when difficulty_detected is true", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: true,
      category: "not_a_real_category",
      intensity: 3,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("invalid category");
    }
  });

  it("rejects a non-integer intensity", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: true,
      category: "burnout",
      intensity: 3.5,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an out-of-range intensity (below 1 or above 5)", () => {
    expect(
      parseDifficultyExtraction({ difficulty_detected: true, category: "burnout", intensity: 0 })
        .ok,
    ).toBe(false);
    expect(
      parseDifficultyExtraction({ difficulty_detected: true, category: "burnout", intensity: 6 })
        .ok,
    ).toBe(false);
  });

  it("rejects a missing intensity", () => {
    const result = parseDifficultyExtraction({
      difficulty_detected: true,
      category: "burnout",
    });
    expect(result.ok).toBe(false);
  });
});

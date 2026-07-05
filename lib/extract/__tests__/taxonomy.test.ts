import { describe, it, expect } from "vitest";
import {
  DIFFICULTY_CATEGORIES,
  isDifficultyCategory,
  isValidIntensity,
  MIN_INTENSITY,
  MAX_INTENSITY,
} from "@/lib/extract/taxonomy";

describe("isDifficultyCategory", () => {
  it.each(DIFFICULTY_CATEGORIES)("accepts the taxonomy category '%s'", (category) => {
    expect(isDifficultyCategory(category)).toBe(true);
  });

  it("rejects an unknown category string", () => {
    expect(isDifficultyCategory("not_real")).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(isDifficultyCategory(123)).toBe(false);
    expect(isDifficultyCategory(null)).toBe(false);
    expect(isDifficultyCategory(undefined)).toBe(false);
    expect(isDifficultyCategory({})).toBe(false);
  });
});

describe("isValidIntensity", () => {
  it("accepts integers within [MIN_INTENSITY, MAX_INTENSITY]", () => {
    for (let i = MIN_INTENSITY; i <= MAX_INTENSITY; i++) {
      expect(isValidIntensity(i)).toBe(true);
    }
  });

  it("rejects values below the minimum boundary", () => {
    expect(isValidIntensity(MIN_INTENSITY - 1)).toBe(false);
    expect(isValidIntensity(0)).toBe(false);
  });

  it("rejects values above the maximum boundary", () => {
    expect(isValidIntensity(MAX_INTENSITY + 1)).toBe(false);
  });

  it("rejects non-integer numbers", () => {
    expect(isValidIntensity(2.5)).toBe(false);
  });

  it("rejects non-number values", () => {
    expect(isValidIntensity("3")).toBe(false);
    expect(isValidIntensity(null)).toBe(false);
    expect(isValidIntensity(undefined)).toBe(false);
  });
});

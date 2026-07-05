import { describe, it, expect } from "vitest";
import { curateInstitutions, type CuratedInstitution, type DifficultySignal } from "@/lib/match/curate";

function institution(
  id: string,
  name: string,
  categories: CuratedInstitution["categories"],
): CuratedInstitution {
  return { id, type: "public_service", name, public_info: {}, categories };
}

describe("curateInstitutions", () => {
  it("falls back to returning all institutions unscored when the user has zero signals", () => {
    const institutions = [
      institution("1", "가", ["career_anxiety"]),
      institution("2", "나", ["sleep_health"]),
    ];
    const result = curateInstitutions([], institutions);
    expect(result).toHaveLength(2);
    for (const r of result) {
      expect(r.score).toBe(0);
      expect(r.matchedCategories).toEqual([]);
    }
  });

  it("excludes institutions with zero category overlap once the user has signal", () => {
    const institutions = [
      institution("1", "진로센터", ["career_anxiety"]),
      institution("2", "무관기관", ["family_pressure"]),
    ];
    const signals: DifficultySignal[] = [{ category: "career_anxiety", intensity: 3 }];
    const result = curateInstitutions(signals, institutions);
    expect(result.map((r) => r.institution.id)).toEqual(["1"]);
  });

  it("ranks institutions higher when they cover more of the user's accumulated intensity", () => {
    const institutions = [
      institution("low", "낮은매칭", ["career_anxiety"]),
      institution("high", "높은매칭", ["career_anxiety", "burnout"]),
    ];
    const signals: DifficultySignal[] = [
      { category: "career_anxiety", intensity: 2 },
      { category: "burnout", intensity: 5 },
      { category: "burnout", intensity: 4 },
    ];
    const result = curateInstitutions(signals, institutions);
    expect(result[0].institution.id).toBe("high");
    expect(result[0].score).toBeGreaterThan(result[1].score);
    // total intensity = 2 + 5 + 4 = 11; "high" covers career_anxiety(2)+burnout(5+4)=11 -> score 1
    expect(result[0].score).toBeCloseTo(1, 5);
    // "low" covers only career_anxiety(2) -> score 2/11
    expect(result[1].score).toBeCloseTo(2 / 11, 5);
  });

  it("rewards a category logged multiple times over one logged once (frequency + severity both count)", () => {
    const institutions = [
      institution("frequent", "빈번매칭", ["social_isolation"]),
      institution("rare", "희귀매칭", ["self_worth"]),
    ];
    const signals: DifficultySignal[] = [
      { category: "social_isolation", intensity: 2 },
      { category: "social_isolation", intensity: 2 },
      { category: "social_isolation", intensity: 2 },
      { category: "self_worth", intensity: 2 },
    ];
    const result = curateInstitutions(signals, institutions);
    expect(result[0].institution.id).toBe("frequent");
  });

  it("sorts equal-score institutions by Korean name ascending for stable ordering", () => {
    const institutions = [
      institution("b", "나센터", ["career_anxiety"]),
      institution("a", "가센터", ["career_anxiety"]),
    ];
    const signals: DifficultySignal[] = [{ category: "career_anxiety", intensity: 1 }];
    const result = curateInstitutions(signals, institutions);
    expect(result.map((r) => r.institution.name)).toEqual(["가센터", "나센터"]);
  });

  it("respects the opts.limit cap on the number of results returned", () => {
    const institutions = [
      institution("1", "가", ["career_anxiety"]),
      institution("2", "나", ["career_anxiety"]),
      institution("3", "다", ["career_anxiety"]),
    ];
    const signals: DifficultySignal[] = [{ category: "career_anxiety", intensity: 1 }];
    const result = curateInstitutions(signals, institutions, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it("produces a general fallback rationale in Korean when there is no matched category", () => {
    const institutions = [institution("1", "가", ["career_anxiety"])];
    const result = curateInstitutions([], institutions);
    expect(result[0].rationale).toContain("아직 축적된 대화 데이터가 없어");
  });

  it("produces a rationale mentioning matched category counts and average intensity", () => {
    const institutions = [institution("1", "가", ["burnout"])];
    const signals: DifficultySignal[] = [
      { category: "burnout", intensity: 4 },
      { category: "burnout", intensity: 2 },
    ];
    const result = curateInstitutions(signals, institutions);
    expect(result[0].rationale).toContain("번아웃");
    expect(result[0].rationale).toContain("2회");
    expect(result[0].rationale).toContain("평균 강도 3.0");
  });
});

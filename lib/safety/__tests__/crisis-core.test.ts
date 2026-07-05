import { describe, it, expect } from "vitest";
import {
  matchCrisisKeywords,
  decideCrisis,
  type ClassifierResult,
} from "@/lib/safety/crisis-core";

describe("matchCrisisKeywords", () => {
  it("matches a direct suicide reference", () => {
    const result = matchCrisisKeywords("나는 자살하고 싶어");
    expect(result.matched).toBe(true);
    expect(result.terms).toContain("자살하고");
  });

  it("matches common euphemisms/paraphrases for ending one's life", () => {
    const result = matchCrisisKeywords("그냥 이 세상에서 사라지고 싶다는 생각뿐이야");
    expect(result.matched).toBe(true);
    expect(result.terms).toContain("사라지고 싶");
  });

  it("matches self-harm paraphrases", () => {
    const result = matchCrisisKeywords("자꾸 손목을 긋고 싶은 충동이 들어");
    expect(result.matched).toBe(true);
    expect(result.terms.some((t) => t.includes("손목"))).toBe(true);
  });

  it("is whitespace-insensitive across internal spacing", () => {
    const result = matchCrisisKeywords("나는 죽 고 싶다 정말로");
    expect(result.matched).toBe(true);
  });

  it("is whitespace-insensitive with extra/irregular spacing and tabs", () => {
    const result = matchCrisisKeywords("더   이상   못   버티겠어\t진짜");
    expect(result.matched).toBe(true);
  });

  it("does not match unrelated neutral text", () => {
    const result = matchCrisisKeywords("오늘 면접 준비 어떻게 해야 할지 고민이야");
    expect(result.matched).toBe(false);
    expect(result.terms).toEqual([]);
  });

  it("does not false-positive on merely sad but non-crisis text", () => {
    const result = matchCrisisKeywords("요즘 너무 우울하고 자신감이 없어");
    expect(result.matched).toBe(false);
  });
});

describe("decideCrisis — precedence and fail-safe", () => {
  const okNoCrisis: ClassifierResult = { ok: true, crisis: false, severity: "none" };
  const okCrisisHigh: ClassifierResult = { ok: true, crisis: true, severity: "high" };
  const okCrisisLow: ClassifierResult = { ok: true, crisis: true, severity: "low" };
  const failedClassifier: ClassifierResult = { ok: false, crisis: false, severity: "none" };

  it("keyword match always wins even if classifier disagrees (says no crisis)", () => {
    const decision = decideCrisis(okNoCrisis, { matched: true, terms: ["자살"] });
    expect(decision.crisisPosture).toBe(true);
    expect(decision.showHotline).toBe(true);
    expect(decision.logEvent).toBe(true);
    expect(decision.source).toBe("keyword");
    expect(decision.severity).toBe("high");
    expect(decision.matchedKeywords).toEqual(["자살"]);
  });

  it("keyword match escalates severity to at least high, taking the max with classifier", () => {
    const higherThanHigh: ClassifierResult = { ok: true, crisis: true, severity: "high" };
    const decision = decideCrisis(higherThanHigh, { matched: true, terms: ["자해"] });
    expect(decision.severity).toBe("high");
  });

  it("keyword match combined with agreeing classifier keeps classifier severity if it maxes higher", () => {
    // classifier severity "high" vs floor "high" -> stays high; verifies maxSeverity path exercised.
    const decision = decideCrisis(okCrisisHigh, { matched: true, terms: ["투신"] });
    expect(decision.severity).toBe("high");
    expect(decision.source).toBe("keyword");
  });

  it("classifier failure (ok=false) with no keyword hit fails safe: hotline shown, no full posture, never fail-open", () => {
    const decision = decideCrisis(failedClassifier, { matched: false, terms: [] });
    expect(decision.showHotline).toBe(true);
    expect(decision.crisisPosture).toBe(false);
    expect(decision.logEvent).toBe(true);
    expect(decision.source).toBe("failsafe");
    expect(decision.severity).toBe("low");
  });

  it("classifier being null (never called / crashed before result) also fails safe", () => {
    const decision = decideCrisis(null, { matched: false, terms: [] });
    expect(decision.showHotline).toBe(true);
    expect(decision.crisisPosture).toBe(false);
    expect(decision.source).toBe("failsafe");
  });

  it("classifier ok + crisis true (no keyword hit) triggers full posture via classifier source", () => {
    const decision = decideCrisis(okCrisisLow, { matched: false, terms: [] });
    expect(decision.crisisPosture).toBe(true);
    expect(decision.showHotline).toBe(true);
    expect(decision.logEvent).toBe(true);
    expect(decision.source).toBe("classifier");
    expect(decision.severity).toBe("low");
  });

  it("classifier ok + crisis true but severity 'none' is normalized up to 'medium'", () => {
    const inconsistent: ClassifierResult = { ok: true, crisis: true, severity: "none" };
    const decision = decideCrisis(inconsistent, { matched: false, terms: [] });
    expect(decision.severity).toBe("medium");
  });

  it("classifier ok + no crisis + no keyword hit is a normal response with no card", () => {
    const decision = decideCrisis(okNoCrisis, { matched: false, terms: [] });
    expect(decision.showHotline).toBe(false);
    expect(decision.crisisPosture).toBe(false);
    expect(decision.logEvent).toBe(false);
    expect(decision.severity).toBe("none");
    expect(decision.source).toBe("classifier");
  });
});

import type { DifficultyCategory } from "@/lib/extract/taxonomy";

/**
 * AC-9 / AD-7 rule-based curation (Phase 4). PURE function — no I/O, no model
 * calls — so it stays unit-testable in isolation (T8), mirroring the
 * separation already used by lib/extract/parse.ts. Callers (app/recommendations)
 * are responsible for reading `difficulty_data` / `institutions` from Supabase
 * and passing plain data in.
 *
 * MVP scope: this is a curation ranking only — no real institution
 * partnership, no identity transfer. `institutions` is public/curated info
 * (supabase/migrations/0001_init.sql + 0003_institutions_seed.sql).
 */

/** One accumulated difficulty signal (a row from `difficulty_data`). */
export interface DifficultySignal {
  category: DifficultyCategory;
  /** AD-7: intensity 1 (mild) – 5 (severe / impairs daily life). */
  intensity: number;
}

/** A row from the public `institutions` table, as read by the app. */
export interface CuratedInstitution {
  id: string;
  type: string;
  name: string;
  public_info: Record<string, unknown>;
  categories: DifficultyCategory[];
}

export interface CurationResult {
  institution: CuratedInstitution;
  /** 0–1: this institution's share of the user's total accumulated signal. */
  score: number;
  /** Categories the institution covers that also appear in the user's data. */
  matchedCategories: DifficultyCategory[];
  /** Human-readable (Korean) explanation for why this was recommended. */
  rationale: string;
}

/** Korean labels for rationale copy. Local to curation — not a shared taxonomy concern. */
const CATEGORY_LABELS_KO: Record<DifficultyCategory, string> = {
  career_anxiety: "진로/취업 불안",
  financial_stress: "경제적 어려움",
  social_isolation: "사회적 고립감",
  self_worth: "자기 가치감 저하",
  sleep_health: "수면 건강",
  family_pressure: "가족 압박",
  burnout: "번아웃",
  uncertainty_future: "미래에 대한 불확실성",
  other: "기타 어려움",
};

interface CategoryStat {
  count: number;
  totalIntensity: number;
}

function aggregateByCategory(
  signals: DifficultySignal[],
): Map<DifficultyCategory, CategoryStat> {
  const stats = new Map<DifficultyCategory, CategoryStat>();
  for (const s of signals) {
    const existing = stats.get(s.category);
    if (existing) {
      existing.count += 1;
      existing.totalIntensity += s.intensity;
    } else {
      stats.set(s.category, { count: 1, totalIntensity: s.intensity });
    }
  }
  return stats;
}

function buildRationale(
  matched: { category: DifficultyCategory; stat: CategoryStat }[],
): string {
  if (matched.length === 0) {
    return "아직 축적된 대화 데이터가 없어 일반 안내로 보여드려요.";
  }
  const parts = matched
    .sort((a, b) => b.stat.totalIntensity - a.stat.totalIntensity)
    .map(({ category, stat }) => {
      const avgIntensity = (stat.totalIntensity / stat.count).toFixed(1);
      return `${CATEGORY_LABELS_KO[category]}(${stat.count}회, 평균 강도 ${avgIntensity})`;
    });
  return `${parts.join(", ")} 관련 어려움을 바탕으로 추천되었어요.`;
}

/**
 * Ranks `institutions` against the user's accumulated `signals`.
 *
 * Rule (AD-7, deterministic + testable):
 * 1. Aggregate signals per category: count + summed intensity.
 * 2. An institution's raw weight = sum of `totalIntensity` across the
 *    categories it covers that also appear in the user's data (rewards both
 *    frequency and severity — a category logged 3x contributes more than one
 *    logged once, and severe entries weigh more than mild ones).
 * 3. `score` = raw weight / total intensity across ALL signals (0–1): the
 *    proportion of the user's accumulated difficulty this institution addresses.
 * 4. Institutions with zero category overlap are excluded, UNLESS the user has
 *    no signals at all yet — then all institutions are returned unscored
 *    (fallback: show general public info until data accumulates).
 * 5. Sorted by score desc, then name asc for stable ordering; optionally capped
 *    by `opts.limit`.
 */
export function curateInstitutions(
  signals: DifficultySignal[],
  institutions: CuratedInstitution[],
  opts: { limit?: number } = {},
): CurationResult[] {
  const stats = aggregateByCategory(signals);
  const totalIntensity = signals.reduce((sum, s) => sum + s.intensity, 0);

  let results: CurationResult[];

  if (totalIntensity === 0) {
    // No accumulated data yet: fall back to showing everything, unscored.
    results = institutions.map((institution) => ({
      institution,
      score: 0,
      matchedCategories: [],
      rationale: buildRationale([]),
    }));
  } else {
    results = institutions
      .map((institution) => {
        const matched = institution.categories
          .filter((c) => stats.has(c))
          .map((category) => ({ category, stat: stats.get(category)! }));

        const rawWeight = matched.reduce((sum, m) => sum + m.stat.totalIntensity, 0);

        return {
          institution,
          score: rawWeight / totalIntensity,
          matchedCategories: matched.map((m) => m.category),
          rationale: buildRationale(matched),
        };
      })
      .filter((r) => r.matchedCategories.length > 0);
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.institution.name.localeCompare(b.institution.name, "ko");
  });

  return typeof opts.limit === "number" ? results.slice(0, opts.limit) : results;
}

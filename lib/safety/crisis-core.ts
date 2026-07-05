/**
 * AD-2 crisis decision core — PURE, runtime-agnostic logic (SAFETY-CRITICAL).
 *
 * This module has NO `server-only` guard and NO SDK import, so it can be
 * imported directly by unit tests (T8: paraphrase/euphemism cases, classifier
 * fail-safe) as well as by the server-only classifier in `crisis.ts`.
 */

export type CrisisSeverity = "none" | "low" | "medium" | "high";

/** How a crisis decision was reached — for logging/observability. */
export type CrisisSource = "classifier" | "keyword" | "failsafe";

/** Outcome of the fast (haiku) classifier. */
export interface ClassifierResult {
  /** True only if the classifier call completed (did not error/time out). */
  ok: boolean;
  /** Classifier judgment. Meaningful only when `ok` is true. */
  crisis: boolean;
  /** Classifier-reported severity. Meaningful only when `ok` is true. */
  severity: CrisisSeverity;
}

export interface KeywordMatch {
  matched: boolean;
  /** The specific terms that matched (for logging/tests). */
  terms: string[];
}

export interface CrisisDecision {
  /** Render the Korean hotline card to the user. */
  showHotline: boolean;
  /** Override the system prompt to the crisis-support posture. */
  crisisPosture: boolean;
  /** Persist a `crisis_events` row. */
  logEvent: boolean;
  severity: CrisisSeverity;
  source: CrisisSource;
  matchedKeywords: string[];
}

/**
 * Korean suicide / self-harm / acute-crisis terms, including common
 * paraphrases and euphemisms. This is a FALLBACK safety net, not the primary
 * signal — the haiku classifier is expected to catch nuance the list misses.
 * Kept deliberately broad (favouring recall) because a false positive here only
 * surfaces a hotline card, while a false negative could miss a crisis.
 */
export const CRISIS_KEYWORDS: readonly string[] = [
  // Direct suicide references
  "자살",
  "자살하고",
  "자살할",
  "죽고 싶",
  "죽고싶",
  "죽어버리",
  "죽어 버리",
  "죽고 싶어",
  "죽는 게 낫",
  "죽는게 낫",
  "차라리 죽",
  "그냥 죽",
  // Euphemism / paraphrase for ending one's life
  "사라지고 싶",
  "사라져 버리고 싶",
  "없어지고 싶",
  "세상에서 사라",
  "다 끝내고 싶",
  "이 삶을 끝내",
  "인생을 끝내",
  "이제 그만 살",
  "그만 살고 싶",
  "살고 싶지 않",
  "살 이유가 없",
  "살아갈 이유",
  "떠나고 싶", // ambiguous but safer to flag in this context
  "눈을 감고 싶",
  "먼저 갈",
  // Self-harm
  "자해",
  "자해하고",
  "손목을 긋",
  "손목 긋",
  "긋고 싶",
  "칼로 그",
  // Method / plan references
  "목을 매",
  "목매",
  "뛰어내리",
  "투신",
  "약을 먹고 죽",
  "번개탄",
  "유서",
  "마지막 인사",
  "마지막으로 인사",
  // Hopelessness escalation
  "더 이상 못 버티",
  "더이상 못 버티",
  "더 이상 살아",
  "버틸 수가 없",
  "희망이 없",
  "다 포기하고 싶",
] as const;

/** Normalize for matching: lowercase + collapse internal whitespace. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * PURE. Returns whether any crisis keyword appears in the text and which ones.
 * Matching is whitespace-insensitive so "죽 고 싶다" still trips "죽고 싶".
 */
export function matchCrisisKeywords(text: string): KeywordMatch {
  const haystackSpaced = normalize(text);
  const haystackTight = haystackSpaced.replace(/\s+/g, "");
  const terms: string[] = [];

  for (const keyword of CRISIS_KEYWORDS) {
    const needleSpaced = normalize(keyword);
    const needleTight = needleSpaced.replace(/\s+/g, "");
    if (!needleTight) continue;
    if (
      haystackSpaced.includes(needleSpaced) ||
      haystackTight.includes(needleTight)
    ) {
      terms.push(keyword);
    }
  }

  return { matched: terms.length > 0, terms };
}

function rank(severity: CrisisSeverity): number {
  switch (severity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function maxSeverity(a: CrisisSeverity, b: CrisisSeverity): CrisisSeverity {
  return rank(a) >= rank(b) ? a : b;
}

/**
 * PURE. Combines the (possibly failed) classifier result with the keyword
 * fallback into a single, safety-first decision. Independent of any I/O so it
 * is directly unit-testable (T8: paraphrase cases, classifier-down fail-safe).
 *
 * Precedence:
 *  1. Keyword hit  → full crisis posture (source "keyword"), always.
 *  2. Classifier failed (ok=false / null) → FAIL-SAFE: show hotline card, but
 *     no full posture override unless keywords also hit (they didn't, by #1).
 *     Never fail-open to a plain normal response.
 *  3. Classifier ok + crisis → full crisis posture (source "classifier").
 *  4. Classifier ok + no crisis → normal response, no card.
 */
export function decideCrisis(
  classifier: ClassifierResult | null,
  keywordMatch: KeywordMatch,
): CrisisDecision {
  if (keywordMatch.matched) {
    const classifierAgrees = Boolean(classifier?.ok && classifier.crisis);
    const severity = classifierAgrees
      ? maxSeverity(classifier!.severity, "high")
      : "high";
    return {
      showHotline: true,
      crisisPosture: true,
      logEvent: true,
      severity,
      source: "keyword",
      matchedKeywords: keywordMatch.terms,
    };
  }

  if (!classifier || !classifier.ok) {
    // Fail-safe degradation: we could not trust a clean "not crisis" signal, so
    // we surface the hotline card rather than fail-open. Keyword fallback
    // already ran above and did not match, so we do not force the full
    // crisis-support persona — but the safety net (card) is shown regardless.
    return {
      showHotline: true,
      crisisPosture: false,
      logEvent: true,
      severity: "low",
      source: "failsafe",
      matchedKeywords: [],
    };
  }

  if (classifier.crisis) {
    return {
      showHotline: true,
      crisisPosture: true,
      logEvent: true,
      severity: classifier.severity === "none" ? "medium" : classifier.severity,
      source: "classifier",
      matchedKeywords: [],
    };
  }

  return {
    showHotline: false,
    crisisPosture: false,
    logEvent: false,
    severity: "none",
    source: "classifier",
    matchedKeywords: [],
  };
}

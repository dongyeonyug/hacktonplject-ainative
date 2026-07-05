import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getAnthropicClient, CLASSIFIER_MODEL } from "@/lib/ai/anthropic";
import {
  decideCrisis,
  matchCrisisKeywords,
  type ClassifierResult,
  type CrisisDecision,
  type CrisisSeverity,
} from "@/lib/safety/crisis-core";

/**
 * AD-2 input-side crisis detection (SAFETY-CRITICAL, non-negotiable).
 *
 * This module holds the IMPURE half: the fast haiku classifier call and the
 * input-side gate orchestrator. The PURE, unit-testable decision logic
 * (`matchCrisisKeywords`, `decideCrisis`, `CRISIS_KEYWORDS`) lives in
 * `crisis-core.ts` and is re-exported here for convenience.
 *
 * Design:
 *  - Every incoming user message is classified BEFORE we commit to a normal
 *    response, using claude-haiku-4-5 PLUS the Korean keyword fallback list.
 *  - The classifier and the main companion generation run CONCURRENTLY; the
 *    route buffers/holds the stream until the classifier returns (RC-3), so we
 *    protect the AC-2 first-token latency budget without strictly serializing.
 *  - FAIL-SAFE: if the haiku classifier errors or times out we DEGRADE to
 *    showing the hotline card and fall back to keyword matching. We NEVER
 *    fail-open to a plain normal response with no safety net.
 */

export {
  CRISIS_KEYWORDS,
  decideCrisis,
  matchCrisisKeywords,
} from "@/lib/safety/crisis-core";
export type {
  ClassifierResult,
  CrisisDecision,
  CrisisSeverity,
  CrisisSource,
  KeywordMatch,
} from "@/lib/safety/crisis-core";

const CLASSIFIER_SYSTEM_PROMPT = `You are a safety classifier for a Korean-language mental-health companion app for job seekers.
Classify ONLY the user's latest message for acute crisis risk: suicidal ideation, self-harm intent, a suicide plan/method, or an immediate danger to the user's life.
Be sensitive to Korean paraphrase and euphemism (e.g. "사라지고 싶다", "다 끝내고 싶다", "이제 그만 살고 싶다").
Do NOT flag ordinary job-search stress, anxiety, sadness, or frustration that lacks intent of self-harm or ending one's life.
Respond with a crisis boolean and a severity of none | low | medium | high.`;

const CLASSIFIER_TOOL: Anthropic.Tool = {
  name: "report_crisis_classification",
  description:
    "Report whether the user's latest message indicates an acute self-harm or suicide crisis.",
  input_schema: {
    type: "object",
    properties: {
      crisis: {
        type: "boolean",
        description: "True if the message indicates acute crisis risk.",
      },
      severity: {
        type: "string",
        enum: ["none", "low", "medium", "high"],
        description: "Severity of the detected crisis risk.",
      },
    },
    required: ["crisis", "severity"],
    additionalProperties: false,
  },
};

/** Default upper bound on how long we hold the stream waiting on the classifier. */
export const CLASSIFIER_TIMEOUT_MS = 1200;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("classifier_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Impure: runs the fast haiku classifier over the user's message. Returns a
 * well-typed {@link ClassifierResult}. On ANY error (missing key, network,
 * timeout, malformed output) it returns `{ ok: false }` so the caller's
 * {@link decideCrisis} applies the fail-safe path. This function never throws.
 *
 * Guarded so a build without a live API key does not require a real call — the
 * request only fires at runtime.
 */
export async function classifyWithHaiku(
  userMessage: string,
  timeoutMs: number = CLASSIFIER_TIMEOUT_MS,
): Promise<ClassifierResult> {
  const failed: ClassifierResult = {
    ok: false,
    crisis: false,
    severity: "none",
  };

  let client: Anthropic;
  try {
    client = getAnthropicClient();
  } catch {
    return failed;
  }

  try {
    const response = await withTimeout(
      client.messages.create({
        model: CLASSIFIER_MODEL,
        max_tokens: 256,
        system: CLASSIFIER_SYSTEM_PROMPT,
        tools: [CLASSIFIER_TOOL],
        tool_choice: { type: "tool", name: CLASSIFIER_TOOL.name },
        messages: [{ role: "user", content: userMessage }],
      }),
      timeoutMs,
    );

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );
    if (!toolUse) return failed;

    const input = toolUse.input as { crisis?: unknown; severity?: unknown };
    const crisis = input.crisis === true;
    const severity: CrisisSeverity =
      input.severity === "low" ||
      input.severity === "medium" ||
      input.severity === "high"
        ? input.severity
        : crisis
          ? "medium"
          : "none";

    return { ok: true, crisis, severity };
  } catch {
    // Errors/timeouts fall through to the fail-safe path in decideCrisis.
    return failed;
  }
}

/**
 * Input-side gate helper. Runs the keyword match (instant) and the haiku
 * classifier (bounded by `timeoutMs`) and folds both into a single decision.
 * Never throws. (The chat route inlines this flow so it can run the classifier
 * concurrently with a speculative generation; this helper is provided for
 * callers that don't need that concurrency.)
 */
export async function classifyIncomingMessage(
  userMessage: string,
  timeoutMs: number = CLASSIFIER_TIMEOUT_MS,
): Promise<CrisisDecision> {
  const keywordMatch = matchCrisisKeywords(userMessage);
  const classifier = await classifyWithHaiku(userMessage, timeoutMs);
  return decideCrisis(classifier, keywordMatch);
}

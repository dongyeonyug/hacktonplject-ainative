import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Shared Anthropic SDK client factory (server-only).
 *
 * Model roles for this project:
 *  - Companion generation: claude-opus-4-8 (empathetic, streaming).
 *  - Input-side crisis classifier: claude-haiku-4-5 (fast).
 *
 * The client is created lazily so that importing this module — or running a
 * production build without a live key — does not require ANTHROPIC_API_KEY.
 * `getAnthropicClient()` only reads the key when an actual request is made at
 * runtime.
 */

/** Companion model (plan Phase 2, step 7). */
export const COMPANION_MODEL = "claude-opus-4-8";

/** Fast input-side crisis classifier (plan AD-2). */
export const CLASSIFIER_MODEL = "claude-haiku-4-5";

let cached: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. The AI companion and crisis classifier " +
        "require an Anthropic API key at runtime.",
    );
  }

  cached = new Anthropic({ apiKey });
  return cached;
}

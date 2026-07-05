import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { getAnthropicClient, CLASSIFIER_MODEL } from "@/lib/ai/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDifficultyExtraction } from "@/lib/extract/parse";
import { DIFFICULTY_CATEGORIES } from "@/lib/extract/taxonomy";

/**
 * AD-1 async extraction — IN-APP runner.
 *
 * This is the Node/Next.js sibling of the Deno Edge Function in
 * `supabase/functions/extract-difficulty/index.ts`. It exists so the
 * difficulty-extraction loop works in a normal `next dev` / Node deployment
 * WITHOUT deploying the Edge Function (Supabase CLI, secrets, extraction_config
 * URL). Both share the SAME extraction contract and the SAME pure parser
 * (`parseDifficultyExtraction`), so behavior is identical.
 *
 * Called fire-and-forget from `app/api/chat/route.ts` right after the user
 * message is persisted — it never blocks the chat stream (Principle 1), and any
 * failure is swallowed (logged) so a extraction problem can never break chat.
 *
 * Idempotent: keyed on `source_message_id` (UNIQUE) + `extraction_status.state`
 * guard, so re-running for the same message never double-inserts.
 *
 * NOTE (production): a floating promise after the HTTP response completes is
 * reliable on a long-lived Node server (`next dev` / `next start`), but NOT on
 * ephemeral serverless functions. For serverless, deploy the Edge Function path
 * instead (0002_extraction_trigger.sql + extract-difficulty). Both are safe to
 * run together — idempotency prevents duplicates.
 */

const MAX_ATTEMPTS = 5;
const EXTRACTION_MODEL = process.env.EXTRACTION_MODEL ?? CLASSIFIER_MODEL;

const EXTRACTION_TOOL: Anthropic.Tool = {
  name: "record_difficulty",
  description:
    "Silently record whether a single chat message from a jobseeker expresses " +
    "a mental-health/career difficulty, per a fixed taxonomy. Background " +
    "analysis only — never reference this tool or its output to the user.",
  input_schema: {
    type: "object",
    properties: {
      difficulty_detected: {
        type: "boolean",
        description: "true if the message expresses a difficulty in the taxonomy, else false.",
      },
      category: {
        type: "string",
        enum: [...DIFFICULTY_CATEGORIES],
        description:
          "Required when difficulty_detected=true. The single most salient category " +
          "(only one row is stored per message).",
      },
      intensity: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "Required when difficulty_detected=true. 1=mild, 5=severe/impairs daily life.",
      },
      context: {
        type: "string",
        description:
          "Required when difficulty_detected=true. A short (<=2 sentence) neutral " +
          "paraphrase of the relevant part of the message.",
      },
    },
    required: ["difficulty_detected"],
  },
};

interface RunExtractionArgs {
  messageId: string;
  content: string;
  userId: string;
}

/**
 * Extract structured difficulty data from one user message and persist it.
 * Safe to call fire-and-forget: never throws.
 */
export async function runExtraction({
  messageId,
  content,
  userId,
}: RunExtractionArgs): Promise<void> {
  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch {
    // No service-role key configured — extraction disabled. Chat still works.
    return;
  }

  try {
    // The DB trigger (0002) normally seeds a 'queued' status row; upsert as a
    // fallback so this also works if that migration wasn't applied.
    await supabase
      .from("extraction_status")
      .upsert({ message_id: messageId, state: "queued" }, { onConflict: "message_id", ignoreDuplicates: true });

    const { data: statusRow } = await supabase
      .from("extraction_status")
      .select("state, attempts")
      .eq("message_id", messageId)
      .maybeSingle();

    // Idempotent short-circuit: already terminal.
    if (statusRow && (statusRow.state === "done" || statusRow.state === "failed")) {
      return;
    }

    const attempts = (statusRow?.attempts ?? 0) + 1;
    await supabase
      .from("extraction_status")
      .update({ state: "running", attempts, updated_at: new Date().toISOString() })
      .eq("message_id", messageId);

    try {
      const modelInput = await callClaudeWithRetry(content);
      const outcome = parseDifficultyExtraction(modelInput);

      if (!outcome.ok) {
        throw new Error(`model output failed validation: ${outcome.reason}`);
      }

      if (outcome.record) {
        const { error: insertErr } = await supabase.from("difficulty_data").insert({
          user_id: userId,
          category: outcome.record.category,
          intensity: outcome.record.intensity,
          context: outcome.record.context,
          source_message_id: messageId,
        });
        // 23505 = unique_violation on source_message_id — a prior attempt already
        // wrote this row. Treat as success to preserve idempotency.
        if (insertErr && insertErr.code !== "23505") {
          throw new Error(`difficulty_data insert failed: ${insertErr.message}`);
        }
      }

      await supabase
        .from("extraction_status")
        .update({ state: "done", error: null, updated_at: new Date().toISOString() })
        .eq("message_id", messageId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Retry via 'queued' until MAX_ATTEMPTS, then dead-letter ('failed').
      const nextState = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
      await supabase
        .from("extraction_status")
        .update({ state: nextState, error: message, updated_at: new Date().toISOString() })
        .eq("message_id", messageId);
      console.error(`[extraction] attempt ${attempts} failed for ${messageId}: ${message}`);
    }
  } catch (outerErr) {
    // Never let extraction bookkeeping errors escape (fire-and-forget contract).
    console.error("[extraction] unexpected error:", outerErr);
  }
}

/** In-process retry with exponential backoff for transient Claude API errors. */
async function callClaudeWithRetry(content: string, maxTries = 3): Promise<unknown> {
  let lastErr: unknown;
  for (let i = 0; i < maxTries; i++) {
    try {
      return await callClaudeOnce(content);
    } catch (err) {
      lastErr = err;
      if (i < maxTries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** i));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function callClaudeOnce(content: string): Promise<unknown> {
  const client = getAnthropicClient();
  const res = await client.messages.create({
    model: EXTRACTION_MODEL,
    max_tokens: 512,
    system:
      "You silently analyze one chat message from a jobseeker mental-care app " +
      "for background structured-data extraction. Never mention this analysis " +
      "to the user. Classify strictly against the fixed taxonomy tool provided.",
    messages: [{ role: "user", content }],
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: "record_difficulty" },
  });

  const toolUse = res.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude response contained no tool_use block");
  }
  return toolUse.input;
}

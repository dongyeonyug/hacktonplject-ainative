// supabase/functions/extract-difficulty/index.ts
//
// AD-1 async extraction spine — worker half. Invoked (fire-and-forget) by the
// `trg_messages_enqueue_extraction` trigger / `reenqueue_stale_extractions()`
// sweep in supabase/migrations/0002_extraction_trigger.sql. 100% background —
// this never surfaces anything to the user (Principle 1).
//
// Contract: in = { source_message_id }, out = a `difficulty_data` row (at
// most one, per the source_message_id UNIQUE constraint) + an
// `extraction_status` update. Idempotent: re-running for the same
// source_message_id never duplicates a difficulty_data row and short-circuits
// once extraction_status.state is 'done' or 'failed'.
//
// Runtime note: this is a Deno Edge Function, NOT covered by the Next app's
// `tsc --noEmit` / `next build` (see tsconfig.json `exclude`). It intentionally
// avoids any Next/Node-only dependency — the only local import is the pure,
// framework-free taxonomy/parser pair in lib/extract/*.ts, which has zero
// Node-specific APIs and is therefore valid to import unmodified from Deno.
// The Claude model call lives entirely in this file, kept deliberately
// separate from the pure parser (parseDifficultyExtraction) so the parser
// stays unit-testable without a live API (T8).
//
// ASSUMPTION: this function is not deployed in this environment. Deploy with
// `supabase functions deploy extract-difficulty` and set secrets:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
// then populate `extraction_config` (see 0002_extraction_trigger.sql) with
// this function's invoke URL + a bearer secret so the DB trigger can reach it.

import { createClient } from "npm:@supabase/supabase-js@2";
import { parseDifficultyExtraction } from "../../../lib/extract/parse.ts";
import { DIFFICULTY_CATEGORIES } from "../../../lib/extract/taxonomy.ts";

/** Dead-letter threshold — mirrors reenqueue_stale_extractions() default in 0002. */
const MAX_ATTEMPTS = 5;

/**
 * Background extraction is not latency-critical, so we use the same fast
 * model role as the AD-2 crisis classifier (see lib/ai/anthropic.ts
 * CLASSIFIER_MODEL) rather than the opus companion model.
 */
const CLAUDE_MODEL = Deno.env.get("EXTRACTION_MODEL") ?? "claude-haiku-4-5";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const EXTRACTION_TOOL = {
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

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  let body: { source_message_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const messageId = body.source_message_id;
  if (!messageId) {
    return json({ error: "source_message_id required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Idempotency guard --------------------------------------------------
  const { data: statusRow, error: statusFetchErr } = await supabase
    .from("extraction_status")
    .select("state, attempts")
    .eq("message_id", messageId)
    .maybeSingle();

  if (statusFetchErr) {
    console.error("extract-difficulty: failed to read extraction_status", statusFetchErr);
    return json({ error: "status lookup failed" }, 500);
  }
  if (!statusRow) {
    // The enqueue trigger always inserts a 'queued' row first (0002). If it's
    // missing there is nothing safe to do here.
    return json({ error: "unknown message_id (no extraction_status row)" }, 404);
  }
  if (statusRow.state === "done" || statusRow.state === "failed") {
    // Idempotent short-circuit: already terminal (done) or dead-lettered (failed).
    return json({ ok: true, skipped: statusRow.state }, 200);
  }

  const attempts = statusRow.attempts + 1;
  await supabase
    .from("extraction_status")
    .update({ state: "running", attempts, updated_at: new Date().toISOString() })
    .eq("message_id", messageId);

  try {
    // --- Fetch source message + owning user (service role bypasses RLS) --
    const { data: message, error: msgErr } = await supabase
      .from("messages")
      .select("id, content, role, conversations!inner(user_id)")
      .eq("id", messageId)
      .single();

    if (msgErr || !message) {
      throw new Error(`message fetch failed: ${msgErr?.message ?? "not found"}`);
    }
    if (message.role !== "user") {
      // Trigger is scoped to role='user' already; this is a defensive no-op.
      await markDone(supabase, messageId);
      return json({ ok: true, skipped: "non-user message" }, 200);
    }

    const conversation = message.conversations as { user_id?: string } | { user_id?: string }[];
    const userId = Array.isArray(conversation) ? conversation[0]?.user_id : conversation?.user_id;
    if (!userId) {
      throw new Error("could not resolve owning user_id via conversations join");
    }

    // --- Call Claude, with in-process retry/backoff for transient errors --
    const modelJson = await callClaudeWithRetry(message.content as string);

    // --- Pure parse/validate (no I/O — unit-testable, see lib/extract/parse.ts) --
    const outcome = parseDifficultyExtraction(modelJson);

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
      // wrote this row (e.g. crash between insert and status update). Treat as
      // success, not a failure, to preserve idempotency.
      if (insertErr && insertErr.code !== "23505") {
        throw new Error(`difficulty_data insert failed: ${insertErr.message}`);
      }
    }

    await markDone(supabase, messageId);
    return json({ ok: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`extract-difficulty: attempt ${attempts} failed for ${messageId}:`, message);

    // Retry/backoff + dead-letter (AD-1): keep retrying via 'queued' (picked
    // up by reenqueue_stale_extractions()) until MAX_ATTEMPTS, then dead-letter.
    const nextState = attempts >= MAX_ATTEMPTS ? "failed" : "queued";
    await supabase
      .from("extraction_status")
      .update({ state: nextState, error: message, updated_at: new Date().toISOString() })
      .eq("message_id", messageId);

    return json({ ok: false, error: message, dead_letter: nextState === "failed" }, 200);
  }
});

async function markDone(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
): Promise<void> {
  await supabase
    .from("extraction_status")
    .update({ state: "done", error: null, updated_at: new Date().toISOString() })
    .eq("message_id", messageId);
}

/** In-process retry with exponential backoff for a single invocation's Claude call. */
async function callClaudeWithRetry(content: string, maxTries = 3): Promise<unknown> {
  let lastErr: unknown;
  for (let i = 0; i < maxTries; i++) {
    try {
      return await callClaudeOnce(content);
    } catch (err) {
      lastErr = err;
      if (i < maxTries - 1) {
        const backoffMs = 500 * 2 ** i; // 500ms, 1000ms
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

async function callClaudeOnce(content: string): Promise<unknown> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 512,
      system:
        "You silently analyze one chat message from a jobseeker mental-care app " +
        "for background structured-data extraction. Never mention this analysis " +
        "to the user. Classify strictly against the fixed taxonomy tool provided.",
      messages: [{ role: "user", content }],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "tool", name: "record_difficulty" },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Non-2xx (incl. 429/5xx transient errors) — let the retry loop handle it.
    throw new Error(`Claude API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const toolUse = (data.content ?? []).find(
    (block: { type: string }) => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Claude response contained no tool_use block");
  }
  return toolUse.input;
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

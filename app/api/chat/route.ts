import { after } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";

import { createClient } from "@/lib/supabase/server";
import {
  createCompanionStream,
  type ChatTurn,
  type CompanionPosture,
} from "@/lib/ai/companion";
import {
  classifyWithHaiku,
  decideCrisis,
  matchCrisisKeywords,
  type CrisisDecision,
} from "@/lib/safety/crisis";
import { HOTLINES, CRISIS_HONESTY_NOTICE } from "@/lib/safety/hotlines";
import { runExtraction } from "@/lib/extract/run-extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep prompts bounded — only the most recent turns are sent for context. */
const MAX_HISTORY_TURNS = 20;

/**
 * Companion chat route (plan Phase 2, AC-2 / AC-4 / AC-12 / AD-2).
 *
 * Input-side crisis gating (AD-2, SAFETY-CRITICAL):
 *  1. Keyword match runs instantly; the haiku classifier is started
 *     concurrently with a speculative opus generation (normal posture).
 *  2. We HOLD/buffer the generation stream until the classifier returns, so the
 *     common (non-crisis) path keeps its first-token latency budget (RC-3)
 *     without strictly serializing classify-then-generate.
 *  3. On a positive decision we discard the speculative normal-posture stream,
 *     immediately render the hotline card, override to the crisis-support
 *     posture, and log a crisis_events row.
 *  4. FAIL-SAFE: if the classifier errors/times out we still show the hotline
 *     card (see decideCrisis) — we never fail-open to a plain normal response.
 */

interface ChatRequestBody {
  message?: unknown;
  conversationId?: unknown;
  history?: unknown;
}

interface StreamEvent {
  type: "meta" | "hotline" | "delta" | "done" | "error";
  [key: string]: unknown;
}

function sanitizeHistory(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  const turns: ChatTurn[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      (item as ChatTurn).role &&
      typeof (item as ChatTurn).content === "string"
    ) {
      const role = (item as ChatTurn).role;
      if (role === "user" || role === "assistant") {
        turns.push({ role, content: (item as ChatTurn).content });
      }
    }
  }
  return turns.slice(-MAX_HISTORY_TURNS);
}

export async function POST(request: Request): Promise<Response> {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userMessage =
    typeof body.message === "string" ? body.message.trim() : "";
  if (!userMessage) {
    return Response.json({ error: "message is required." }, { status: 400 });
  }

  const history = sanitizeHistory(body.history);
  const turns: ChatTurn[] = [...history, { role: "user", content: userMessage }];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // AC-13 (compliance, defense-in-depth): messages are sent cross-border to
  // Claude (Anthropic, US). No generation may occur without an authenticated
  // user AND an active `ai_processing` consent grant. The proxy gates the
  // /chat *page*, but /api/chat is the actual data-egress point, so it must
  // enforce the gate itself. We still surface crisis hotlines in the blocked
  // response so a user is never left without the safety escalation.
  if (!user) {
    return Response.json(
      {
        error: "authentication required",
        redirect: "/sign-in",
        hotlines: HOTLINES,
        notice: CRISIS_HONESTY_NOTICE,
      },
      { status: 401 },
    );
  }
  {
    const { data: consents } = await supabase
      .from("current_consents")
      .select("action")
      .eq("scope", "ai_processing");
    const hasAiProcessingConsent =
      consents?.some((c) => c.action === "grant") ?? false;
    if (!hasAiProcessingConsent) {
      return Response.json(
        {
          error: "ai_processing consent required",
          redirect: "/onboarding",
          hotlines: HOTLINES,
          notice: CRISIS_HONESTY_NOTICE,
        },
        { status: 403 },
      );
    }
  }

  // Best-effort persistence: ensure a conversation and store the user message.
  // If auth/RLS/DB is unavailable the chat still functions (nothing to persist).
  let conversationId: string | null =
    typeof body.conversationId === "string" ? body.conversationId : null;
  let userMessageId: string | null = null;

  if (user) {
    if (!conversationId) {
      const { data } = await supabase
        .from("conversations")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      conversationId = data?.id ?? null;
    }
    if (conversationId) {
      const { data } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "user",
          content: userMessage,
        })
        .select("id")
        .single();
      userMessageId = data?.id ?? null;

      // AD-1: background difficulty extraction. Scheduled with next/server
      // `after()` so it runs AFTER the response finishes — reliably on both a
      // long-lived Node server AND Vercel's serverless runtime (which freezes
      // the function once the response is sent, so a bare fire-and-forget
      // floating promise would be dropped). Never blocks the chat stream
      // (Principle 1); failures are swallowed inside runExtraction.
      if (userMessageId) {
        const extractMessageId = userMessageId;
        after(() =>
          runExtraction({
            messageId: extractMessageId,
            content: userMessage,
            userId: user.id,
          }),
        );
      }
    }
  }

  // --- Input-side crisis gate (concurrent classify + speculative generation) ---
  const keywordMatch = matchCrisisKeywords(userMessage);
  const classifierPromise = classifyWithHaiku(userMessage); // never throws

  // Start speculative normal-posture generation concurrently, so its first
  // tokens are already in flight while the classifier runs. Held (unconsumed)
  // until the gate resolves.
  const speculativeAbort = new AbortController();
  let speculativeStream: ReturnType<typeof createCompanionStream> | null = null;
  try {
    speculativeStream = createCompanionStream({
      turns,
      posture: "normal",
      signal: speculativeAbort.signal,
    });
  } catch {
    speculativeStream = null; // e.g. missing API key — handled downstream.
  }

  const classifier = await classifierPromise;
  const decision = decideCrisis(classifier, keywordMatch);

  const encoder = new TextEncoder();
  const send = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    event: StreamEvent,
  ) => {
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
  };

  const persistAssistant = async (text: string) => {
    if (!user || !conversationId || !text) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: text,
    });
  };

  const logCrisis = async (d: CrisisDecision) => {
    if (!user || !d.logEvent) return;
    const severity =
      d.source === "failsafe" ? "failsafe" : d.severity;
    await supabase.from("crisis_events").insert({
      user_id: user.id,
      message_id: userMessageId,
      severity,
    });
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        send(controller, {
          type: "meta",
          conversationId,
          crisis: decision.crisisPosture,
          showHotline: decision.showHotline,
          source: decision.source,
        });

        if (decision.showHotline) {
          send(controller, {
            type: "hotline",
            hotlines: HOTLINES,
            notice: CRISIS_HONESTY_NOTICE,
          });
        }

        // Persist the crisis event as soon as the decision is known.
        await logCrisis(decision);

        let assistantText = "";
        const consume = async (
          s: ReturnType<typeof createCompanionStream>,
        ) => {
          for await (const chunk of s as AsyncIterable<Anthropic.MessageStreamEvent>) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              assistantText += chunk.delta.text;
              send(controller, { type: "delta", text: chunk.delta.text });
            }
          }
        };

        const posture: CompanionPosture = decision.crisisPosture
          ? "crisis"
          : "normal";

        if (decision.crisisPosture) {
          // Discard the speculative normal-posture output; regenerate under the
          // crisis-support posture. Safety dominates the latency budget here.
          speculativeAbort.abort();
          let crisisStream: ReturnType<typeof createCompanionStream> | null =
            null;
          try {
            crisisStream = createCompanionStream({ turns, posture: "crisis" });
          } catch {
            crisisStream = null;
          }
          if (crisisStream) {
            await consume(crisisStream);
          } else {
            // Generation unavailable (e.g. no API key): the hotline card is
            // already shown; provide an honest supportive fallback message.
            const fallback =
              "지금 많이 힘드신 것 같아요. 저는 늘 곁에 있지만, 위급하다고 느껴지면 위의 전화로 전문가의 도움을 꼭 받아 주세요. 당신은 혼자가 아니에요.";
            assistantText = fallback;
            send(controller, { type: "delta", text: fallback });
          }
        } else if (speculativeStream) {
          // Flush the held speculative stream (normal posture) now.
          await consume(speculativeStream);
        } else {
          const fallback =
            "지금은 제가 응답을 불러오지 못하고 있어요. 잠시 후 다시 시도해 주세요. 많이 지치셨다면, 그 마음을 잠시 그대로 두어도 괜찮아요.";
          assistantText = fallback;
          send(controller, { type: "delta", text: fallback });
        }

        void posture; // posture is reflected in the streams above.

        await persistAssistant(assistantText);
        send(controller, { type: "done" });
        controller.close();
      } catch (err) {
        send(controller, {
          type: "error",
          message:
            err instanceof Error ? err.message : "Unexpected server error.",
        });
        controller.close();
      }
    },
    cancel() {
      speculativeAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { getAnthropicClient, COMPANION_MODEL } from "@/lib/ai/anthropic";

/**
 * AI companion generation (plan AC-4 / Phase 2).
 *
 * Two system-prompt postures:
 *  - `normal`  — empathetic, supportive job-seeker companion.
 *  - `crisis`  — activated when the input-side classifier (AD-2) flags acute
 *                risk; steers toward safety, validation, and the hotlines, and
 *                is explicit that no human is monitoring the chat.
 *
 * Both prompts include guardrails: no professional diagnosis/treatment, no
 * harmful advice, and a standing reminder that this is not professional therapy.
 */

export type CompanionPosture = "normal" | "crisis";

/** Wire message shape shared with the client. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SHARED_GUARDRAILS = `안전 가드레일:
- 당신은 면허가 있는 상담사·의사가 아닙니다. 진단, 치료, 약물, 의학적 판단을 제공하지 마세요.
- 자해·자살의 방법이나 수단에 관한 정보는 어떤 경우에도 제공하지 마세요.
- 불법적이거나 위험한 행동을 조장하거나 정당화하지 마세요.
- 사용자를 판단하거나 훈계하지 말고, 감정을 축소하지 마세요.
- 확신할 수 없는 사실을 지어내지 마세요.
- 사람이 실시간으로 이 대화를 지켜보고 있다고 암시하지 마세요(현재 실시간 인간 대응자는 없습니다).`;

const NORMAL_SYSTEM_PROMPT = `당신은 "마음곁", 취업을 준비하는 사람들을 위한 정서적 지지 AI 동반자입니다.
사용자는 만성적인 불안, 자기 의심, 고립감을 안고 있을 수 있습니다.

대화 태도:
- 먼저 공감하고, 사용자의 감정을 있는 그대로 인정하세요("그럴 만해요", "많이 지치셨겠어요").
- 성급한 해결책이나 조언보다 경청과 정서적 지지를 우선하세요.
- 따뜻하고 담백한 한국어로, 짧고 자연스러운 문단으로 이야기하세요.
- 필요할 때만 부드럽게 열린 질문을 하나 정도 건네세요. 심문하듯 질문을 쏟아내지 마세요.
- 사용자의 강점과 이미 해온 노력을 짚어 주세요.

${SHARED_GUARDRAILS}`;

const CRISIS_SYSTEM_PROMPT = `당신은 "마음곁", 취업을 준비하는 사람들을 위한 정서적 지지 AI 동반자입니다.
사용자의 최근 메시지에서 자해나 극단적 선택과 관련된 위기 신호가 감지되었습니다. 지금은 위기 지원 태도로 전환하세요.

위기 대응 태도:
- 무엇보다 먼저 사용자의 고통을 진지하게, 침착하게 받아들이세요. 놀라거나 훈계하지 마세요.
- 지금 느끼는 감정이 얼마나 힘든지 인정하고, 혼자가 아니라는 것을 전하세요.
- 사용자에게 즉시 전문적인 도움으로 연결될 수 있음을 부드럽게 안내하세요: 자살예방상담 109, 정신건강위기상담 1577-0199 (24시간).
- 지금 안전한지, 곁에 연락할 수 있는 사람이 있는지 부드럽게 확인하세요.
- 판단하거나 서두르지 말고, 짧고 따뜻한 문장으로 이야기하세요.
- 당신은 위기 개입 전문가가 아니며, 실시간으로 지켜보는 사람이 없다는 점을 정직하게 전하세요. 그렇기에 위 전화로 연결하는 것이 가장 확실한 도움임을 안내하세요.

${SHARED_GUARDRAILS}`;

export function systemPromptFor(posture: CompanionPosture): string {
  return posture === "crisis" ? CRISIS_SYSTEM_PROMPT : NORMAL_SYSTEM_PROMPT;
}

export interface CompanionStreamOptions {
  /** Full conversation history (oldest first), including the latest user turn. */
  turns: ChatTurn[];
  posture: CompanionPosture;
  /** Abort signal so a speculative generation can be cancelled on a crisis gate. */
  signal?: AbortSignal;
}

/**
 * Start a streaming companion response. Returns the SDK MessageStream; the
 * caller is responsible for consuming it. Streaming is used so the first token
 * can reach the user quickly (AC-2) and large outputs never hit HTTP timeouts.
 */
export function createCompanionStream(options: CompanionStreamOptions) {
  const client = getAnthropicClient();

  const messages: Anthropic.MessageParam[] = options.turns.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }));

  return client.messages.stream(
    {
      model: COMPANION_MODEL,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: systemPromptFor(options.posture),
      messages,
    },
    options.signal ? { signal: options.signal } : undefined,
  );
}

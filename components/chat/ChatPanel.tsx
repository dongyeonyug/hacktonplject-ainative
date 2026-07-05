"use client";

import { useRef, useState } from "react";

import type { Hotline } from "@/lib/safety/hotlines";
import { HotlineCard } from "@/components/chat/HotlineCard";

/**
 * Streaming companion chat UI (plan Phase 2, AC-2 / AC-4 / AC-12).
 *
 * Consumes the /api/chat NDJSON stream: `meta` → optional `hotline` →
 * `delta`* → `done`. The hotline card renders the moment the server sends the
 * `hotline` event (input-side crisis detection), independently of the assistant
 * text stream.
 */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Crisis hotline card attached to this assistant turn, if any. */
  hotline?: { hotlines: Hotline[]; notice: string };
  crisis?: boolean;
}

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `m${idCounter}`;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;

    setError(null);
    setSending(true);
    setInput("");

    const historyForServer = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const userMsg: ChatMessage = { id: nextId(), role: "user", content: text };
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationId: conversationIdRef.current,
          history: historyForServer,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("응답을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const applyEvent = (event: {
        type: string;
        [key: string]: unknown;
      }) => {
        switch (event.type) {
          case "meta":
            if (typeof event.conversationId === "string") {
              conversationIdRef.current = event.conversationId;
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, crisis: Boolean(event.crisis) }
                  : m,
              ),
            );
            break;
          case "hotline":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      hotline: {
                        hotlines: event.hotlines as Hotline[],
                        notice: String(event.notice ?? ""),
                      },
                    }
                  : m,
              ),
            );
            scrollToBottom();
            break;
          case "delta":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + String(event.text ?? "") }
                  : m,
              ),
            );
            scrollToBottom();
            break;
          case "error":
            setError(String(event.message ?? "오류가 발생했어요."));
            break;
          default:
            break;
        }
      };

      // Parse newline-delimited JSON as it streams in.
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          if (!line) continue;
          try {
            applyEvent(JSON.parse(line));
          } catch {
            // Ignore malformed partial lines.
          }
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "오류가 발생했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
      >
        {messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            무엇이든 편하게 이야기해 주세요. 오늘 하루는 어땠나요?
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "flex justify-end"
                : "flex flex-col items-start gap-3"
            }
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-indigo-600 px-4 py-2.5 text-white">
                {m.content}
              </div>
            ) : (
              <>
                {m.hotline && (
                  <div className="w-full max-w-[85%]">
                    <HotlineCard
                      hotlines={m.hotline.hotlines}
                      notice={m.hotline.notice}
                    />
                  </div>
                )}
                {m.content && (
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-neutral-100 px-4 py-2.5 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100">
                    {m.content}
                  </div>
                )}
                {!m.content && !m.hotline && (
                  <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-4 py-2.5 text-neutral-400 dark:bg-neutral-800">
                    <span className="inline-flex gap-1">
                      <span className="animate-pulse">·</span>
                      <span className="animate-pulse">·</span>
                      <span className="animate-pulse">·</span>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          rows={1}
          placeholder="마음에 담아둔 이야기를 들려주세요…"
          className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-indigo-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="h-[44px] shrink-0 rounded-xl bg-indigo-600 px-5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          보내기
        </button>
      </form>
    </div>
  );
}

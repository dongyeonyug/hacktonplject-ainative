import Link from "next/link";

import { ChatPanel } from "@/components/chat/ChatPanel";

/**
 * Companion chat page (plan Phase 2). Renders the always-visible "not
 * professional counseling" notice (AC-4) plus the standing Korean hotline
 * numbers, above the streaming chat panel.
 */
export default function ChatPage() {
  return (
    <main className="mx-auto flex h-dvh max-w-2xl flex-col px-4 py-4 sm:px-6">
      <header className="shrink-0 space-y-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">마음곁 · 대화</h1>
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            홈
          </Link>
        </div>
        {/* AC-4: visible "not professional counseling" disclaimer. */}
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p>
            이것은 전문 심리상담이 아닙니다. 정서적 지지를 위한 AI 동반자이며,
            의료·심리상담 서비스를 대체하지 않습니다.
          </p>
          <p className="mt-1">
            위급 상황 시 자살예방상담 <strong>109</strong>, 정신건강위기상담{" "}
            <strong>1577-0199</strong> (24시간)로 연락하세요.
          </p>
        </div>
      </header>

      <ChatPanel />
    </main>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm font-medium tracking-wide text-indigo-600 dark:text-indigo-400">
          취준생 멘탈케어 AI 동반자
        </p>
        <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
          혼자 견디지 않아도 괜찮아요.
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-300">
          취업 준비의 불안과 고립감을 24시간 곁에서 함께 나눕니다. 가명으로
          시작하고, 원할 때만 더 깊은 도움으로 이어집니다.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/chat"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500"
        >
          대화 시작하기
        </Link>
        <Link
          href="/journal"
          className="inline-flex items-center justify-center rounded-lg border border-neutral-300 px-6 py-3 font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          내 기록 보기
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
        본 서비스는 정서적 지지를 위한 AI 동반자이며 전문 심리상담·의료 서비스를
        대체하지 않습니다. 위급 상황 시 자살예방상담 <strong>109</strong>,
        정신건강위기상담 <strong>1577-0199</strong>로 연락하세요.
      </p>
    </main>
  );
}

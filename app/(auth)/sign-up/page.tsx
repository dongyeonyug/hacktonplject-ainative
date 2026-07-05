import Link from "next/link";
import { signUpAction, signInWithOAuthAction } from "../actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">가입하기</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          실명이 필요 없어요. 닉네임(가명)으로 바로 시작할 수 있습니다.
        </p>
      </div>

      {message && (
        <p className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form action={signUpAction} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="pseudonym" className="text-sm font-medium">
            닉네임 (가명)
          </label>
          <input
            id="pseudonym"
            name="pseudonym"
            required
            maxLength={30}
            placeholder="예: 열심히준비중"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
        >
          가입하기
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
        또는
        <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>

      <form action={signInWithOAuthAction}>
        <input type="hidden" name="provider" value="google" />
        <button
          type="submit"
          className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Google로 계속하기
        </button>
      </form>

      <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/sign-in" className="font-medium text-indigo-600 dark:text-indigo-400">
          로그인
        </Link>
      </p>
    </main>
  );
}

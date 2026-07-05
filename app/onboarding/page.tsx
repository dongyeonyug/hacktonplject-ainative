import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/profile";
import { hasActiveConsent } from "@/lib/consent";
import { confirmAgeAction, grantOnboardingConsentAction } from "./actions";

function MinorBlocked() {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
      <h2 className="text-xl font-bold">이용이 제한됩니다</h2>
      <p className="text-neutral-600 dark:text-neutral-300">
        본 서비스는 만 19세 이상 성인만 이용할 수 있어요. 지금 힘든 시간을
        보내고 있다면, 아래 상담 전화로 언제든 연락해 주세요. 당신은 혼자가
        아닙니다.
      </p>
      <ul className="space-y-1 text-sm font-medium">
        <li>자살예방상담전화: 109 (24시간)</li>
        <li>정신건강위기상담전화: 1577-0199 (24시간)</li>
      </ul>
      <Link href="/onboarding" className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
        다시 확인하기
      </Link>
    </section>
  );
}

function AgeGate() {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
      <h2 className="text-xl font-bold">연령 확인</h2>
      <p className="text-neutral-600 dark:text-neutral-300">
        본 서비스는 만 19세 이상 성인을 위한 서비스입니다. 만 19세 이상이
        맞으신가요?
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        본 확인은 자기 신고(자가 인증) 방식으로 진행됩니다.
      </p>
      <form action={confirmAgeAction} className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          name="isAdult"
          value="true"
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
        >
          네, 만 19세 이상입니다
        </button>
        <button
          type="submit"
          name="isAdult"
          value="false"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          아니요, 19세 미만입니다
        </button>
      </form>
    </section>
  );
}

function ConsentDisclosure() {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
      <h2 className="text-xl font-bold">AI 대화 처리 동의 (필수)</h2>
      <p className="text-neutral-600 dark:text-neutral-300">
        대화를 시작하기 전에, 대화 내용이 어떻게 처리되는지 꼭 알려드릴게요.
      </p>
      <div className="space-y-2 rounded-lg bg-neutral-50 p-4 text-sm dark:bg-neutral-900">
        <p>
          회원님의 대화 메시지는 AI 응답 생성 및 위기 상황 감지를 위해{" "}
          <strong>미국(US)에 소재한 Anthropic, PBC(Claude)</strong>로 전송되어
          처리됩니다. 이는 개인정보보호법상 <strong>국외이전</strong>에
          해당하며, 대화 내용에는 정신건강 관련 <strong>민감정보</strong>가
          포함될 수 있습니다.
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>이전받는 자: Anthropic, PBC (미국)</li>
          <li>이전 목적: AI 응답 생성, 위기 신호 감지</li>
          <li>이전 항목: 대화 메시지 내용</li>
          <li>보유 기간: 동의 철회 또는 계정 삭제 시까지</li>
        </ul>
        <p>
          함께, 상담을 통해 파악된 어려움 데이터 등 민감정보를 서비스 제공
          목적으로 저장하는 것에도 동의하게 됩니다(데이터 저장 동의).
        </p>
        <p>
          동의하지 않으시면 대화 기능을 이용할 수 없어요. 동의는 언제든{" "}
          <Link href="/consent" className="font-medium text-indigo-600 dark:text-indigo-400">
            동의 관리
          </Link>{" "}
          페이지에서 철회할 수 있습니다.
        </p>
      </div>
      <form action={grantOnboardingConsentAction} className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-500"
        >
          동의하고 시작하기
        </button>
        <Link
          href="/"
          className="flex flex-1 items-center justify-center rounded-lg border border-neutral-300 px-4 py-2.5 font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          동의하지 않고 나가기
        </Link>
      </form>
    </section>
  );
}

function Completed() {
  return (
    <section className="space-y-4 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
      <h2 className="text-xl font-bold">준비가 끝났어요</h2>
      <p className="text-neutral-600 dark:text-neutral-300">
        이제 대화를 시작할 수 있어요. 동의 상태는 언제든 확인·변경할 수
        있습니다.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/chat"
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-center font-semibold text-white transition hover:bg-indigo-500"
        >
          대화 시작하기
        </Link>
        <Link
          href="/consent"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-center font-semibold transition hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          동의 관리 보기
        </Link>
      </div>
    </section>
  );
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ blocked?: string; error?: string }>;
}) {
  const { blocked, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const profile = await ensureProfile();

  let body: React.ReactNode;
  if (blocked === "minor") {
    body = <MinorBlocked />;
  } else if (!profile?.age_verified) {
    body = <AgeGate />;
  } else if (!(await hasActiveConsent("ai_processing"))) {
    body = <ConsentDisclosure />;
  } else {
    body = <Completed />;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-16">
      <header className="space-y-1">
        <p className="text-sm font-medium tracking-wide text-indigo-600 dark:text-indigo-400">
          시작하기 전에
        </p>
        <h1 className="text-2xl font-bold">환영합니다, {profile?.pseudonym ?? "회원"}님</h1>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {body}
    </main>
  );
}

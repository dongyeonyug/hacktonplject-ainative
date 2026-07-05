import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentConsents, type ConsentScope } from "@/lib/consent";
import { updateConsentAction } from "./actions";

const ROWS: { scope: ConsentScope; label: string; description: string }[] = [
  {
    scope: "ai_processing",
    label: "AI 대화 처리 (국외이전)",
    description:
      "대화 내용을 Anthropic(Claude, 미국)으로 전송해 AI 응답·위기 감지에 사용합니다. 철회 시 대화 기능을 이용할 수 없습니다.",
  },
  {
    scope: "data_storage",
    label: "대화·어려움 데이터 저장",
    description:
      "대화 기록과 백그라운드로 추출된 어려움 데이터를 서비스 제공 목적으로 저장합니다.",
  },
  {
    scope: "institution_sharing",
    label: "기관 연계 (실명 공유)",
    description:
      "동의 시에만 실명을 등록하고 공공기관/정책 연계에 활용할 수 있습니다. 동의 없이는 실명이 저장되지 않습니다.",
  },
];

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const consents = await getCurrentConsents();
  const currentByScope = new Map(consents.map((c) => [c.scope, c]));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">동의 관리</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          현재 동의 상태를 확인하고 언제든 철회하거나 다시 동의할 수 있습니다.
          철회는 새 기록을 추가하는 방식이며, 과거 기록은 법적 증빙을 위해
          삭제되지 않습니다.
        </p>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {ROWS.map((row) => {
          const current = currentByScope.get(row.scope);
          const active = current?.action === "grant";

          return (
            <div
              key={row.scope}
              className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">{row.label}</h2>
                <span
                  className={
                    active
                      ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                      : "rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                  }
                >
                  {active ? "동의함" : "동의 안 함"}
                </span>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {row.description}
              </p>
              {current && (
                <p className="text-xs text-neutral-400">
                  마지막 변경:{" "}
                  {new Date(current.occurred_at).toLocaleString("ko-KR")} (정책{" "}
                  {current.policy_version})
                </p>
              )}
              <form action={updateConsentAction}>
                <input type="hidden" name="scope" value={row.scope} />
                <input type="hidden" name="action" value={active ? "revoke" : "grant"} />
                <button
                  type="submit"
                  className={
                    active
                      ? "rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      : "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  }
                >
                  {active ? "철회하기" : "동의하기"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}

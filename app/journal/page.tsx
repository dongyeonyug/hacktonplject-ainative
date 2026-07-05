import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * AC-3: 사용자가 자신의 대화/루틴 기록을 시간순으로 되돌아보는 페이지.
 * RLS로 본인 데이터만 조회된다(messages는 conversations 조인 정책, routines는 user_id).
 */
export default async function JournalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // RLS restricts both queries to the signed-in user's own rows.
  const [{ data: messages }, { data: routines }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, role, content, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("routines")
      .select("id, activity, streak_days")
      .order("id", { ascending: false })
      .limit(50),
  ]);

  const dateFmt = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">내 기록</h1>
        <Link
          href="/chat"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          대화하러 가기
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-neutral-500">루틴</h2>
        {routines && routines.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {routines.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5 dark:border-neutral-800"
              >
                <span>{r.activity}</span>
                <span className="text-sm text-neutral-500">
                  {r.streak_days ?? 0}일 연속
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">아직 기록된 루틴이 없어요.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500">대화 기록</h2>
        {messages && messages.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
              >
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-neutral-500">
                  <span>{m.role === "user" ? "나" : "동반자"}</span>
                  <span>
                    {m.created_at ? dateFmt.format(new Date(m.created_at)) : ""}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">
            아직 대화 기록이 없어요.{" "}
            <Link href="/chat" className="text-indigo-600 hover:underline">
              첫 대화를 시작해보세요.
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}

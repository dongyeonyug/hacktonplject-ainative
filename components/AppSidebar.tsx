import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/metrics/admin-auth";
import { signOutAction } from "@/app/(auth)/actions";
import { SidebarMobileToggle } from "@/components/SidebarMobileToggle";

/**
 * Left-hand app sidebar for the authenticated surfaces (chat / recommendations
 * / journal / admin). Self-contained: it resolves the signed-in user and admin
 * status itself, so the 관리자 통계 link appears ONLY for accounts on the
 * ADMIN_EMAILS allowlist (same check as lib/metrics/admin-auth that gates the
 * dashboard). Pass `current` to mark the active page.
 */

export type NavKey =
  | "chat"
  | "recommendations"
  | "journal"
  | "survey"
  | "calendar"
  | "admin";

const ITEMS: {
  key: NavKey;
  href: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}[] = [
  { key: "chat", href: "/chat", icon: "💬", label: "대화" },
  { key: "recommendations", href: "/recommendations", icon: "🧭", label: "추천 정보" },
  { key: "journal", href: "/journal", icon: "📖", label: "내 기록" },
  { key: "survey", href: "/survey", icon: "📝", label: "마음 체크" },
  { key: "calendar", href: "/calendar", icon: "📅", label: "기분 캘린더" },
  { key: "admin", href: "/admin/metrics", icon: "📊", label: "관리자 통계", adminOnly: true },
];

const ITEM_BASE =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";
const ITEM_ACTIVE =
  "flex items-center gap-3 rounded-lg border border-indigo-600 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300";

export async function AppSidebar({ current }: { current?: NavKey }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <SidebarMobileToggle>
      <div className="flex h-full flex-col">
        <div className="px-5 pt-6 pb-4">
          <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">마음곁</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            취준생을 위한 AI 동반자
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="주요 메뉴">
          {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((i) => {
            const active = i.key === current;
            return (
              <Link
                key={i.key}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={active ? ITEM_ACTIVE : ITEM_BASE}
              >
                <span aria-hidden>{i.icon}</span>
                <span>{i.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-4 rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200">
          <p className="mb-1 font-semibold">오늘의 체크인</p>
          <p>오늘 하루, 나 자신에게 너무 엄격하지 않았나요?</p>
        </div>

        <div className="space-y-1 border-t border-neutral-200 px-3 py-4 dark:border-neutral-800">
          {user?.email && (
            <p
              className="truncate px-3 pb-1 text-xs text-neutral-400"
              title={user.email}
            >
              {user.email}
            </p>
          )}
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            홈
          </Link>
          {user && (
            <form action={signOutAction}>
              <button
                type="submit"
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              >
                로그아웃
              </button>
            </form>
          )}
        </div>
      </div>
    </SidebarMobileToggle>
  );
}

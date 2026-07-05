import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/metrics/admin-auth";
import { signOutAction } from "@/app/(auth)/actions";

/**
 * Shared top navigation for the authenticated surfaces (chat / recommendations
 * / journal / admin). Self-contained: it resolves the signed-in user and admin
 * status itself, so the 관리자 통계 link appears ONLY for accounts on the
 * ADMIN_EMAILS allowlist (same check as lib/metrics/admin-auth that gates the
 * dashboard). Pass `current` to mark the active page.
 */

export type NavKey = "chat" | "recommendations" | "journal" | "admin";

const ITEMS: {
  key: NavKey;
  href: string;
  label: string;
  adminOnly?: boolean;
}[] = [
  { key: "chat", href: "/chat", label: "💬 대화" },
  { key: "recommendations", href: "/recommendations", label: "🏛 추천 정보" },
  { key: "journal", href: "/journal", label: "📓 내 기록" },
  { key: "admin", href: "/admin/metrics", label: "📊 관리자 통계", adminOnly: true },
];

const BASE =
  "rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800";
const ACTIVE =
  "rounded-full border border-indigo-600 bg-indigo-600 px-3 py-1 text-xs font-medium text-white";

export async function AppNav({ current }: { current?: NavKey }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="주요 메뉴">
      {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((i) => {
        const active = i.key === current;
        return (
          <Link
            key={i.key}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={active ? ACTIVE : BASE}
          >
            {i.label}
          </Link>
        );
      })}
      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/"
          className="text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          홈
        </Link>
        {user && (
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              로그아웃
            </button>
          </form>
        )}
      </div>
    </nav>
  );
}

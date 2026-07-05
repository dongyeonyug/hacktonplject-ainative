import type { ComponentType } from "react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/metrics/admin-auth";
import { SidebarMobileToggle } from "@/components/SidebarMobileToggle";
import { SettingsPanel } from "@/components/SettingsPanel";
import {
  HeartsLogoIcon,
  ChatIcon,
  CalendarIcon,
  CompassIcon,
  ClipboardListIcon,
  BarChartIcon,
  SproutIcon,
  type IconProps,
} from "@/components/icons";

/**
 * Left-hand app sidebar for the authenticated surfaces (chat / calendar /
 * recommendations / self-check / admin). Self-contained: it resolves the
 * signed-in user and admin status itself, so the 관리자 통계 link appears
 * ONLY for accounts on the ADMIN_EMAILS allowlist (same check as
 * lib/metrics/admin-auth that gates the dashboard). Pass `current` to mark
 * the active page.
 *
 * `journal` and `survey` keep their routes (linked from the 설정 > 내 기록
 * panel and reused inside the 자가진단 hub) but are no longer top-level nav
 * items — the primary nav is 대화/캘린더/맞춤 정보/자가진단 per the sidebar
 * redesign.
 */

export type NavKey =
  | "chat"
  | "calendar"
  | "recommendations"
  | "self-check"
  | "journal"
  | "survey"
  | "admin";

const ITEMS: {
  key: NavKey;
  href: string;
  icon: ComponentType<IconProps>;
  label: string;
  adminOnly?: boolean;
}[] = [
  { key: "chat", href: "/chat", icon: ChatIcon, label: "대화" },
  { key: "calendar", href: "/calendar", icon: CalendarIcon, label: "캘린더" },
  { key: "recommendations", href: "/recommendations", icon: CompassIcon, label: "맞춤 정보" },
  { key: "self-check", href: "/self-check", icon: ClipboardListIcon, label: "자가진단" },
  { key: "admin", href: "/admin/metrics", icon: BarChartIcon, label: "관리자 통계", adminOnly: true },
];

const ITEM_BASE =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800";
const ITEM_ACTIVE =
  "flex items-center gap-3 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm";

export async function AppSidebar({ current }: { current?: NavKey }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <SidebarMobileToggle>
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 px-5 pt-6 pb-4">
          <HeartsLogoIcon />
          <div>
            <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">마음곁</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              취준생을 위한 AI 동반자
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3" aria-label="주요 메뉴">
          {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((i) => {
            const active = i.key === current;
            const Icon = i.icon;
            return (
              <Link
                key={i.key}
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={active ? ITEM_ACTIVE : ITEM_BASE}
              >
                <Icon className={active ? "h-5 w-5 text-white" : "h-5 w-5 text-neutral-400 dark:text-neutral-500"} />
                <span>{i.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-4 flex gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-xs leading-relaxed text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200">
          <SproutIcon className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
          <div>
            <p className="mb-1 font-semibold">오늘의 체크인</p>
            <p>오늘 하루, 나 자신에게 너무 엄격하지 않았나요?</p>
          </div>
        </div>

        <div className="border-t border-neutral-200 px-3 py-3 dark:border-neutral-800">
          <SettingsPanel userEmail={user?.email} />
        </div>
      </div>
    </SidebarMobileToggle>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";

import { signOutAction } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  GearIcon,
  UserIcon,
  XIcon,
  SunIcon,
  ShieldIcon,
  DownloadIcon,
  TrashIcon,
  LogOutIcon,
  ChevronRightIcon,
} from "@/components/icons";

type TabKey = "records" | "notifications" | "display" | "privacy" | "account";

const TABS: { key: TabKey; label: string }[] = [
  { key: "records", label: "내 기록" },
  { key: "notifications", label: "알림 설정" },
  { key: "display", label: "화면 설정" },
  { key: "privacy", label: "개인정보 및 데이터" },
  { key: "account", label: "계정 설정" },
];

const RECORD_ITEMS: { label: string; href?: string }[] = [
  { label: "AI 대화 요약", href: "/journal" },
  { label: "감정 변화 기록" },
  { label: "캘린더 활동 기록", href: "/calendar" },
  { label: "자가진단 결과", href: "/self-check" },
  { label: "설문 참여 기록" },
  { label: "저장한 맞춤 정보와 지원 프로그램", href: "/recommendations" },
];

function RowLink({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
  const content = (
    <>
      <span>{label}</span>
      <ChevronRightIcon className="h-4 w-4 text-neutral-300 dark:text-neutral-600" />
    </>
  );
  const className =
    "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800";
  if (href) {
    return (
      <Link href={href} onClick={onClick} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`w-full text-left ${className}`}>
      {content}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
    >
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-indigo-600" : "bg-neutral-200 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function SettingsPanel({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("records");
  const [notifPrefs, setNotifPrefs] = useState({
    recommend: true,
    survey: true,
    calendar: false,
  });
  const [deleteRequested, setDeleteRequested] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-400 dark:bg-indigo-950/40">
          <UserIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-700 dark:text-neutral-200" title={userEmail}>
          {userEmail ?? "게스트"}
        </span>
        <GearIcon className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-0 flex h-dvh w-full max-w-sm flex-col bg-white shadow-xl dark:bg-neutral-950">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
              <h2 className="text-base font-semibold">설정</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="설정 닫기"
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <XIcon />
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    tab === t.key
                      ? "bg-indigo-600 text-white"
                      : "text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {tab === "records" && (
                <div className="space-y-1">
                  {RECORD_ITEMS.map((item) => (
                    <RowLink
                      key={item.label}
                      label={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}

              {tab === "notifications" && (
                <div className="space-y-1">
                  <Toggle
                    label="맞춤 정보 추천 알림"
                    checked={notifPrefs.recommend}
                    onChange={(v) => setNotifPrefs((p) => ({ ...p, recommend: v }))}
                  />
                  <Toggle
                    label="정기 설문 알림"
                    checked={notifPrefs.survey}
                    onChange={(v) => setNotifPrefs((p) => ({ ...p, survey: v }))}
                  />
                  <Toggle
                    label="캘린더 일정 알림"
                    checked={notifPrefs.calendar}
                    onChange={(v) => setNotifPrefs((p) => ({ ...p, calendar: v }))}
                  />
                </div>
              )}

              {tab === "display" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    <SunIcon className="h-4 w-4 text-neutral-400" />
                    라이트 / 다크 모드
                  </div>
                  <ThemeToggle />
                  <p className="text-xs leading-relaxed text-neutral-400">
                    기본값은 기기의 시스템 설정을 따르며, 선택한 테마는 이 브라우저에
                    저장되어 다음 방문에도 유지됩니다.
                  </p>
                </div>
              )}

              {tab === "privacy" && (
                <div className="space-y-1">
                  <RowLink label="데이터 제공 동의 상태" href="/consent" onClick={() => setOpen(false)} />
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    <span className="flex items-center gap-2">
                      <DownloadIcon className="h-4 w-4 text-neutral-400" />내 데이터 다운로드
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={deleteRequested}
                    onClick={() => setDeleteRequested(true)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/30"
                  >
                    <span className="flex items-center gap-2">
                      <TrashIcon className="h-4 w-4" />
                      {deleteRequested ? "삭제 요청이 접수되었어요" : "데이터 삭제 요청"}
                    </span>
                  </button>
                  <p className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-xs leading-relaxed text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
                    <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    동의 이력은 법적 보관 의무에 따라 삭제 후에도 익명화되어 남을 수
                    있어요.
                  </p>
                </div>
              )}

              {tab === "account" && (
                <div className="space-y-1">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    프로필 수정
                  </button>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      로그아웃
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

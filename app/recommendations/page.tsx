import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { hasActiveConsent } from "@/lib/consent";
import { getProfile } from "@/lib/profile";
import {
  isDifficultyCategory,
  isValidIntensity,
  type DifficultyCategory,
} from "@/lib/extract/taxonomy";
import {
  curateInstitutions,
  type CuratedInstitution,
  type DifficultySignal,
} from "@/lib/match/curate";
import { SparkleBadgeIcon } from "@/components/icons";
import {
  grantInstitutionSharingConsentAction,
  saveRecommendationAction,
} from "./actions";

/** Cards shown per page load; "더 많은 정보 보기" bumps this via ?limit=. */
const DEFAULT_RESULT_LIMIT = 6;
const EXPANDED_RESULT_LIMIT = 12;

const CATEGORY_LABELS: Record<DifficultyCategory, string> = {
  career_anxiety: "취업 불안",
  financial_stress: "재정 스트레스",
  social_isolation: "사회적 고립",
  self_worth: "자기 가치감",
  sleep_health: "수면 건강",
  family_pressure: "가족 압박",
  burnout: "번아웃",
  uncertainty_future: "미래 불확실성",
  other: "기타",
};

interface InstitutionRow {
  id: string;
  type: string;
  name: string;
  public_info: Record<string, unknown> | null;
  categories: unknown;
}

interface DifficultyRow {
  category: unknown;
  intensity: unknown;
}

function toCuratedInstitution(row: InstitutionRow): CuratedInstitution {
  const categories = Array.isArray(row.categories)
    ? row.categories.filter(isDifficultyCategory)
    : [];
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    public_info: row.public_info ?? {},
    categories,
  };
}

function toDifficultySignal(row: DifficultyRow): DifficultySignal | null {
  if (!isDifficultyCategory(row.category) || !isValidIntensity(row.intensity)) {
    return null;
  }
  return { category: row.category, intensity: row.intensity };
}

/** Renders the public_info jsonb fields used by the 0001/0003 seed rows. */
function InstitutionInfo({ info }: { info: Record<string, unknown> }) {
  const desc = typeof info.desc === "string" ? info.desc : null;
  const url = typeof info.url === "string" ? info.url : null;
  const phone = typeof info.phone === "string" ? info.phone : null;
  const hours = typeof info.hours === "string" ? info.hours : null;

  return (
    <div className="space-y-1">
      {desc && (
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{desc}</p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {phone && (
          <a
            href={`tel:${phone.replace(/[^0-9]/g, "")}`}
            className="font-medium text-indigo-600 dark:text-indigo-400"
          >
            {phone} 전화
          </a>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-indigo-200 px-3 py-1 font-medium text-indigo-600 transition hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950"
          >
            자세히 보기
          </a>
        )}
        {hours && <span className="text-neutral-400">{hours}</span>}
      </div>
    </div>
  );
}

/**
 * AC-11 / AD-4 gate: connecting to an institution requires an active
 * `institution_sharing` consent. MVP-only — granting here flips the consent
 * ledger state, it does NOT perform a real connection or write `real_name`.
 * Actual institution connection/identity-transfer is explicitly a 2차
 * (future) feature; copy below says so.
 */
function InstitutionConnectionGate({ canConnect }: { canConnect: boolean }) {
  return (
    <section className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/20">
      <h2 className="font-semibold">기관 연결 (추후 제공 예정)</h2>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">
        기관에 실제로 연결하려면 실명 정보 공유(기관 연계) 동의가 필요해요.
        지금은 동의 상태만 미리 준비할 수 있으며, 실제 기관 연결이나 실명
        정보 이관은 아직 제공되지 않습니다(2차 기능으로 예정).
      </p>
      {canConnect ? (
        <p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          기관 연계 동의 완료 — 실제 연결 기능은 준비 중이에요.
        </p>
      ) : (
        <form action={grantInstitutionSharingConsentAction}>
          <button
            type="submit"
            className="rounded-lg border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
          >
            기관 연결 동의하기
          </button>
        </form>
      )}
      <Link
        href="/consent"
        className="block text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
      >
        동의 관리에서 상태 확인/철회하기
      </Link>
    </section>
  );
}

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string; limit?: string }>;
}) {
  const { error, saved, limit: limitParam } = await searchParams;
  const expanded = limitParam === "more";
  const limit = expanded ? EXPANDED_RESULT_LIMIT : DEFAULT_RESULT_LIMIT;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [
    { data: difficultyRows, error: difficultyError },
    { data: institutionRows, error: institutionError },
    canConnect,
    profile,
  ] = await Promise.all([
    supabase.from("difficulty_data").select("category, intensity").eq("user_id", user.id),
    supabase.from("institutions").select("id, type, name, public_info, categories"),
    hasActiveConsent("institution_sharing"),
    getProfile(),
  ]);

  if (difficultyError) throw difficultyError;
  if (institutionError) throw institutionError;

  const signals = (difficultyRows ?? [])
    .map(toDifficultySignal)
    .filter((s): s is DifficultySignal => s !== null);
  const institutions = (institutionRows ?? []).map(toCuratedInstitution);

  const results = curateInstitutions(signals, institutions, { limit });
  const hasMore = results.length >= limit && limit < EXPANDED_RESULT_LIMIT;

  // AC-10: log a "viewed" event for every institution actually shown this
  // load. Best-effort — a logging failure must never block the page render.
  if (results.length > 0) {
    const { error: viewError } = await supabase.from("recommendation_events").insert(
      results.map(({ institution }) => ({
        user_id: user.id,
        institution_id: institution.id,
        action: "viewed" as const,
      })),
    );
    if (viewError) {
      console.error("recommendation_events viewed logging failed:", viewError.message);
    }
  }

  return (
    <AppShell current="recommendations">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 sm:py-16">
        <header className="space-y-3">
          <h1 className="text-2xl font-bold">
            {profile?.pseudonym ?? "회원"}님을 위한 맞춤 정보
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            지금까지 나눈 대화에서 나타난 어려움을 바탕으로 도움이 될 만한 취업지원
            프로그램·멘탈케어 정보·청년 지원 정책을 보여드려요. 아래 정보는 모두
            공개된 안내이며, 실제 기관 제휴나 실명 정보 이관은 이루어지지 않습니다.
          </p>
        </header>

        <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:to-neutral-950">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-indigo-200/40 dark:bg-indigo-900/30" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
              <SparkleBadgeIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">마음곁과 함께, 취업 준비도 마음 관리도</p>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                나에게 맞는 지원 정책을 찾는 것도 중요하지만, 나 자신을 아는 것도
                중요해요. 자가진단으로 지금 나의 상태를 확인해보세요.
              </p>
            </div>
            <Link
              href="/self-check"
              className="hidden shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 sm:block"
            >
              자가진단 하러가기
            </Link>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            저장했어요. 언제든 다시 확인할 수 있어요.
          </p>
        )}

        <InstitutionConnectionGate canConnect={canConnect} />

        <div className="space-y-4">
          {results.length === 0 && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              아직 표시할 추천 정보가 없어요. 대화를 이어가면 더 정확한 추천을
              받을 수 있어요.
            </p>
          )}
          {results.map(({ institution, rationale }) => (
            <div
              key={institution.id}
              className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold">{institution.name}</h2>
                <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {institution.type === "hotline" ? "상시 운영" : "모집 중"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {institution.type === "hotline" ? "긴급 상담" : "공공 정보"}
                </span>
                {institution.categories.slice(0, 3).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                  >
                    {CATEGORY_LABELS[c]}
                  </span>
                ))}
              </div>
              <InstitutionInfo info={institution.public_info} />
              <p className="text-xs text-neutral-400">{rationale}</p>
              <form action={saveRecommendationAction}>
                <input type="hidden" name="institution_id" value={institution.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  저장하기
                </button>
              </form>
            </div>
          ))}
        </div>

        {hasMore && (
          <Link
            href="?limit=more"
            className="rounded-lg border border-neutral-200 px-4 py-2.5 text-center text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
          >
            더 많은 정보 보기
          </Link>
        )}
      </div>
    </AppShell>
  );
}

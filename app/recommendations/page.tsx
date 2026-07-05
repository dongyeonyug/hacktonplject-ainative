import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import { hasActiveConsent } from "@/lib/consent";
import { isDifficultyCategory, isValidIntensity } from "@/lib/extract/taxonomy";
import {
  curateInstitutions,
  type CuratedInstitution,
  type DifficultySignal,
} from "@/lib/match/curate";
import {
  grantInstitutionSharingConsentAction,
  saveRecommendationAction,
} from "./actions";

/** Cap the number of curated cards rendered per load. */
const RESULT_LIMIT = 6;

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
            className="font-medium text-indigo-600 dark:text-indigo-400"
          >
            {url}
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
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [
    { data: difficultyRows, error: difficultyError },
    { data: institutionRows, error: institutionError },
    canConnect,
  ] = await Promise.all([
    supabase.from("difficulty_data").select("category, intensity").eq("user_id", user.id),
    supabase.from("institutions").select("id, type, name, public_info, categories"),
    hasActiveConsent("institution_sharing"),
  ]);

  if (difficultyError) throw difficultyError;
  if (institutionError) throw institutionError;

  const signals = (difficultyRows ?? [])
    .map(toDifficultySignal)
    .filter((s): s is DifficultySignal => s !== null);
  const institutions = (institutionRows ?? []).map(toCuratedInstitution);

  const results = curateInstitutions(signals, institutions, { limit: RESULT_LIMIT });

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
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="space-y-3">
        <AppNav current="recommendations" />
        <h1 className="text-2xl font-bold">추천 정보</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          지금까지 나눈 대화에서 나타난 어려움을 바탕으로 도움이 될 만한 공개
          기관·정책 정보를 보여드려요. 아래 정보는 모두 공개된 안내이며, 실제
          기관 제휴나 실명 정보 이관은 이루어지지 않습니다.
        </p>
      </header>

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
                {institution.type === "hotline" ? "긴급 상담" : "공공 정보"}
              </span>
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
    </main>
  );
}

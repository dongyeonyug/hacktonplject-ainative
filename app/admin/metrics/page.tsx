import { notFound } from "next/navigation";

import { getAdminUser } from "@/lib/metrics/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIFFICULTY_CATEGORIES, type DifficultyCategory } from "@/lib/extract/taxonomy";
import {
  computeQualityMetrics,
  computeVolumeMetrics,
  computeExtractionHealth,
  QUALITY_TARGET,
  EXTRACTION_STATES,
  type QualityInputRecord,
  type ExtractionState,
} from "@/lib/metrics/quality";

// Aggregate numbers change as soon as new messages are extracted — never cache.
export const dynamic = "force-dynamic";

interface DifficultyDataRow {
  user_id: string;
  category: DifficultyCategory;
  intensity: number;
  context: string | null;
  created_at: string;
}

interface ExtractionStatusRow {
  state: ExtractionState;
}

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

const STATE_LABELS: Record<ExtractionState, string> = {
  queued: "대기",
  running: "처리 중",
  done: "완료",
  failed: "실패",
};

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * AGGREGATE-ONLY admin metrics dashboard (AC-7, AD-5, AD-7). No per-user
 * drill-down and no raw message/context content is ever rendered here — only
 * counts and scores computed by the pure functions in lib/metrics/quality.ts.
 *
 * Authorization (AD-5: "관리자 대시보드... service-role 뒤 admin-authz
 * 체크(별도 admin 역할 클레임), auth.uid() RLS 아님"):
 *   1. `getAdminUser()` (lib/metrics/admin-auth.ts) requires a signed-in
 *      Supabase session via the cookie-based, RLS-respecting `createClient()`.
 *   2. The signed-in user's email must be in the `ADMIN_EMAILS` env allowlist
 *      (comma-separated, case-insensitive) — an explicit app-level authz
 *      check, NOT a Postgres RLS policy keyed on `auth.uid()`.
 *   3. Any signed-in non-admin gets `notFound()` (404) — identical to an
 *      unauthenticated visitor's experience, so the route does not leak its
 *      existence or a distinct "unauthorized" signal to normal users.
 *   4. Only once that gate passes do we open `createAdminClient()`
 *      (service_role, bypasses RLS) to read rows for aggregation.
 *
 * De-identification: individual `difficulty_data` rows (category, intensity,
 * context, user_id, created_at) are read from the DB solely to compute
 * aggregate statistics. The raw rows/context text/user_id values are never
 * passed into the rendered JSX below — only the resulting numbers are.
 */
export default async function AdminMetricsPage() {
  const adminUser = await getAdminUser();
  if (!adminUser) notFound();

  const admin = createAdminClient();

  const [difficultyResult, statusResult] = await Promise.all([
    admin
      .from("difficulty_data")
      .select("user_id, category, intensity, context, created_at")
      .returns<DifficultyDataRow[]>(),
    admin.from("extraction_status").select("state").returns<ExtractionStatusRow[]>(),
  ]);

  if (difficultyResult.error) throw difficultyResult.error;
  if (statusResult.error) throw statusResult.error;

  const records: QualityInputRecord[] = (difficultyResult.data ?? []).map((row) => ({
    userId: row.user_id,
    category: row.category,
    intensity: row.intensity,
    context: row.context,
    createdAt: row.created_at,
  }));

  const quality = computeQualityMetrics(records);
  const volume = computeVolumeMetrics(records);
  const health = computeExtractionHealth((statusResult.data ?? []).map((row) => row.state));

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">데이터 품질/양 지표 (관리자)</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          집계 전용 대시보드입니다. 개별 사용자 드릴다운이나 원문 대화/맥락
          내용은 표시하지 않습니다 (AD-5).
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">품질 점수 (AD-7 North-star)</h2>
        <p className="text-3xl font-bold">
          {quality.qualityScore.toFixed(3)}{" "}
          <span
            className={
              quality.meetsTarget
                ? "text-sm font-medium text-emerald-600 dark:text-emerald-400"
                : "text-sm font-medium text-amber-600 dark:text-amber-400"
            }
          >
            {quality.meetsTarget
              ? `목표(${QUALITY_TARGET}) 충족`
              : `목표(${QUALITY_TARGET}) 미달`}
          </span>
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">
              카테고리 커버리지 (가중치 0.4)
            </dt>
            <dd className="text-lg font-semibold">{pct(quality.categoryCoverage)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">
              맥락 풍부도 (가중치 0.3)
            </dt>
            <dd className="text-lg font-semibold">{pct(quality.contextRichness)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">
              시간축 일관성 (가중치 0.3)
            </dt>
            <dd className="text-lg font-semibold">{pct(quality.temporalConsistency)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">데이터 양</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">총 레코드 수</dt>
            <dd className="text-lg font-semibold">
              {volume.totalRecords.toLocaleString("ko-KR")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">기여 사용자 수</dt>
            <dd className="text-lg font-semibold">
              {volume.uniqueUsers.toLocaleString("ko-KR")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">
              사용자당 평균 레코드
            </dt>
            <dd className="text-lg font-semibold">{volume.recordsPerUser.toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">카테고리별 분포</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {DIFFICULTY_CATEGORIES.map((category) => (
            <li
              key={category}
              className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900"
            >
              <span>{CATEGORY_LABELS[category]}</span>
              <span className="font-semibold">{volume.perCategoryCounts[category]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">추출 파이프라인 상태 (AD-1)</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EXTRACTION_STATES.map((state) => (
            <div key={state}>
              <dt className="text-xs text-neutral-500 dark:text-neutral-400">
                {STATE_LABELS[state]}
              </dt>
              <dd className="text-lg font-semibold">{health.counts[state]}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          총 {health.total.toLocaleString("ko-KR")}건 · 실패율 {pct(health.failureRate)}
        </p>
      </section>
    </main>
  );
}

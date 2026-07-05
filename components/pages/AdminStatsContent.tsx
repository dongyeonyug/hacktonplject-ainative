interface CategoryCount {
  label: string;
  count: number;
}

interface ExtractionStateCount {
  label: string;
  count: number;
}

/** Dummy data — replace with real aggregate query once wired into routing. */
const DUMMY_QUALITY = {
  qualityScore: 0.742,
  meetsTarget: true,
  categoryCoverage: 0.68,
  contextRichness: 0.81,
  temporalConsistency: 0.7,
};

const DUMMY_VOLUME = {
  totalRecords: 1284,
  uniqueUsers: 156,
  recordsPerUser: 8.23,
};

const DUMMY_CATEGORY_COUNTS: CategoryCount[] = [
  { label: "취업 불안", count: 312 },
  { label: "재정 스트레스", count: 198 },
  { label: "사회적 고립", count: 145 },
  { label: "자기 가치감", count: 121 },
  { label: "수면 건강", count: 167 },
  { label: "가족 압박", count: 89 },
  { label: "번아웃", count: 176 },
  { label: "미래 불확실성", count: 76 },
];

const DUMMY_EXTRACTION_STATES: ExtractionStateCount[] = [
  { label: "대기", count: 4 },
  { label: "처리 중", count: 2 },
  { label: "완료", count: 1268 },
  { label: "실패", count: 10 },
];

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Standalone admin-stats content component (dummy data only).
 * Intended to be dropped into a route/layout later — no sidebar, app shell,
 * or routing/authorization logic here.
 */
export function AdminStatsContent() {
  const totalStates = DUMMY_EXTRACTION_STATES.reduce((sum, s) => sum + s.count, 0);
  const failureCount =
    DUMMY_EXTRACTION_STATES.find((s) => s.label === "실패")?.count ?? 0;
  const failureRate = totalStates > 0 ? failureCount / totalStates : 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">데이터 품질/양 지표 (관리자)</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          예시 데이터입니다. 실제 집계 쿼리 연결 전 화면 구성용입니다.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">품질 점수</h2>
        <p className="text-3xl font-bold">
          {DUMMY_QUALITY.qualityScore.toFixed(3)}{" "}
          <span
            className={
              DUMMY_QUALITY.meetsTarget
                ? "text-sm font-medium text-emerald-600 dark:text-emerald-400"
                : "text-sm font-medium text-amber-600 dark:text-amber-400"
            }
          >
            {DUMMY_QUALITY.meetsTarget ? "목표 충족" : "목표 미달"}
          </span>
        </p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">
              카테고리 커버리지
            </dt>
            <dd className="text-lg font-semibold">{pct(DUMMY_QUALITY.categoryCoverage)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">맥락 풍부도</dt>
            <dd className="text-lg font-semibold">{pct(DUMMY_QUALITY.contextRichness)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">
              시간축 일관성
            </dt>
            <dd className="text-lg font-semibold">
              {pct(DUMMY_QUALITY.temporalConsistency)}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">데이터 양</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">총 레코드 수</dt>
            <dd className="text-lg font-semibold">
              {DUMMY_VOLUME.totalRecords.toLocaleString("ko-KR")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">기여 사용자 수</dt>
            <dd className="text-lg font-semibold">
              {DUMMY_VOLUME.uniqueUsers.toLocaleString("ko-KR")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-500 dark:text-neutral-400">
              사용자당 평균 레코드
            </dt>
            <dd className="text-lg font-semibold">{DUMMY_VOLUME.recordsPerUser.toFixed(2)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">카테고리별 분포</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          {DUMMY_CATEGORY_COUNTS.map((c) => (
            <li
              key={c.label}
              className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-900"
            >
              <span>{c.label}</span>
              <span className="font-semibold">{c.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800">
        <h2 className="font-semibold">추출 파이프라인 상태</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DUMMY_EXTRACTION_STATES.map((s) => (
            <div key={s.label}>
              <dt className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</dt>
              <dd className="text-lg font-semibold">{s.count}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          실패율 {pct(failureRate)}
        </p>
      </section>
    </div>
  );
}

export default AdminStatsContent;

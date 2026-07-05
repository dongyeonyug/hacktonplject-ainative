interface RoutineRecord {
  id: string;
  activity: string;
  streakDays: number;
}

interface MoodLogRecord {
  id: string;
  createdAt: string;
  summary: string;
}

/** Dummy data — replace with real Supabase-backed data once wired into routing. */
const DUMMY_ROUTINES: RoutineRecord[] = [
  { id: "r1", activity: "아침 산책 10분", streakDays: 5 },
  { id: "r2", activity: "이력서 한 줄 다듬기", streakDays: 2 },
];

const DUMMY_LOGS: MoodLogRecord[] = [
  {
    id: "l1",
    createdAt: "2026-07-05T09:12:00+09:00",
    summary: "면접 준비로 긴장했지만 잘 마쳤다는 이야기를 나눴어요.",
  },
  {
    id: "l2",
    createdAt: "2026-07-03T21:40:00+09:00",
    summary: "며칠간 잠을 설쳤다는 이야기를 나눴어요.",
  },
  {
    id: "l3",
    createdAt: "2026-07-01T18:05:00+09:00",
    summary: "오랜만에 친구를 만나 기분이 좋아졌다는 이야기를 나눴어요.",
  },
];

const dateFmt = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * Standalone "my record" content component (dummy data only).
 * Intended to be dropped into a route/layout later — no sidebar, app shell,
 * or routing logic here.
 */
export function MyRecordContent() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">내 기록</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          예시 데이터입니다. 실제 라우팅 연결 전 화면 구성용입니다.
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          루틴
        </h2>
        <ul className="flex flex-col gap-2">
          {DUMMY_ROUTINES.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-4 py-2.5 dark:border-neutral-800"
            >
              <span>{r.activity}</span>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {r.streakDays}일 연속
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          대화 기록 요약
        </h2>
        <ul className="flex flex-col gap-3">
          {DUMMY_LOGS.map((log) => (
            <li
              key={log.id}
              className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800"
            >
              <div className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
                {dateFmt.format(new Date(log.createdAt))}
              </div>
              <p className="text-sm">{log.summary}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default MyRecordContent;

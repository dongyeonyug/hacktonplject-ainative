interface RecommendedProgram {
  id: string;
  name: string;
  category: string;
  description: string;
  matchReason: string;
  url?: string;
}

/** Dummy data — replace with real curated results once wired into routing. */
const DUMMY_PROGRAMS: RecommendedProgram[] = [
  {
    id: "prog-1",
    name: "청년 취업 아카데미",
    category: "직무 교육",
    description: "IT/사무 직무 실무 교육과 모의 면접을 제공하는 무료 프로그램입니다.",
    matchReason: "최근 대화에서 나타난 '취업 불안' 신호와 관련돼요.",
    url: "https://www.work24.go.kr",
  },
  {
    id: "prog-2",
    name: "청년 마음건강 바우처",
    category: "심리 지원",
    description: "전문 상담사와의 1:1 상담 비용을 지원하는 정책 프로그램입니다.",
    matchReason: "최근 대화에서 나타난 '번아웃' 신호와 관련돼요.",
  },
  {
    id: "prog-3",
    name: "구직자 생활안정 지원금",
    category: "재정 지원",
    description: "구직활동 중 생활비 일부를 지원하는 제도입니다.",
    matchReason: "최근 대화에서 나타난 '재정 스트레스' 신호와 관련돼요.",
  },
];

/**
 * Standalone program-recommendation content component (dummy data only).
 * Intended to be dropped into a route/layout later — no sidebar, app shell,
 * or routing logic here.
 */
export function ProgramRecommendContent() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">맞춤 프로그램 추천</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          예시 데이터입니다. 실제 추천 로직 연결 전 화면 구성용입니다.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {DUMMY_PROGRAMS.map((program) => (
          <div
            key={program.id}
            className="space-y-2 rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-semibold">{program.name}</h2>
              <span className="shrink-0 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {program.category}
              </span>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {program.description}
            </p>
            <p className="text-xs text-neutral-400">{program.matchReason}</p>
            {program.url && (
              <a
                href={program.url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                자세히 보기
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProgramRecommendContent;

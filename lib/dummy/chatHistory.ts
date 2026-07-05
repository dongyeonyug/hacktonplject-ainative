import type { DifficultyCategory } from "@/lib/extract/taxonomy";

export interface ChatHistoryEntry {
  id: string;
  title: string;
  date: string; // ISO
  preview: string;
  category: DifficultyCategory;
  tags: string[];
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

export function categoryLabel(category: DifficultyCategory): string {
  return CATEGORY_LABELS[category];
}

/** Dummy data — replace with real conversation history once wired to Supabase. */
export const CHAT_HISTORY: ChatHistoryEntry[] = [
  {
    id: "c1",
    title: "면접 결과 발표를 앞두고 느낀 긴장",
    date: "2026-07-03T21:40:00+09:00",
    preview: "내일 발표인데 계속 안 좋은 상상만 하게 돼요. 잠도 잘 안 오고...",
    category: "career_anxiety",
    tags: ["면접", "불안"],
  },
  {
    id: "c2",
    title: "이번 달 생활비 걱정",
    date: "2026-06-28T13:05:00+09:00",
    preview: "공모전 준비하느라 알바 시간을 줄였더니 생활비가 빠듯해졌어요.",
    category: "financial_stress",
    tags: ["생활비", "알바"],
  },
  {
    id: "c3",
    title: "오랜만에 친구를 만난 이야기",
    date: "2026-06-25T18:10:00+09:00",
    preview: "취준 시작하고 처음으로 친구를 만났는데 생각보다 마음이 편해졌어요.",
    category: "social_isolation",
    tags: ["친구", "회복"],
  },
  {
    id: "c4",
    title: "계속되는 탈락에 자신감이 떨어져요",
    date: "2026-06-20T22:15:00+09:00",
    preview: "이번에도 서류에서 떨어졌어요. 내가 부족한 사람인 것 같아요.",
    category: "self_worth",
    tags: ["탈락", "자존감"],
  },
  {
    id: "c5",
    title: "요즘 계속 새벽에 깨요",
    date: "2026-06-15T07:30:00+09:00",
    preview: "잠들어도 두세 시간마다 깨서 다시 잠들기가 힘들어요.",
    category: "sleep_health",
    tags: ["불면", "피로"],
  },
  {
    id: "c6",
    title: "부모님이 자꾸 취업 얘기를 꺼내세요",
    date: "2026-06-10T20:00:00+09:00",
    preview: "명절도 아닌데 통화할 때마다 취업 이야기가 나와서 부담스러워요.",
    category: "family_pressure",
    tags: ["가족", "압박감"],
  },
  {
    id: "c7",
    title: "번아웃이 온 것 같은 느낌",
    date: "2026-06-05T15:45:00+09:00",
    preview: "요즘은 이력서 한 줄 쓰는 것도 힘에 부쳐요.",
    category: "burnout",
    tags: ["번아웃", "무기력"],
  },
  {
    id: "c8",
    title: "졸업 후 방향이 잘 안 보여요",
    date: "2026-05-30T11:20:00+09:00",
    preview: "이 길이 맞는지 확신이 안 서요. 다른 선택지도 고민 중이에요.",
    category: "uncertainty_future",
    tags: ["진로", "고민"],
  },
];

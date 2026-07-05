export interface PromoBannerData {
  id: string;
  label: string;
  title: string;
  description: string;
  tags: string[];
  deadline: string;
  benefit: string;
  buttonLabel: string;
  detail: string;
}

/** Dummy data — replace with real program feed once wired to a backend. */
export const PROMO_BANNERS: PromoBannerData[] = [
  {
    id: "promo-1",
    label: "취업지원 홍보",
    title: "청년 취업역량 강화 프로그램 참여자 모집",
    description: "이력서 컨설팅부터 실전 면접까지, 취업 준비 과정을 함께 지원합니다.",
    tags: ["취업 컨설팅", "면접 준비", "온라인 가능"],
    deadline: "모집 마감: 이번 달 말",
    benefit: "참가비 무료",
    buttonLabel: "프로그램 자세히 보기",
    detail:
      "이력서·자기소개서 1:1 첨삭과 모의 면접을 8주간 제공하는 프로그램이에요. 매주 온라인으로 진행되며, 취업 준비생이라면 누구나 무료로 신청할 수 있어요. (더미 상세 — 실제 신청 연동은 준비 중입니다.)",
  },
  {
    id: "promo-2",
    label: "추천 프로그램",
    title: "현직자와 함께하는 직무 멘토링",
    description: "관심 직무의 실제 업무와 준비 방향을 현직자에게 직접 들어보세요.",
    tags: ["직무 탐색", "멘토링", "사전 신청"],
    deadline: "다음 기수: 격주 목요일",
    benefit: "1:1 매칭",
    buttonLabel: "멘토링 신청하기",
    detail:
      "관심 직무를 선택하면 현직자와 1:1로 매칭되어 실무 이야기를 들을 수 있는 멘토링이에요. 회당 40분, 온라인으로 진행돼요. (더미 상세 — 실제 신청 연동은 준비 중입니다.)",
  },
  {
    id: "promo-3",
    label: "청년 지원 정보",
    title: "취업 준비생을 위한 맞춤 지원 정책",
    description: "교육, 상담, 교통비, 취업 활동 지원 정보를 한 번에 확인하세요.",
    tags: ["청년 정책", "지원금", "지역 프로그램"],
    deadline: "상시 확인 가능",
    benefit: "지역별 안내",
    buttonLabel: "지원 정보 보기",
    detail:
      "거주 지역 기준으로 받을 수 있는 청년 지원 정책을 모아볼 수 있어요. 교육비, 교통비, 활동지원금 등 항목별로 정리되어 있어요. (더미 상세 — 실제 데이터 연동은 준비 중입니다.)",
  },
];

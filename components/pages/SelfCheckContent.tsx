"use client";

import { useState } from "react";

import { BannerCard, type BannerAccent } from "@/components/banners/BannerCard";
import {
  BriefcaseIcon,
  UsersIcon,
  SmileIcon,
  ClipboardListIcon,
  ChatIcon,
  CompassIcon,
  BellIcon,
  QuoteIcon,
  type IconProps,
} from "@/components/icons";
import type { ComponentType } from "react";

type DiagnosisStatus = "not_started" | "completed";

interface DiagnosisDef {
  id: string;
  title: string;
  description: string;
  tag: string;
  duration: string;
  accent: BannerAccent;
  icon: ComponentType<IconProps>;
}

const DIAGNOSES: DiagnosisDef[] = [
  {
    id: "job-fit",
    title: "직업 적성 검사",
    description: "나에게 잘 맞는 직무와 업무 성향을 확인해 보세요.",
    tag: "직무 추천",
    duration: "약 10분",
    accent: "blue",
    icon: BriefcaseIcon,
  },
  {
    id: "workplace-fit",
    title: "직장 적성 검사",
    description: "내가 편하게 일할 수 있는 조직 문화와 업무 환경을 알아보세요.",
    tag: "조직 문화",
    duration: "약 8분",
    accent: "mint",
    icon: UsersIcon,
  },
  {
    id: "personality",
    title: "성격 유형 검사",
    description: "나의 성격 특성과 소통 방식을 바탕으로 취업 준비 방향을 찾아보세요.",
    tag: "자기 이해",
    duration: "약 7분",
    accent: "purple",
    icon: SmileIcon,
  },
  {
    id: "stress",
    title: "취업 준비 스트레스 진단",
    description: "최근 취업 준비 과정에서 느끼는 부담과 감정 상태를 점검해 보세요.",
    tag: "마음 건강",
    duration: "약 5분",
    accent: "blue",
    icon: ClipboardListIcon,
  },
];

type SurveyStatus = "required" | "done";

interface SurveyDef {
  id: string;
  title: string;
  description: string;
  due: string;
  accent: BannerAccent;
  icon: ComponentType<IconProps>;
  initialStatus: SurveyStatus;
}

const SURVEYS: SurveyDef[] = [
  {
    id: "current-concerns",
    title: "현재 고민사항 설문",
    description: "요즘 가장 크게 느끼는 고민을 알려주시면 대화와 추천에 반영할게요.",
    due: "권장: 매주 월요일",
    accent: "purple",
    icon: ChatIcon,
    initialStatus: "required",
  },
  {
    id: "job-status",
    title: "취업 상태 확인 설문",
    description: "현재 구직 활동 단계를 확인하고 맞춤 정보를 조정해 드려요.",
    due: "마감: 이번 달 말",
    accent: "blue",
    icon: CompassIcon,
    initialStatus: "required",
  },
  {
    id: "support-needs",
    title: "필요한 지원 조사",
    description: "어떤 종류의 지원이 가장 필요한지 알려주세요.",
    due: "권장: 2주에 한 번",
    accent: "mint",
    icon: BellIcon,
    initialStatus: "done",
  },
  {
    id: "feedback",
    title: "서비스 이용 후기",
    description: "마음곁을 이용하며 느낀 점을 자유롭게 남겨주세요.",
    due: "상시 참여 가능",
    accent: "purple",
    icon: QuoteIcon,
    initialStatus: "done",
  },
];

const FEATURED = DIAGNOSES[3];

/**
 * Standalone self-check ("자가진단") hub content — dummy data + local-only
 * completion state. Intended to be dropped into a route/layout later; the
 * actual test flows and survey submission are future work.
 */
export function SelfCheckContent() {
  const [statuses, setStatuses] = useState<Record<string, DiagnosisStatus>>({});
  const [surveyStatuses, setSurveyStatuses] = useState<Record<string, SurveyStatus>>(
    Object.fromEntries(SURVEYS.map((s) => [s.id, s.initialStatus])),
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">나를 더 잘 이해하는 자가진단</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          현재 상태와 성향을 확인하고, 나에게 맞는 취업 지원 정보를 추천받아 보세요.
        </p>
      </header>

      <BannerCard
        large
        accent={FEATURED.accent}
        icon={FEATURED.icon}
        tag="오늘의 추천 진단"
        meta={FEATURED.duration}
        title={FEATURED.title}
        description={FEATURED.description}
        primaryLabel={statuses[FEATURED.id] === "completed" ? "결과 보기" : "시작하기"}
        onPrimaryClick={() =>
          setStatuses((prev) => ({ ...prev, [FEATURED.id]: "completed" }))
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">상시 진단</h2>
        <div className="flex flex-col gap-4">
          {DIAGNOSES.map((d) => {
            const status = statuses[d.id] ?? "not_started";
            return (
              <BannerCard
                key={d.id}
                accent={d.accent}
                icon={d.icon}
                tag={d.tag}
                meta={d.duration}
                title={d.title}
                description={d.description}
                statusLabel={status === "completed" ? "완료" : undefined}
                statusVariant="done"
                primaryLabel={status === "completed" ? "다시 검사하기" : "검사 시작하기"}
                secondaryLabel={status === "completed" ? "결과 보기" : undefined}
                onPrimaryClick={() =>
                  setStatuses((prev) => ({
                    ...prev,
                    [d.id]: prev[d.id] === "completed" ? "not_started" : "completed",
                  }))
                }
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">정기 설문</h2>
        <div className="flex flex-col gap-4">
          {SURVEYS.map((s) => {
            const status = surveyStatuses[s.id];
            return (
              <BannerCard
                key={s.id}
                accent={s.accent}
                icon={s.icon}
                meta={s.due}
                title={s.title}
                description={s.description}
                statusLabel={status === "done" ? "참여 완료" : "참여 필요"}
                statusVariant={status === "done" ? "done" : "pending"}
                primaryLabel={status === "done" ? "다시 참여하기" : "참여하기"}
                onPrimaryClick={() =>
                  setSurveyStatuses((prev) => ({
                    ...prev,
                    [s.id]: prev[s.id] === "done" ? "required" : "done",
                  }))
                }
                footNote="설문에 참여하면 맞춤 정보 추천이 더 정확해집니다."
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default SelfCheckContent;

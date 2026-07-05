"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";

import { BannerCard, type BannerAccent } from "@/components/banners/BannerCard";
import { CHECK_DEFINITIONS } from "@/lib/selfCheck/definitions";
import { getProgress } from "@/lib/selfCheck/storage";
import type { CheckProgress } from "@/lib/selfCheck/types";
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

const PRESENTATION: Record<string, { accent: BannerAccent; icon: ComponentType<IconProps> }> = {
  "job-fit": { accent: "blue", icon: BriefcaseIcon },
  "workplace-fit": { accent: "mint", icon: UsersIcon },
  personality: { accent: "purple", icon: SmileIcon },
  stress: { accent: "blue", icon: ClipboardListIcon },
  "current-concerns": { accent: "purple", icon: ChatIcon },
  "job-status": { accent: "blue", icon: CompassIcon },
  "support-needs": { accent: "mint", icon: BellIcon },
  feedback: { accent: "purple", icon: QuoteIcon },
};

const DIAGNOSES = CHECK_DEFINITIONS.filter((d) => d.kind === "diagnosis");
const SURVEYS = CHECK_DEFINITIONS.filter((d) => d.kind === "survey");
const FEATURED = DIAGNOSES.find((d) => d.id === "stress") ?? DIAGNOSES[0];

/**
 * Standalone self-check ("자가진단") hub — reads completion status from
 * localStorage (lib/selfCheck/storage.ts) so banners reflect real progress.
 * Clicking a banner navigates to /self-check/[testId], which renders the
 * full survey-taking dashboard for that definition.
 */
export function SelfCheckContent() {
  const [progress, setProgress] = useState<Record<string, CheckProgress | null>>({});

  useEffect(() => {
    const next: Record<string, CheckProgress | null> = {};
    for (const def of CHECK_DEFINITIONS) {
      next[def.id] = getProgress(def.id);
    }
    setProgress(next);
  }, []);

  const featuredStatus = progress[FEATURED.id]?.status;

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
        accent={PRESENTATION[FEATURED.id].accent}
        icon={PRESENTATION[FEATURED.id].icon}
        tag="오늘의 추천 진단"
        meta={FEATURED.duration}
        title={FEATURED.title}
        description={FEATURED.description}
        primaryLabel={featuredStatus === "completed" ? "결과 보기" : "시작하기"}
        primaryHref={`/self-check/${FEATURED.id}`}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">상시 진단</h2>
        <div className="flex flex-col gap-4">
          {DIAGNOSES.map((d) => {
            const status = progress[d.id]?.status;
            const done = status === "completed";
            return (
              <BannerCard
                key={d.id}
                accent={PRESENTATION[d.id].accent}
                icon={PRESENTATION[d.id].icon}
                tag={d.tag}
                meta={d.duration}
                title={d.title}
                description={d.description}
                statusLabel={done ? "완료" : status === "in_progress" ? "진행 중" : undefined}
                statusVariant="done"
                primaryLabel={done ? "결과 보기" : status === "in_progress" ? "이어서 하기" : "검사 시작하기"}
                primaryHref={`/self-check/${d.id}`}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">정기 설문</h2>
        <div className="flex flex-col gap-4">
          {SURVEYS.map((s) => {
            const status = progress[s.id]?.status;
            const done = status === "completed";
            return (
              <BannerCard
                key={s.id}
                accent={PRESENTATION[s.id].accent}
                icon={PRESENTATION[s.id].icon}
                meta={s.tag}
                title={s.title}
                description={s.description}
                statusLabel={done ? "참여 완료" : "참여 필요"}
                statusVariant={done ? "done" : "pending"}
                primaryLabel={done ? "다시 참여하기" : "참여하기"}
                primaryHref={`/self-check/${s.id}`}
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

import type { AnswerValue, CheckDefinition, CheckResult } from "./types";

function tallyArchetypes(def: CheckDefinition, answers: Record<string, AnswerValue>): string {
  const counts: Record<string, number> = {};
  for (const q of def.questions) {
    const value = answers[q.id];
    if (typeof value !== "string") continue;
    const option = q.options?.find((o) => o.value === value);
    if (!option?.archetype) continue;
    counts[option.archetype] = (counts[option.archetype] ?? 0) + 1;
  }
  let winner = Object.keys(def.archetypes ?? {})[0] ?? "";
  let best = -1;
  for (const [key, count] of Object.entries(counts)) {
    if (count > best) {
      best = count;
      winner = key;
    }
  }
  return winner;
}

function scoreLikertSum(def: CheckDefinition, answers: Record<string, AnswerValue>): number {
  let sum = 0;
  for (const q of def.questions) {
    const value = answers[q.id];
    if (typeof value === "string" && value !== "") sum += Number(value);
  }
  return sum;
}

function stressResult(def: CheckDefinition, answers: Record<string, AnswerValue>): CheckResult {
  const sum = scoreLikertSum(def, answers);
  const max = def.questions.length * 3;
  const ratio = max > 0 ? sum / max : 0;

  let level: "low" | "medium" | "high";
  let summary: string;
  if (ratio < 1 / 3) {
    level = "low";
    summary = "지금은 비교적 안정적으로 잘 관리하고 있는 편이에요.";
  } else if (ratio < 2 / 3) {
    level = "medium";
    summary = "약간의 부담과 피로가 쌓여있는 상태예요. 잠시 쉬어가는 것도 좋아요.";
  } else {
    level = "high";
    summary = "요즘 부담과 긴장이 꽤 크게 느껴지는 시기인 것 같아요.";
  }

  const levelLabel = level === "low" ? "낮음" : level === "medium" ? "보통" : "높음";

  return {
    title: `현재 부담 정도: ${levelLabel}`,
    tags: [`부담 ${levelLabel}`],
    summary,
    level,
    disclaimer: "진단 결과가 아니라 현재 상태를 점검하기 위한 참고용 결과입니다.",
    recommendations:
      level === "high"
        ? [
            { label: "AI와 대화하기", href: "/chat" },
            { label: "일정 정리하러 가기", href: "/calendar" },
            { label: "멘탈케어·상담 기관 정보 보기", href: "/recommendations" },
          ]
        : undefined,
  };
}

function participationResult(def: CheckDefinition): CheckResult {
  return {
    title: "참여해주셔서 감사합니다",
    tags: [def.tag],
    summary: "응답해주신 내용은 앞으로의 대화와 맞춤 정보 추천에 반영될게요.",
  };
}

/** Pure — computes the result screen content for a completed check. */
export function computeResult(
  def: CheckDefinition,
  answers: Record<string, AnswerValue>,
): CheckResult {
  switch (def.scoring) {
    case "archetype-tally": {
      const winner = tallyArchetypes(def, answers);
      const archetype = def.archetypes?.[winner];
      if (!archetype) {
        return { title: def.title, tags: [], summary: "응답을 확인했어요." };
      }
      return {
        title: archetype.title,
        tags: archetype.keywords,
        summary: archetype.description,
        recommendations: [{ label: "맞춤 정보 보러가기", href: "/recommendations" }],
      };
    }
    case "likert-sum":
      return stressResult(def, answers);
    case "participation":
    default:
      return participationResult(def);
  }
}

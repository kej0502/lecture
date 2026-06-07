// 항목별 정성 평가 문구 생성(점수 구간별 서술).
import type { Dimension } from "@/lib/rubric";

type Tier = "high" | "mid" | "low";

function tier(value: number): Tier {
  if (value >= 75) return "high";
  if (value >= 50) return "mid";
  return "low";
}

const TEMPLATES: Record<Dimension, Record<Tier, string>> = {
  DELIVERY: {
    high: "개념을 체계적으로 정의·예시하며 군더더기 없이 명료하게 전달합니다.",
    mid: "설명 흐름은 갖췄으나 일부 정의 누락이나 군더더기가 보입니다.",
    low: "설명 구조나 용어 정의가 부족해 전달이 다소 모호합니다.",
  },
  ENGAGEMENT: {
    high: "발문·예시·상호작용으로 학생의 참여를 적극 유도합니다.",
    mid: "참여 유도 요소가 있으나 빈도가 다소 부족합니다.",
    low: "발문·예시 등 참여 유도가 부족해 몰입을 끌어내기 어렵습니다.",
  },
  PACING: {
    high: "발화 속도와 호흡이 적정해 따라가기 편안합니다.",
    mid: "전반적 속도는 무난하나 일부 구간이 빠르거나 휴지가 부족합니다.",
    low: "발화 속도나 휴지가 적정 범위를 벗어나 이해에 부담이 될 수 있습니다.",
  },
  PRESENTATION: {
    high: "문장이 깔끔하고 군더더기가 적어 전달 태도가 안정적입니다.",
    mid: "전달은 무난하나 군더더기나 중복 표현이 일부 보입니다.",
    low: "군더더기·미완결 문장이 잦아 전달 태도 보완이 필요합니다.",
  },
  ACCURACY: {
    high: "개념 정의와 논리 전개가 충실해 설명의 정확성이 높아 보입니다(사실 검증은 전문가 확인 권장).",
    mid: "설명은 대체로 갖췄으나 정의·논리 연결을 더 보강하면 좋습니다(사실 검증은 전문가 확인 권장).",
    low: "개념 정의·논리 연결이 부족해 정확성 확인이 필요합니다(사실 검증은 전문가 확인 권장).",
  },
  CURRICULUM: {
    high: "해당 교육과정 성취기준을 폭넓게 다룹니다.",
    mid: "교육과정 성취기준을 일부 다루나 커버리지가 제한적입니다.",
    low: "다룬 성취기준이 적어 교육과정 연계가 약합니다.",
  },
  DIFFICULTY: {
    high: "대상 학습자 수준에 난이도가 잘 맞습니다.",
    mid: "난이도가 대체로 맞으나 대상 대비 다소 차이가 있습니다.",
    low: "대상 수준과 난이도 격차가 커 조정이 필요합니다.",
  },
  READABILITY: {
    high: "교재 구성과 가독성이 우수합니다.",
    mid: "교재 구성은 무난하나 일부 개선 여지가 있습니다.",
    low: "교재 구성·가독성 보완이 필요합니다.",
  },
};

export function qualitativeText(dimension: Dimension, value: number): string {
  return TEMPLATES[dimension][tier(value)];
}

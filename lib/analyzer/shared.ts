// 분석기 공통: 프롬프트 빌드 + 결과 → DimensionScore 매핑. (Claude/Gemini 공용)
import type { DimensionScore } from "@/lib/metrics/types";
import {
  CATEGORY_LABEL,
  type Dimension,
  DIMENSIONS,
  TARGET_LEVEL_LABEL,
  categoryAverage,
} from "@/lib/rubric";
import type { AnalysisResult, AnalyzeInput } from "./types";

export const DIMENSION_IDS = DIMENSIONS.map((d) => d.dimension);

export interface RawDim {
  dimension: Dimension;
  value: number;
  comment: string;
  qualitative: string;
  evidence: { time: string; text: string; reason: string }[];
}
export interface RawResult {
  summary: string;
  dimensions: RawDim[];
}

export function buildPrompt(input: AnalyzeInput): {
  system: string;
  user: string;
} {
  const rubricText = DIMENSIONS.map(
    (d) =>
      `- ${d.dimension} (${CATEGORY_LABEL[d.category]} > ${d.label}): ${d.explain}`,
  ).join("\n");

  const standardsText = input.standards.length
    ? input.standards
        .map(
          (s) => `[${s.code}] ${s.statement} (키워드: ${s.keywords.join(", ")})`,
        )
        .join("\n")
    : "(등록된 성취기준 없음)";

  const levelLabel = input.targetLevel
    ? (TARGET_LEVEL_LABEL[input.targetLevel] ?? input.targetLevel)
    : "미지정";

  const system =
    "당신은 고등 온라인 강의를 평가하는 전문 심사위원입니다. 제공된 자막(타임스탬프 포함 가능)과 교재 텍스트만을 근거로 각 평가 항목을 0~100점으로 채점하세요. 추측을 피하고 자료에 드러난 근거에 기반해 채점하며, evidence에는 가능하면 자막 타임스탬프(mm:ss)를 포함하세요. 반드시 8개 항목 전부를 채점해야 합니다. 모든 출력은 한국어로 작성하세요.";

  const user = [
    `## 평가 항목(루브릭)\n${rubricText}`,
    `## 대상 등급대\n${levelLabel}`,
    `## 교육과정 성취기준\n${standardsText}`,
    `## 강의 자막/스크립트\n${input.subtitle.text || "(자막 없음)"}`,
    input.pdf ? `## 교재 텍스트\n${input.pdf.text}` : "## 교재\n(없음)",
    "위 자료를 근거로 8개 항목을 모두 채점하세요.",
  ].join("\n\n");

  return { system, user };
}

// 모델이 돌려준 JSON → 8개 DimensionScore + 총평으로 정규화.
export function finalize(parsed: RawResult, provider: string): AnalysisResult {
  const byDim = new Map((parsed.dimensions ?? []).map((d) => [d.dimension, d]));
  const scores: DimensionScore[] = DIMENSIONS.map((def) => {
    const r = byDim.get(def.dimension);
    const value = r ? Math.max(0, Math.min(100, Math.round(r.value))) : 0;
    return {
      category: def.category,
      dimension: def.dimension,
      value,
      comment: r?.comment ?? "",
      qualitative: r?.qualitative ?? "",
      indicators: [],
      evidence: (r?.evidence ?? []).map((e) => ({
        time: e.time || undefined,
        text: e.text,
        reason: e.reason,
      })),
    };
  });

  const tAvg = categoryAverage(scores, "TEACHING");
  const cAvg = categoryAverage(scores, "CONTENT");
  const summary =
    parsed.summary ||
    `${CATEGORY_LABEL.TEACHING} ${tAvg}점 · ${CATEGORY_LABEL.CONTENT} ${cAvg}점.`;

  return { scores, summary, provider };
}

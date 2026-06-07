// Claude 분석기: ANTHROPIC_API_KEY로 실제 Claude 호출.
// AI_PROVIDER=claude + ANTHROPIC_API_KEY 환경변수가 있어야 동작한다.
// 자막(+교재)과 성취기준을 근거로 8개 루브릭 항목을 0~100점 채점한다.
import Anthropic from "@anthropic-ai/sdk";
import type { DimensionScore } from "@/lib/metrics/types";
import {
  CATEGORY_LABEL,
  type Dimension,
  DIMENSIONS,
  TARGET_LEVEL_LABEL,
  categoryAverage,
} from "@/lib/rubric";
import type { AnalysisResult, AnalyzeInput, LectureAnalyzer } from "./types";

const MODEL = "claude-opus-4-8";

interface ClaudeDim {
  dimension: Dimension;
  value: number;
  comment: string;
  qualitative: string;
  evidence: { time: string; text: string; reason: string }[];
}

export class ClaudeAnalyzer implements LectureAnalyzer {
  readonly provider = "claude";

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY가 설정되지 않았습니다. AI_PROVIDER=claude로 쓰려면 키가 필요합니다.",
      );
    }
    const client = new Anthropic({ apiKey });

    const rubricText = DIMENSIONS.map(
      (d) =>
        `- ${d.dimension} (${CATEGORY_LABEL[d.category]} > ${d.label}): ${d.explain}`,
    ).join("\n");

    const standardsText = input.standards.length
      ? input.standards
          .map(
            (s) =>
              `[${s.code}] ${s.statement} (키워드: ${s.keywords.join(", ")})`,
          )
          .join("\n")
      : "(등록된 성취기준 없음)";

    const levelLabel = input.targetLevel
      ? (TARGET_LEVEL_LABEL[input.targetLevel] ?? input.targetLevel)
      : "미지정";

    const system =
      "당신은 고등 온라인 강의를 평가하는 전문 심사위원입니다. 제공된 자막(타임스탬프 포함 가능)과 교재 텍스트만을 근거로 각 평가 항목을 0~100점으로 채점하세요. 추측을 피하고 자료에 드러난 근거에 기반해 채점하며, evidence에는 가능하면 자막 타임스탬프(mm:ss)를 포함하세요. 반드시 8개 항목 전부를 채점해야 합니다.";

    const userText = [
      `## 평가 항목(루브릭)\n${rubricText}`,
      `## 대상 등급대\n${levelLabel}`,
      `## 교육과정 성취기준\n${standardsText}`,
      `## 강의 자막/스크립트\n${input.subtitle.text || "(자막 없음)"}`,
      input.pdf ? `## 교재 텍스트\n${input.pdf.text}` : "## 교재\n(없음)",
      "위 자료를 근거로 8개 항목을 모두 채점하세요.",
    ].join("\n\n");

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: { type: "string", description: "전체 총평 2~3문장" },
        dimensions: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              dimension: {
                type: "string",
                enum: DIMENSIONS.map((d) => d.dimension),
              },
              value: { type: "integer", description: "0~100 점수" },
              comment: { type: "string", description: "채점 결과 요약 한 문장" },
              qualitative: { type: "string", description: "정성 평가 2~3문장" },
              evidence: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    time: { type: "string", description: "mm:ss, 없으면 빈 문자열" },
                    text: { type: "string" },
                    reason: { type: "string" },
                  },
                  required: ["time", "text", "reason"],
                },
              },
            },
            required: ["dimension", "value", "comment", "qualitative", "evidence"],
          },
        },
      },
      required: ["summary", "dimensions"],
    };

    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: userText }],
      // 구조화 출력: 유효한 JSON 보장
      output_config: { format: { type: "json_schema", schema } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude 응답에서 결과 JSON을 찾지 못했습니다.");
    }
    const parsed = JSON.parse(textBlock.text) as {
      summary: string;
      dimensions: ClaudeDim[];
    };

    const byDim = new Map(parsed.dimensions.map((d) => [d.dimension, d]));
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
      `${CATEGORY_LABEL.TEACHING} ${tAvg}점 · ${CATEGORY_LABEL.CONTENT} ${cAvg}점 (Claude 분석).`;

    return { scores, summary, provider: this.provider };
  }
}

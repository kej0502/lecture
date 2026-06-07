// Claude 분석기: ANTHROPIC_API_KEY(또는 사용자 키)로 실제 Claude 호출. 구조화 출력.
import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult, AnalyzeInput, LectureAnalyzer } from "./types";
import { DIMENSION_IDS, type RawResult, buildPrompt, finalize } from "./shared";

const DEFAULT_MODEL = "claude-opus-4-8";

export class ClaudeAnalyzer implements LectureAnalyzer {
  readonly provider = "claude";

  constructor(
    private readonly apiKey?: string,
    private readonly model?: string,
  ) {}

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    const apiKey = this.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Claude API 키가 없습니다. 화면에서 본인 키를 입력하거나 서버에 ANTHROPIC_API_KEY를 설정하세요.",
      );
    }
    const model = this.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    const client = new Anthropic({ apiKey });
    const { system, user } = buildPrompt(input);

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
              dimension: { type: "string", enum: DIMENSION_IDS },
              value: { type: "integer", description: "0~100 점수" },
              comment: { type: "string" },
              qualitative: { type: "string" },
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
      model,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema } },
    } as Anthropic.MessageCreateParamsNonStreaming);

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude 응답에서 결과 JSON을 찾지 못했습니다.");
    }
    return finalize(JSON.parse(textBlock.text) as RawResult, this.provider);
  }
}

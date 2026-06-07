// Gemini 분석기: Google AI Studio 무료 티어 키로 LLM 분석. (결제수단 없이 무료 사용 가능)
// REST 호출 + responseSchema(구조화 출력). 사용자 키를 인자로 받으면 우선 사용.
import type { AnalysisResult, AnalyzeInput, LectureAnalyzer } from "./types";
import { DIMENSION_IDS, type RawResult, buildPrompt, finalize } from "./shared";

const DEFAULT_MODEL = "gemini-2.5-flash";

// Gemini responseSchema(OpenAPI 서브셋: 대문자 타입, additionalProperties 미사용)
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    dimensions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          dimension: { type: "STRING", enum: DIMENSION_IDS },
          value: { type: "INTEGER" },
          comment: { type: "STRING" },
          qualitative: { type: "STRING" },
          evidence: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                time: { type: "STRING" },
                text: { type: "STRING" },
                reason: { type: "STRING" },
              },
              required: ["time", "text", "reason"],
              propertyOrdering: ["time", "text", "reason"],
            },
          },
        },
        required: ["dimension", "value", "comment", "qualitative", "evidence"],
        propertyOrdering: [
          "dimension",
          "value",
          "comment",
          "qualitative",
          "evidence",
        ],
      },
    },
  },
  required: ["summary", "dimensions"],
  propertyOrdering: ["summary", "dimensions"],
};

export class GeminiAnalyzer implements LectureAnalyzer {
  readonly provider = "gemini";

  constructor(
    private readonly apiKey?: string,
    private readonly model?: string,
  ) {}

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    const apiKey = this.apiKey ?? process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Gemini API 키가 없습니다. 화면에서 본인 키를 입력하세요. (Google AI Studio 무료 발급)",
      );
    }
    const model = this.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    const { system, user } = buildPrompt(input);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.4,
          },
        }),
      },
    );

    if (!res.ok) {
      let msg = `${res.status}`;
      try {
        const b = await res.json();
        msg = b?.error?.message ?? msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }

    const data = await res.json();
    const text: string | undefined =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const reason = data?.candidates?.[0]?.finishReason ?? "unknown";
      throw new Error(`Gemini 응답에 결과가 없습니다. (${reason})`);
    }
    return finalize(JSON.parse(text) as RawResult, this.provider);
  }
}

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
    const chosen = this.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
    const { system, user } = buildPrompt(input);
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4,
      },
    });

    // 한 모델 호출(과부하/쿼터면 최대 3회 재시도). overloaded=true면 다른 모델로 폴백.
    const call = async (
      model: string,
    ): Promise<{ text?: string; overloaded: boolean; msg: string }> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent`;
      let lastMsg = "";
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body,
        });
        if (res.ok) {
          const data = await res.json();
          const text: string | undefined =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            return {
              overloaded: false,
              msg: `Gemini 응답에 결과가 없습니다 (${data?.candidates?.[0]?.finishReason ?? "unknown"})`,
            };
          }
          return { text, overloaded: false, msg: "" };
        }
        let msg = `${res.status}`;
        try {
          msg = (await res.json())?.error?.message ?? msg;
        } catch {
          /* ignore */
        }
        lastMsg = msg;
        if (res.status !== 503 && res.status !== 429) {
          return { overloaded: false, msg };
        }
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        }
      }
      return { overloaded: true, msg: lastMsg };
    };

    // 선택 모델 → 과부하면 Flash-Lite로 자동 폴백
    const chain = [chosen, "gemini-2.5-flash-lite"].filter(
      (m, i, a) => a.indexOf(m) === i,
    );
    let lastErr = "";
    for (const m of chain) {
      const r = await call(m);
      if (r.text) return finalize(JSON.parse(r.text) as RawResult, this.provider);
      lastErr = r.msg;
      if (!r.overloaded) throw new Error(r.msg); // 과부하가 아닌 오류는 폴백 무의미
    }
    throw new Error(
      `${lastErr} — Gemini 과부하가 계속됩니다. 잠시 후 다시 시도하거나 Claude 키를 사용해 주세요.`,
    );
  }
}

// 분석기 팩토리: provider(claude/gemini/mock) + 사용자 키/모델 선택.
import { ClaudeAnalyzer } from "./claude";
import { GeminiAnalyzer } from "./gemini";
import { MockAnalyzer } from "./mock";
import type { LectureAnalyzer } from "./types";

export * from "./types";

// 사용자가 키를 전달하면 해당 provider로 동작(사용자별 키).
// provider 미지정 시 서버 환경변수 AI_PROVIDER(기본 mock)로 폴백.
export function getAnalyzer(opts?: {
  provider?: string;
  apiKey?: string;
  model?: string;
}): LectureAnalyzer {
  const provider = (
    opts?.provider ??
    process.env.AI_PROVIDER ??
    "mock"
  ).toLowerCase();
  switch (provider) {
    case "gemini":
      return new GeminiAnalyzer(opts?.apiKey, opts?.model);
    case "claude":
      return new ClaudeAnalyzer(opts?.apiKey, opts?.model);
    case "mock":
    default:
      return new MockAnalyzer();
  }
}

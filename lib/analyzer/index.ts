// 분석기 팩토리: AI_PROVIDER 환경변수로 mock/claude 선택.
import { ClaudeAnalyzer } from "./claude";
import { MockAnalyzer } from "./mock";
import type { LectureAnalyzer } from "./types";

export * from "./types";

// 사용자가 자기 Claude 키를 전달하면(opts.apiKey) 그 키로 ClaudeAnalyzer 사용.
// 없으면 서버 환경변수 AI_PROVIDER로 결정(mock 또는 서버 키 기반 claude).
export function getAnalyzer(opts?: {
  apiKey?: string;
  model?: string;
}): LectureAnalyzer {
  if (opts?.apiKey) {
    return new ClaudeAnalyzer(opts.apiKey, opts.model);
  }
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  switch (provider) {
    case "claude":
      return new ClaudeAnalyzer(undefined, opts?.model);
    case "mock":
    default:
      return new MockAnalyzer();
  }
}

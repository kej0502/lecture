// 분석기 팩토리: AI_PROVIDER 환경변수로 mock/claude 선택.
import { ClaudeAnalyzer } from "./claude";
import { MockAnalyzer } from "./mock";
import type { LectureAnalyzer } from "./types";

export * from "./types";

export function getAnalyzer(): LectureAnalyzer {
  const provider = (process.env.AI_PROVIDER ?? "mock").toLowerCase();
  switch (provider) {
    case "claude":
      return new ClaudeAnalyzer();
    case "mock":
    default:
      return new MockAnalyzer();
  }
}

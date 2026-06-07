// Claude 분석기 스텁: 추후 ANTHROPIC_API_KEY가 있으면 실제 호출로 구현.
// 지금은 인터페이스만 맞춰 두고, 호출 시 mock으로 폴백하지 않고 명시적으로 막는다.
import type { AnalysisResult, AnalyzeInput, LectureAnalyzer } from "./types";

export class ClaudeAnalyzer implements LectureAnalyzer {
  readonly provider = "claude";

  async analyze(_input: AnalyzeInput): Promise<AnalysisResult> {
    // TODO: @anthropic-ai/sdk로 자막/교재를 분석하고, frames(판서 키프레임)는 vision으로 채점.
    //       모델: claude-opus-4-8. ANTHROPIC_API_KEY 필요.
    throw new Error(
      "Claude analyzer는 아직 구현되지 않았습니다. AI_PROVIDER=mock으로 실행하세요.",
    );
  }
}

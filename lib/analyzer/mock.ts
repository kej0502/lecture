// Mock 분석기: lib/metrics가 산출한 객관 지표값을 그대로 점수로 사용(난수 아님, 동일 입력=동일 결과).
// 전 8개 항목을 자막(+교재) 기반으로 자동 채점하고 근거를 포함한다.
import { analyzeContent } from "@/lib/metrics/content";
import { analyzeTeaching } from "@/lib/metrics/teaching";
import { CATEGORY_LABEL, categoryAverage } from "@/lib/rubric";
import type { AnalysisResult, AnalyzeInput, LectureAnalyzer } from "./types";

export class MockAnalyzer implements LectureAnalyzer {
  readonly provider = "mock";

  async analyze(input: AnalyzeInput): Promise<AnalysisResult> {
    const teaching = analyzeTeaching(input.subtitle, input.runningTimeSec);
    const content = analyzeContent({
      subtitle: input.subtitle,
      pdf: input.pdf ?? null,
      standards: input.standards,
      targetLevel: input.targetLevel,
    });
    const scores = [...teaching, ...content];

    const tAvg = categoryAverage(scores, "TEACHING");
    const cAvg = categoryAverage(scores, "CONTENT");

    const summary =
      `${CATEGORY_LABEL.TEACHING} ${tAvg}점 · ${CATEGORY_LABEL.CONTENT} ${cAvg}점. ` +
      `8개 항목을 자막${input.pdf ? "·교재" : ""} 기반으로 자동 채점했습니다.`;

    return { scores, summary, provider: this.provider };
  }
}

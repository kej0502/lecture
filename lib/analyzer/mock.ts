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

    const parts: string[] = [];
    if (teaching.length > 0) {
      parts.push(
        `${CATEGORY_LABEL.TEACHING} ${categoryAverage(scores, "TEACHING")}점`,
      );
    }
    if (content.length > 0) {
      parts.push(
        `${CATEGORY_LABEL.CONTENT} ${categoryAverage(scores, "CONTENT")}점`,
      );
    }
    const hasSub = input.subtitle.text.trim() !== "";
    const source = hasSub ? (input.pdf ? "자막·교재" : "자막") : "교재";
    const summary = `${parts.join(" · ")}. ${scores.length}개 항목을 ${source} 기반으로 자동 채점했습니다.`;

    return { scores, summary, provider: this.provider };
  }
}

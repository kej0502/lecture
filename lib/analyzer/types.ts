// 분석기 입출력 타입.
import type { SubtitleDoc, PdfDoc } from "@/lib/extract/types";
import type { StandardLite } from "@/lib/metrics/content";
import type { DimensionScore } from "@/lib/metrics/types";

export interface ImageInput {
  // 추후 영상 판서 분석용 훅 (MVP 미사용)
  dataUrl: string;
  atSec?: number;
}

export interface AnalyzeInput {
  subtitle: SubtitleDoc; // 자막(없으면 segments=[], text="")
  pdf?: PdfDoc | null; // 교재
  standards: StandardLite[]; // 해당 과목·개정 성취기준
  targetLevel?: string | null;
  runningTimeSec?: number | null;
  frames?: ImageInput[]; // 추후 판서 분석용(MVP 미사용)
}

export interface AnalysisResult {
  scores: DimensionScore[];
  summary: string;
  provider: string;
}

export interface LectureAnalyzer {
  readonly provider: string;
  analyze(input: AnalyzeInput): Promise<AnalysisResult>;
}

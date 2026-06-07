// 지표(표시용)·근거·항목 점수 공통 타입.
import type { Category, Dimension } from "@/lib/rubric";

export interface Indicator {
  key: string;
  label: string;
  value: string; // 표시용 문자열 (단위 포함)
  detail?: string; // 기준/판정 설명
}

export interface Evidence {
  time?: string; // mm:ss (자막 타임스탬프). 없으면 자료 근거
  text: string; // 근거가 된 강의 내용/문구
  reason: string; // 왜 이 부분을 근거로 봤는지
}

export interface DimensionScore {
  category: Category;
  dimension: Dimension;
  value: number; // 0~100 (전 항목 자동 채점)
  comment: string; // 채점 결과 요약(지표 기반)
  qualitative: string; // 정성 평가 서술
  indicators: Indicator[]; // 측정 지표
  evidence: Evidence[]; // 어느 부분(내용·타임)에서 그렇게 판단했는지
}

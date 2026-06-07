// 평가 집계 헬퍼: 점수 목록 → 카테고리 평균·총점·등급.
import {
  type Category,
  type Dimension,
  categoryAverage,
  toBand,
  weightedTotal,
} from "@/lib/rubric";

export interface ScoreLite {
  category: Category;
  dimension: Dimension;
  value: number;
  comment?: string | null;
}

export interface Aggregate {
  teaching: number;
  content: number;
  total: number;
  grade: string;
  gradeLabel: string;
  count: number;
}

export function aggregate(scores: ScoreLite[]): Aggregate {
  const teaching = categoryAverage(scores, "TEACHING");
  const content = categoryAverage(scores, "CONTENT");
  const total = Math.round(weightedTotal(scores));
  const band = toBand(total);
  return {
    teaching,
    content,
    total,
    grade: band.grade,
    gradeLabel: band.label,
    count: scores.length,
  };
}

export function isCategory(v: string): v is Category {
  return v === "TEACHING" || v === "CONTENT";
}

const DIMS = new Set<Dimension>([
  "DELIVERY",
  "ENGAGEMENT",
  "PACING",
  "PRESENTATION",
  "ACCURACY",
  "CURRICULUM",
  "DIFFICULTY",
  "READABILITY",
]);

export function isDimension(v: string): v is Dimension {
  return DIMS.has(v as Dimension);
}

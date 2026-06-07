// API 응답(강의 상세) 클라이언트 타입.
export interface AssetDTO {
  id: string;
  kind: string;
  filename: string;
  extractedText: string | null;
  meta: string | null;
  createdAt: string;
}

export interface ScoreDTO {
  id: string;
  category: string;
  dimension: string;
  value: number;
  comment: string | null;
  qualitative: string | null;
  explain: string | null;
  evidence: string | null;
}

export interface EvaluationDTO {
  id: string;
  type: string;
  evaluatorName: string | null;
  summary: string | null;
  createdAt: string;
  scores: ScoreDTO[];
}

export interface LectureDTO {
  id: string;
  title: string;
  subject: string;
  instructor: string | null;
  platform: string | null;
  grade: string | null;
  targetGrade: string | null;
  targetLevel: string | null;
  runningTimeSec: number | null;
  curriculumRevision: number | null;
  sourceType: string;
  sourceUrl: string | null;
  createdAt: string;
  assets: AssetDTO[];
  evaluations: EvaluationDTO[];
}

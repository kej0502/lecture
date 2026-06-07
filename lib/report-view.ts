// 평가 데이터를 리포트 표시/내보내기용 구조로 변환 (클라이언트·서버 공용, 순수 TS).
// 사람 평가는 제거되어 전부 AI 평가(자동 채점) 기준.
import { aggregate, type Aggregate, type ScoreLite } from "@/lib/report";
import {
  type Category,
  type Dimension,
  DIMENSIONS,
  type DimensionDef,
} from "@/lib/rubric";

export interface ScoreRow {
  category: Category;
  dimension: Dimension;
  value: number;
  comment?: string | null;
  qualitative?: string | null;
  explain?: string | null;
  evidence?: string | null; // JSON 문자열 [{time,text,reason}]
}

export interface EvalLite {
  id: string;
  type: string; // AI
  evaluatorName?: string | null;
  summary?: string | null;
  createdAt: string | Date;
  scores: ScoreRow[];
}

export function latestOf(evals: EvalLite[], type = "AI"): EvalLite | null {
  const filtered = evals
    .filter((e) => e.type === type)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  return filtered[0] ?? null;
}

export function toScoreLite(ev: EvalLite | null): ScoreLite[] {
  if (!ev) return [];
  return ev.scores.map((s) => ({
    category: s.category,
    dimension: s.dimension,
    value: s.value,
    comment: s.comment,
  }));
}

export function evalAggregate(ev: EvalLite | null): Aggregate | null {
  const scores = toScoreLite(ev);
  return scores.length > 0 ? aggregate(scores) : null;
}

export interface EvidenceItem {
  time?: string;
  text: string;
  reason: string;
}

export interface DimensionRow {
  def: DimensionDef;
  value: number | null;
  comment?: string | null;
  qualitative?: string | null;
  explain?: string | null;
  evidence: EvidenceItem[];
  scored: boolean; // 점수가 매겨진 항목인지(없으면 표시 제외)
}

function parseEvidence(raw?: string | null): EvidenceItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// scoredOnly=true면 점수가 있는 항목만 반환(가독성 미제공 시 제외).
export function dimensionRows(
  ev: EvalLite | null,
  scoredOnly = false,
): DimensionRow[] {
  const rows = DIMENSIONS.map((def): DimensionRow => {
    const s = ev?.scores.find((x) => x.dimension === def.dimension) ?? null;
    return {
      def,
      value: s ? s.value : null,
      comment: s?.comment,
      qualitative: s?.qualitative,
      explain: s?.explain ?? def.explain,
      evidence: parseEvidence(s?.evidence),
      scored: s != null,
    };
  });
  return scoredOnly ? rows.filter((r) => r.scored) : rows;
}

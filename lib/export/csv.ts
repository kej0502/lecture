// CSV 생성 (UTF-8 BOM 포함 → 엑셀 한글 안 깨짐). AI 자동 평가 기준.
import {
  type EvalLite,
  type EvidenceItem,
  dimensionRows,
  evalAggregate,
  latestOf,
} from "@/lib/report-view";
import { CATEGORY_LABEL } from "@/lib/rubric";

const BOM = "﻿";

function esc(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function row(cols: (string | number | null | undefined)[]): string {
  return cols.map(esc).join(",");
}
function evidenceText(ev: EvidenceItem[]): string {
  return ev.map((e) => `${e.time ? `[${e.time}] ` : ""}${e.text} (${e.reason})`).join(" / ");
}

export interface LectureForCsv {
  title: string;
  subject: string;
  instructor?: string | null;
  platform?: string | null;
  targetGrade?: string | null;
  evaluations: EvalLite[];
}

export function lectureToCsv(l: LectureForCsv): string {
  const ev = latestOf(l.evaluations, "AI");
  const rows = dimensionRows(ev, true);
  const agg = evalAggregate(ev);

  const lines: string[] = [];
  lines.push(row(["강의", l.title]));
  lines.push(row(["영역", l.subject]));
  lines.push(row(["강사", l.instructor ?? ""]));
  lines.push(row(["플랫폼", l.platform ?? ""]));
  lines.push(row(["대상", l.targetGrade ?? ""]));
  lines.push(row(["평가자", ev?.evaluatorName ?? ""]));
  lines.push("");
  lines.push(row(["대분류", "항목", "점수", "정성 평가", "평가 설명", "측정 결과", "근거"]));
  for (const r of rows) {
    lines.push(
      row([
        CATEGORY_LABEL[r.def.category],
        r.def.label,
        r.value ?? "",
        r.qualitative ?? "",
        r.explain ?? "",
        r.comment ?? "",
        evidenceText(r.evidence),
      ]),
    );
  }
  lines.push("");
  lines.push(row(["", "강의력 평균", agg?.teaching ?? ""]));
  lines.push(row(["", "콘텐츠 평균", agg?.content ?? ""]));
  lines.push(row(["", "총점", agg?.total ?? ""]));

  return BOM + lines.join("\n");
}

export interface LectureSummaryRow {
  title: string;
  subject: string;
  instructor?: string | null;
  platform?: string | null;
  evaluations: EvalLite[];
}

export function lecturesToSummaryCsv(lectures: LectureSummaryRow[]): string {
  const lines: string[] = [];
  lines.push(
    row(["플랫폼", "영역", "강사명", "강의명", "평가자", "강의력", "콘텐츠", "총점", "날짜"]),
  );
  for (const l of lectures) {
    const ev = latestOf(l.evaluations, "AI");
    const agg = evalAggregate(ev);
    lines.push(
      row([
        l.platform ?? "",
        l.subject,
        l.instructor ?? "",
        l.title,
        ev?.evaluatorName ?? "",
        agg?.teaching ?? "",
        agg?.content ?? "",
        agg?.total ?? "",
        ev ? new Date(ev.createdAt).toLocaleString("ko-KR") : "",
      ]),
    );
  }
  return BOM + lines.join("\n");
}

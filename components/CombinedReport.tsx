// AI 평가 리포트: 카테고리별 항목 점수 + 평가 설명 + 근거(자막 구간·타임).
import { Card, ScoreBadge, ScoreBar } from "@/components/ui";
import {
  type EvalLite,
  dimensionRows,
  evalAggregate,
} from "@/lib/report-view";
import { CATEGORY_LABEL, type Category } from "@/lib/rubric";

export function CombinedReport({ ev }: { ev: EvalLite | null }) {
  const rows = dimensionRows(ev, true);
  const agg = evalAggregate(ev);
  const categories: Category[] = ["TEACHING", "CONTENT"];

  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">평가 리포트</h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {ev?.evaluatorName && <span>평가자 {ev.evaluatorName}</span>}
          <ScoreBadge value={agg?.total} label="총점" />
        </div>
      </div>

      {categories.map((cat) => {
        const catRows = rows.filter((r) => r.def.category === cat);
        const catAvg = cat === "TEACHING" ? agg?.teaching : agg?.content;
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <h3 className="font-semibold text-slate-700">{CATEGORY_LABEL[cat]}</h3>
              <span className="text-xs text-slate-500">평균 {catAvg ?? "–"}점</span>
            </div>
            {catRows.map((r) => (
              <div key={r.def.dimension} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{r.def.label}</span>
                  <span className="w-10 text-right text-sm font-semibold tabular-nums">
                    {r.value ?? "–"}
                  </span>
                </div>
                <div className="my-1.5">
                  <ScoreBar value={r.value} />
                </div>
                <p className="text-xs text-slate-400">{r.explain}</p>
                {r.qualitative && (
                  <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-sm text-amber-900">
                    <span className="font-medium">정성 평가: </span>
                    {r.qualitative}
                  </p>
                )}
                {r.comment && (
                  <p className="mt-1 text-sm text-slate-600">
                    <span className="font-medium text-slate-500">측정: </span>
                    {r.comment}
                  </p>
                )}
                {r.evidence.length > 0 && (
                  <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2">
                    <p className="text-xs font-medium text-slate-500">판단 근거</p>
                    {r.evidence.map((e, i) => (
                      <div key={i} className="text-xs text-slate-600">
                        {e.time && (
                          <span className="mr-1 rounded bg-slate-200 px-1 font-mono text-slate-700">
                            {e.time}
                          </span>
                        )}
                        <span className="text-slate-700">“{e.text}”</span>
                        <span className="text-slate-400"> — {e.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {ev?.summary && (
        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          <span className="font-medium">요약:</span> {ev.summary}
        </div>
      )}
    </Card>
  );
}

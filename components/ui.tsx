// 표시용 공용 컴포넌트(순수). 점수 색상·배지·막대.
import { toBand } from "@/lib/rubric";

export function gradeColor(value: number): string {
  if (value >= 90) return "#16a34a"; // green
  if (value >= 75) return "#65a30d"; // lime
  if (value >= 60) return "#ca8a04"; // amber
  if (value >= 40) return "#ea580c"; // orange
  return "#dc2626"; // red
}

export function ScoreBadge({
  value,
  label,
}: {
  value: number | null | undefined;
  label?: string;
}) {
  if (value == null) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-400">
        {label ? `${label} ` : ""}–
      </span>
    );
  }
  const band = toBand(value);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: gradeColor(value), color: "#fff" }}
    >
      {label ? `${label} ` : ""}
      {value}점 · {band.grade}
    </span>
  );
}

export function ScoreBar({
  value,
  color,
}: {
  value: number | null;
  color?: string;
}) {
  if (value == null) {
    return <div className="h-2 w-full rounded bg-slate-100" />;
  }
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-slate-100">
      <div
        className="h-full rounded"
        style={{ width: `${value}%`, backgroundColor: color ?? gradeColor(value) }}
      />
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

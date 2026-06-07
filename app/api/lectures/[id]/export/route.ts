import { prisma } from "@/lib/db";
import { lectureToCsv } from "@/lib/export/csv";
import { lectureToPdf } from "@/lib/export/pdf";
import type { EvalLite } from "@/lib/report-view";
import type { Category, Dimension } from "@/lib/rubric";

export const runtime = "nodejs";

function toEvalLite(evals: {
  id: string;
  type: string;
  evaluatorName: string | null;
  summary: string | null;
  createdAt: Date;
  scores: {
    category: string;
    dimension: string;
    value: number;
    comment: string | null;
    qualitative: string | null;
    explain: string | null;
    evidence: string | null;
  }[];
}[]): EvalLite[] {
  return evals.map((e) => ({
    id: e.id,
    type: e.type,
    evaluatorName: e.evaluatorName,
    summary: e.summary,
    createdAt: e.createdAt,
    scores: e.scores.map((s) => ({
      category: s.category as Category,
      dimension: s.dimension as Dimension,
      value: s.value,
      comment: s.comment,
      qualitative: s.qualitative,
      explain: s.explain,
      evidence: s.evidence,
    })),
  }));
}

function safeName(s: string): string {
  return s.replace(/[^\w가-힣.-]+/g, "_").slice(0, 50);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") ?? "csv").toLowerCase();

  const lecture = await prisma.lecture.findUnique({
    where: { id },
    include: { evaluations: { include: { scores: true } } },
  });
  if (!lecture) {
    return new Response("not found", { status: 404 });
  }

  const evaluations = toEvalLite(lecture.evaluations);
  const base = safeName(lecture.title || "lecture");

  if (format === "pdf") {
    const buf = await lectureToPdf({
      title: lecture.title,
      subject: lecture.subject,
      instructor: lecture.instructor,
      platform: lecture.platform,
      targetGrade: lecture.targetGrade,
      evaluations,
    });
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(base)}.pdf`,
      },
    });
  }

  const csv = lectureToCsv({
    title: lecture.title,
    subject: lecture.subject,
    instructor: lecture.instructor,
    platform: lecture.platform,
    targetGrade: lecture.targetGrade,
    evaluations,
  });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(base)}.csv`,
    },
  });
}

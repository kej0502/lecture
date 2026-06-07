import { prisma } from "@/lib/db";
import { lecturesToSummaryCsv } from "@/lib/export/csv";
import type { EvalLite } from "@/lib/report-view";
import type { Category, Dimension } from "@/lib/rubric";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv") {
    return new Response("csv만 지원합니다.", { status: 400 });
  }

  const lectures = await prisma.lecture.findMany({
    orderBy: { createdAt: "desc" },
    include: { evaluations: { include: { scores: true } } },
  });

  const rows = lectures.map((l) => ({
    title: l.title,
    subject: l.subject,
    instructor: l.instructor,
    platform: l.platform,
    evaluations: l.evaluations.map(
      (e): EvalLite => ({
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
        })),
      }),
    ),
  }));

  const csv = lecturesToSummaryCsv(rows);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("강의평가_요약")}.csv`,
    },
  });
}

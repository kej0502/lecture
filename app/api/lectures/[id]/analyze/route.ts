import { NextResponse } from "next/server";
import { getAnalyzer } from "@/lib/analyzer";
import type { AnalyzeInput } from "@/lib/analyzer/types";
import { prisma } from "@/lib/db";
import type { SubtitleSegment } from "@/lib/extract/types";
import type { StandardLite } from "@/lib/metrics/content";
import { DIMENSION_MAP } from "@/lib/rubric";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const evaluatorName: string = body?.evaluatorName
    ? String(body.evaluatorName)
    : "익명";
  const lecture = await prisma.lecture.findUnique({
    where: { id },
    include: { assets: true },
  });
  if (!lecture) {
    return NextResponse.json({ error: "강의를 찾을 수 없습니다." }, { status: 404 });
  }

  // 자막/스크립트 → SubtitleDoc 재구성
  const subAsset =
    lecture.assets.find((a) => a.kind === "SUBTITLE") ??
    lecture.assets.find((a) => a.kind === "SCRIPT");
  let segments: SubtitleSegment[] = [];
  let durationSec = 0;
  if (subAsset?.meta) {
    try {
      const m = JSON.parse(subAsset.meta);
      segments = Array.isArray(m.segments) ? m.segments : [];
      durationSec = Number(m.durationSec) || 0;
    } catch {
      /* ignore */
    }
  }
  const subtitle = {
    segments,
    text: subAsset?.extractedText ?? "",
    durationSec,
  };

  // 교재 PDF → PdfDoc
  const pdfAsset = lecture.assets.find((a) => a.kind === "PDF");
  let pdf = null;
  if (pdfAsset?.extractedText != null) {
    let pages = 0;
    let charCount = pdfAsset.extractedText.length;
    if (pdfAsset.meta) {
      try {
        const m = JSON.parse(pdfAsset.meta);
        pages = Number(m.pages) || 0;
        charCount = Number(m.charCount) || charCount;
      } catch {
        /* ignore */
      }
    }
    pdf = { text: pdfAsset.extractedText, pages, charCount };
  }

  if (subtitle.text.trim() === "" && pdf == null) {
    return NextResponse.json(
      { error: "분석할 자막/스크립트나 교재가 없습니다. 자료를 먼저 업로드하세요." },
      { status: 422 },
    );
  }

  // 해당 과목·개정의 성취기준
  const stdRows = await prisma.curriculumStandard.findMany({
    where: {
      subject: lecture.subject,
      revisionYear: lecture.curriculumRevision ?? 2022,
    },
  });
  const standards: StandardLite[] = stdRows.map((s) => {
    let keywords: string[] = [];
    try {
      keywords = JSON.parse(s.keywords);
    } catch {
      /* ignore */
    }
    return { code: s.code, statement: s.statement, keywords };
  });

  const input: AnalyzeInput = {
    subtitle,
    pdf,
    standards,
    targetLevel: lecture.targetLevel,
    runningTimeSec: lecture.runningTimeSec,
  };

  const analyzer = getAnalyzer();
  const result = await analyzer.analyze(input);

  // Evaluation(AI) + Score 저장 (value가 있는 자동 항목만)
  const evaluation = await prisma.evaluation.create({
    data: {
      lectureId: id,
      type: "AI",
      evaluatorName,
      summary: result.summary,
      scores: {
        create: result.scores.map((s) => ({
          category: s.category,
          dimension: s.dimension,
          value: s.value,
          comment: s.comment,
          qualitative: s.qualitative,
          explain: DIMENSION_MAP[s.dimension].explain,
          evidence: JSON.stringify(s.evidence ?? []),
        })),
      },
    },
    include: { scores: true },
  });

  return NextResponse.json({ evaluation, summary: result.summary }, { status: 201 });
}

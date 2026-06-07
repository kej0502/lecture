import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aggregate, type ScoreLite } from "@/lib/report";
import type { Category, Dimension } from "@/lib/rubric";

export const runtime = "nodejs";

// 강의 목록 + 최신 AI/사람 평가 총점
// 검색: ?instructor=<강사명>&area=<영역명> (DB에서 부분일치 필터)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const instructor = searchParams.get("instructor")?.trim();
  const area = searchParams.get("area")?.trim();

  const where: {
    instructor?: { contains: string; mode: "insensitive" };
    subject?: { contains: string; mode: "insensitive" };
  } = {};
  if (instructor)
    where.instructor = { contains: instructor, mode: "insensitive" };
  if (area) where.subject = { contains: area, mode: "insensitive" };

  // 목록엔 최신 평가 1건 + 점수의 필요한 필드만 — 전체 평가/점수 로드 방지(속도 개선).
  const lectures = await prisma.lecture.findMany({
    where,
    orderBy: [
      { subject: "asc" }, // 영역
      { instructor: "asc" }, // 강사명
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      subject: true,
      instructor: true,
      platform: true,
      grade: true,
      targetGrade: true,
      createdAt: true,
      _count: { select: { evaluations: true } },
      evaluations: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          evaluatorName: true,
          createdAt: true,
          provider: true,
          scores: { select: { category: true, dimension: true, value: true } },
        },
      },
    },
  });

  const data = lectures.map((l) => {
    const latestEval = l.evaluations[0] ?? null; // 최신순 정렬됨
    let ai = null;
    if (latestEval) {
      const scores: ScoreLite[] = latestEval.scores.map((s) => ({
        category: s.category as Category,
        dimension: s.dimension as Dimension,
        value: s.value,
      }));
      ai = scores.length > 0 ? aggregate(scores) : null;
    }
    return {
      id: l.id,
      title: l.title,
      subject: l.subject,
      instructor: l.instructor,
      platform: l.platform,
      grade: l.grade,
      targetGrade: l.targetGrade,
      createdAt: l.createdAt,
      evaluationCount: l._count.evaluations,
      evaluatorName: latestEval?.evaluatorName ?? null,
      evaluatedAt: latestEval?.createdAt ?? null,
      aiProvider: latestEval?.provider ?? null,
      ai,
    };
  });

  return NextResponse.json(data);
}

// 강의 생성
export async function POST(req: Request) {
  const body = await req.json();
  const { title, subject } = body ?? {};
  if (!title || !subject) {
    return NextResponse.json(
      { error: "title과 subject는 필수입니다." },
      { status: 400 },
    );
  }
  const lecture = await prisma.lecture.create({
    data: {
      title: String(title),
      subject: String(subject),
      instructor: body.instructor ? String(body.instructor) : null,
      platform: body.platform ? String(body.platform) : null,
      grade: body.grade ? String(body.grade) : null,
      targetGrade: body.targetGrade ? String(body.targetGrade) : null,
      targetLevel: body.targetLevel ? String(body.targetLevel) : null,
      runningTimeSec:
        body.runningTimeSec != null ? Number(body.runningTimeSec) : null,
      curriculumRevision:
        body.curriculumRevision != null
          ? Number(body.curriculumRevision)
          : 2022,
      sourceType: body.sourceUrl ? "URL" : "FILE",
      sourceUrl: body.sourceUrl ? String(body.sourceUrl) : null,
    },
  });
  return NextResponse.json(lecture, { status: 201 });
}

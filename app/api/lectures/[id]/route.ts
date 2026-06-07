import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60; // DB 깨어남 대기(504 방지)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lecture = await prisma.lecture.findUnique({
    where: { id },
    include: {
      assets: { orderBy: { createdAt: "asc" } },
      evaluations: {
        orderBy: { createdAt: "desc" },
        include: { scores: true },
      },
    },
  });
  if (!lecture) {
    return NextResponse.json({ error: "강의를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(lecture);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // deleteMany는 대상이 없어도 예외 없이 count 0 반환(이미 삭제된 행 재삭제 시 500 방지).
  const res = await prisma.lecture.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true, deleted: res.count });
}

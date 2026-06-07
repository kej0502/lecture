import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

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
  await prisma.lecture.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

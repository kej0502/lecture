import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// 개별 성취기준 수정
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.unit !== undefined) data.unit = body.unit ? String(body.unit) : null;
  if (body.statement !== undefined) data.statement = String(body.statement);
  if (body.keywords !== undefined) {
    const kw = Array.isArray(body.keywords) ? body.keywords.map(String) : [];
    data.keywords = JSON.stringify(kw);
  }
  const updated = await prisma.curriculumStandard.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}

// 개별 성취기준 삭제
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await prisma.curriculumStandard.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseSubtitle } from "@/lib/extract/srt";

// pdf-parse(DOMMatrix 의존)는 모듈 로드만으로 서버리스에서 크래시 → PDF 분기에서만 지연 import.

export const runtime = "nodejs";

// kind: SUBTITLE | PDF | VIDEO | SCRIPT
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const lecture = await prisma.lecture.findUnique({ where: { id } });
  if (!lecture) {
    return NextResponse.json({ error: "강의를 찾을 수 없습니다." }, { status: 404 });
  }

  // 클라이언트에서 이미 추출한 텍스트 저장(주로 PDF) — Vercel 4.5MB 업로드 제한 우회.
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    const kind = String(body.kind ?? "");
    if (!["SUBTITLE", "PDF", "VIDEO", "SCRIPT"].includes(kind)) {
      return NextResponse.json({ error: "kind가 올바르지 않습니다." }, { status: 400 });
    }
    const asset = await prisma.asset.create({
      data: {
        lectureId: id,
        kind,
        filename: String(body.filename ?? "uploaded"),
        extractedText: body.extractedText ? String(body.extractedText) : null,
        meta: JSON.stringify(body.meta ?? {}),
      },
    });
    return NextResponse.json(asset, { status: 201 });
  }

  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");

  if (!["SUBTITLE", "PDF", "VIDEO", "SCRIPT"].includes(kind)) {
    return NextResponse.json({ error: "kind가 올바르지 않습니다." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file이 필요합니다." }, { status: 400 });
  }

  const filename = file.name;
  let extractedText: string | null = null;
  let meta: Record<string, unknown> = {};

  try {
    if (kind === "PDF") {
      const { parsePdf } = await import("@/lib/extract/pdf");
      const buf = Buffer.from(await file.arrayBuffer());
      const doc = await parsePdf(buf);
      extractedText = doc.text;
      meta = { pages: doc.pages, charCount: doc.charCount };
    } else if (kind === "SUBTITLE" || kind === "SCRIPT") {
      const raw = await file.text();
      const doc = parseSubtitle(raw, filename);
      extractedText = doc.text;
      meta = {
        durationSec: doc.durationSec,
        segmentCount: doc.segments.length,
        segments: doc.segments, // 분석(휴지·속도)용 타임스탬프 보관
      };
    } else if (kind === "VIDEO") {
      // MVP: 영상은 메타데이터만 저장(자막 자동 추출은 추후 lib/transcribe 훅)
      meta = { sizeBytes: file.size };
    }
  } catch (e) {
    return NextResponse.json(
      { error: `추출 실패: ${(e as Error).message}` },
      { status: 422 },
    );
  }

  const asset = await prisma.asset.create({
    data: {
      lectureId: id,
      kind,
      filename,
      extractedText,
      meta: JSON.stringify(meta),
    },
  });

  return NextResponse.json(asset, { status: 201 });
}

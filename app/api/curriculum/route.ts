import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  detectRevisionYear,
  detectSubject,
  extractStandards,
} from "@/lib/extract/curriculum-pdf";
import { parsePdf } from "@/lib/extract/pdf";

export const runtime = "nodejs";

// 성취기준 조회 (subject/revisionYear 필터). 과목·개정 요약도 함께 반환.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");
  const revisionYear = searchParams.get("revisionYear");

  const where: Record<string, unknown> = {};
  if (subject) where.subject = subject;
  if (revisionYear) where.revisionYear = Number(revisionYear);

  const standards = await prisma.curriculumStandard.findMany({
    where,
    orderBy: [{ subject: "asc" }, { revisionYear: "desc" }, { code: "asc" }],
  });

  // 과목·개정 그룹 요약
  const groupsMap = new Map<string, { subject: string; revisionYear: number; count: number }>();
  for (const s of standards) {
    const key = `${s.subject}__${s.revisionYear}`;
    const g = groupsMap.get(key) ?? {
      subject: s.subject,
      revisionYear: s.revisionYear,
      count: 0,
    };
    g.count++;
    groupsMap.set(key, g);
  }

  return NextResponse.json({
    groups: Array.from(groupsMap.values()),
    standards: standards.map((s) => ({
      ...s,
      keywords: safeParse(s.keywords),
    })),
  });
}

function safeParse(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

interface StandardInput {
  unit?: string;
  code: string;
  statement: string;
  keywords: string[];
}

// CSV(unit,code,statement,keywords[;구분]) → StandardInput[]
function parseCsv(csv: string): StandardInput[] {
  const lines = csv.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim() !== "");
  const out: StandardInput[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (i === 0 && /code|성취기준|statement|내용/i.test(lines[i])) continue; // 헤더 스킵
    if (cols.length < 3) continue;
    const [unit, code, statement, keywords] = cols;
    if (!code || !statement) continue;
    out.push({
      unit,
      code,
      statement,
      keywords: (keywords ?? "")
        .split(/[;|]/)
        .map((k) => k.trim())
        .filter((k) => k !== ""),
    });
  }
  return out;
}

// 성취기준 업로드(PDF 파일 / JSON standards[] / csv 문자열). 같은 (subject,revisionYear,code)는 교체.
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let subject = "";
  let revisionYear = NaN;
  let standards: StandardInput[] = [];

  if (contentType.includes("multipart/form-data")) {
    // PDF 업로드 → 과목·개정연도 자동 인식
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF 파일이 필요합니다." }, { status: 400 });
    }
    let pdfText = "";
    const pdfName = file.name ?? "";
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const doc = await parsePdf(buf);
      pdfText = doc.text;
      standards = extractStandards(pdfText);
    } catch (e) {
      return NextResponse.json(
        { error: `PDF 분석 실패: ${(e as Error).message}` },
        { status: 422 },
      );
    }
    if (standards.length === 0) {
      return NextResponse.json(
        {
          error:
            "PDF에서 성취기준 코드를 찾지 못했습니다. (예: [12수학Ⅰ-01-02] 형식이 필요)",
        },
        { status: 422 },
      );
    }
    // 사용자가 override를 보냈으면 우선, 아니면 자동 인식
    const overrideSubject = String(form.get("subject") ?? "").trim();
    const overrideYear = Number(form.get("revisionYear"));
    subject = overrideSubject || detectSubject(standards) || "";
    revisionYear = !Number.isNaN(overrideYear)
      ? overrideYear
      : (detectRevisionYear(pdfText, pdfName) ?? 2022);
    if (!subject) {
      return NextResponse.json(
        { error: "PDF에서 과목명을 자동 인식하지 못했습니다. 과목명을 입력해 주세요." },
        { status: 422 },
      );
    }
  } else {
    const body = await req.json();
    subject = body?.subject ? String(body.subject) : "";
    revisionYear = body?.revisionYear ? Number(body.revisionYear) : NaN;
    if (!subject || Number.isNaN(revisionYear)) {
      return NextResponse.json(
        { error: "subject와 revisionYear는 필수입니다." },
        { status: 400 },
      );
    }
    if (typeof body.csv === "string" && body.csv.trim() !== "") {
      standards = parseCsv(body.csv);
    } else if (Array.isArray(body.standards)) {
      standards = body.standards.map((s: StandardInput) => ({
        unit: s.unit,
        code: String(s.code),
        statement: String(s.statement),
        keywords: Array.isArray(s.keywords) ? s.keywords.map(String) : [],
      }));
    }
    if (standards.length === 0) {
      return NextResponse.json(
        { error: "업로드할 성취기준이 없습니다. (PDF / JSON standards[] / csv)" },
        { status: 400 },
      );
    }
  }

  let count = 0;
  for (const s of standards) {
    if (!s.code || !s.statement) continue;
    await prisma.curriculumStandard.upsert({
      where: {
        subject_revisionYear_code: { subject, revisionYear, code: s.code },
      },
      update: {
        unit: s.unit ?? null,
        statement: s.statement,
        keywords: JSON.stringify(s.keywords),
      },
      create: {
        subject,
        revisionYear,
        unit: s.unit ?? null,
        code: s.code,
        statement: s.statement,
        keywords: JSON.stringify(s.keywords),
      },
    });
    count++;
  }

  return NextResponse.json({ ok: true, count, subject, revisionYear }, { status: 201 });
}

// 과목·개정 단위 삭제
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");
  const revisionYear = searchParams.get("revisionYear");
  if (!subject || !revisionYear) {
    return NextResponse.json(
      { error: "subject와 revisionYear가 필요합니다." },
      { status: 400 },
    );
  }
  const res = await prisma.curriculumStandard.deleteMany({
    where: { subject, revisionYear: Number(revisionYear) },
  });
  return NextResponse.json({ ok: true, deleted: res.count });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  detectRevisionYear,
  detectSubject,
  extractStandards,
} from "@/lib/extract/curriculum-pdf";

export const runtime = "nodejs";

// pdf-parse는 브라우저 API(DOMMatrix)에 의존해 모듈 로드만으로 서버리스에서 크래시한다.
// → 실제 PDF 업로드 분기에서만 지연 import 한다(GET/JSON/CSV 경로는 영향 없음).

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

// PDF 텍스트에서 성취기준 추출 + 과목·개정연도 자동 인식.
interface IngestResult {
  error?: NextResponse;
  subject: string;
  revisionYear: number;
  standards: StandardInput[];
}
function ingestFromPdfText(
  pdfText: string,
  pdfName: string,
  overrideSubject: string,
  overrideYear: number,
): IngestResult {
  const standards = extractStandards(pdfText);
  if (standards.length === 0) {
    return {
      error: NextResponse.json(
        { error: "PDF에서 성취기준 코드를 찾지 못했습니다. (예: [12수학Ⅰ-01-02] 형식이 필요)" },
        { status: 422 },
      ),
      subject: "",
      revisionYear: NaN,
      standards,
    };
  }
  const subject = overrideSubject || detectSubject(standards) || "";
  const revisionYear = !Number.isNaN(overrideYear)
    ? overrideYear
    : (detectRevisionYear(pdfText, pdfName) ?? 2022);
  if (!subject) {
    return {
      error: NextResponse.json(
        { error: "PDF에서 과목명을 자동 인식하지 못했습니다." },
        { status: 422 },
      ),
      subject,
      revisionYear,
      standards,
    };
  }
  return { subject, revisionYear, standards };
}

// 성취기준 업로드. 같은 (subject,revisionYear,code)는 교체.
// - JSON { pdfText, filename }  ← 권장: 클라이언트에서 추출한 PDF 텍스트(큰 파일 4.5MB 제한 우회)
// - multipart file(PDF)         ← 작은 PDF 직접 업로드(서버 추출)
// - JSON { subject, revisionYear, standards[] | csv }
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let subject = "";
  let revisionYear = NaN;
  let standards: StandardInput[] = [];

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF 파일이 필요합니다." }, { status: 400 });
    }
    let pdfText = "";
    try {
      const { parsePdf } = await import("@/lib/extract/pdf");
      const buf = Buffer.from(await file.arrayBuffer());
      pdfText = (await parsePdf(buf)).text;
    } catch (e) {
      return NextResponse.json(
        { error: `PDF 분석 실패: ${(e as Error).message}` },
        { status: 422 },
      );
    }
    const yearRaw = form.get("revisionYear");
    const hasYear = yearRaw != null && String(yearRaw).trim() !== "";
    const r = ingestFromPdfText(
      pdfText,
      file.name ?? "",
      String(form.get("subject") ?? "").trim(),
      hasYear ? Number(yearRaw) : NaN,
    );
    if (r.error) return r.error;
    ({ subject, revisionYear, standards } = r);
  } else {
    const body = await req.json();
    // 클라이언트에서 추출한 PDF 텍스트(권장 경로)
    if (typeof body.pdfText === "string" && body.pdfText.trim() !== "") {
      const r = ingestFromPdfText(
        body.pdfText,
        String(body.filename ?? ""),
        String(body.subject ?? "").trim(),
        body.revisionYear ? Number(body.revisionYear) : NaN,
      );
      if (r.error) return r.error;
      ({ subject, revisionYear, standards } = r);
    } else {
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
          { error: "업로드할 성취기준이 없습니다." },
          { status: 400 },
        );
      }
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

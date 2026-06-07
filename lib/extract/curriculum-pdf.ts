// 교육과정 PDF 텍스트에서 성취기준(코드 + 내용 + 키워드)을 추출.
// 예: "[12수학Ⅰ-01-04] 로그의 뜻을 알고 그 성질을 이해한다." 형태를 인식.
import { type Area, areaFromText } from "@/lib/areas";

export interface ExtractedStandard {
  unit?: string;
  code: string;
  statement: string;
  keywords: string[];
}

// 성취기준 코드 패턴 (12수학Ⅰ-01-02 / 12영어01-01 / 10공통수학1-01-01 등)
const CODE_RE =
  /\[?\s*(\d{2}[가-힣A-Za-z0-9Ⅰ-Ⅿ]{1,16}-\d{2}(?:-\d{2})?)\s*\]?/g;

const JOSA = [
  "에서",
  "으로",
  "에게",
  "까지",
  "부터",
  "하는",
  "하여",
  "하고",
  "한다",
  "하다",
  "이다",
  "된다",
  "을",
  "를",
  "은",
  "는",
  "이",
  "가",
  "의",
  "에",
  "와",
  "과",
  "도",
  "만",
  "로",
  "한",
  "할",
];

const STOP = new Set([
  "이해",
  "안다",
  "구한다",
  "활용",
  "알고",
  "그것",
  "이것",
  "다음",
  "또는",
  "통해",
  "대해",
  "관한",
  "위한",
  "경우",
  "다양",
  "여러",
  "모든",
  "있다",
  "없다",
  "같다",
  "이를",
  "이용",
]);

function stripJosa(token: string): string {
  for (const j of JOSA) {
    if (token.length > j.length + 1 && token.endsWith(j)) {
      return token.slice(0, token.length - j.length);
    }
  }
  return token;
}

export function deriveKeywords(statement: string): string[] {
  const tokens = statement.split(/[^가-힣A-Za-z0-9]+/).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    const stem = stripJosa(t);
    if (stem.length < 2) continue;
    if (STOP.has(stem)) continue;
    if (seen.has(stem)) continue;
    seen.add(stem);
    out.push(stem);
    if (out.length >= 8) break;
  }
  return out;
}

// 코드에서 과목명 추출 (12수학Ⅰ-01-02 → 수학Ⅰ, 12영어01-01 → 영어)
function subjectFromCode(code: string): string | null {
  const m = code.match(/^\d{2}([가-힣A-Za-zⅠ-Ⅿ]+?)\d*-\d{2}/);
  return m ? m[1] : null;
}

// 추출된 성취기준들을 5개 영역(국어/영어/수학/사회/과학)으로 정규화해 대표 영역 결정.
export function detectSubject(standards: ExtractedStandard[]): Area | null {
  const counts = new Map<Area, number>();
  for (const s of standards) {
    const token = subjectFromCode(s.code);
    const area = areaFromText(token ?? "") ?? areaFromText(s.statement);
    if (area) counts.set(area, (counts.get(area) ?? 0) + 1);
  }
  let best: Area | null = null;
  let max = 0;
  for (const [area, n] of counts) {
    if (n > max) {
      max = n;
      best = area;
    }
  }
  return best;
}

// 개정연도 감지: 파일명 → 본문 순. "2022 개정" / "2022개정" / 파일명 내 20xx.
export function detectRevisionYear(text: string, filename = ""): number | null {
  const sources = [filename, text];
  for (const src of sources) {
    const m = src.match(/(20\d{2})\s*개정/);
    if (m) return Number(m[1]);
  }
  // 파일명에 들어간 4자리 연도(2009/2015/2022 등)
  const fnYear = filename.match(/20(09|11|15|22)/);
  if (fnYear) return Number(fnYear[0]);
  if (/2022/.test(text)) return 2022;
  if (/2015/.test(text)) return 2015;
  return null;
}

export function extractStandards(text: string): ExtractedStandard[] {
  const matches: { code: string; index: number; end: number }[] = [];
  CODE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CODE_RE.exec(text)) !== null) {
    matches.push({ code: m[1], index: m.index, end: m.index + m[0].length });
  }

  const out: ExtractedStandard[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    let statement = text
      .slice(cur.end, next ? next.index : Math.min(cur.end + 400, text.length))
      .replace(/\s+/g, " ")
      .trim();
    // 문장 끝(마침표/다.)까지로 한정
    const stop = statement.search(/(?:다\.|\.)\s/);
    if (stop > 10) statement = statement.slice(0, stop + 2).trim();
    statement = statement.slice(0, 200).trim();
    if (statement === "" || seen.has(cur.code)) continue;
    seen.add(cur.code);
    out.push({
      code: cur.code,
      statement,
      keywords: deriveKeywords(statement),
    });
  }
  return out;
}

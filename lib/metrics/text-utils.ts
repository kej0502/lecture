// 한국어 텍스트 지표 계산용 공통 유틸.

// 한글 음절 블록 수 (AC00–D7A3)
export function countSyllables(text: string): number {
  let n = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0xac00 && code <= 0xd7a3) n++;
  }
  return n;
}

export function tokenize(text: string): string[] {
  return text.split(/\s+/).filter((t) => t.length > 0);
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!。…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// 정규식 패턴 등장 횟수
export function countMatches(text: string, pattern: RegExp): number {
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  const m = text.match(re);
  return m ? m.length : 0;
}

export function anyMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

// 범위형 지표 → 0~100 (적정 구간 안=100, 벗어난 비율만큼 비례 감점)
export function rangeScore(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 100;
  const dev =
    value < min ? (min - value) / Math.max(min, 1e-9) : (value - max) / Math.max(max, 1e-9);
  return Math.max(0, Math.round(100 * (1 - dev)));
}

export function clamp(value: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, value));
}

export function round(value: number): number {
  return Math.round(value);
}

// 초 → mm:ss
export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

// 패턴에 매칭되는 자막 세그먼트를 근거로 수집(타임 포함). 세그먼트 없으면 빈 배열.
export function evidenceFromSegments(
  segments: { start: number; end: number; text: string }[],
  pattern: RegExp,
  reason: string,
  limit = 2,
): { time: string; text: string; reason: string }[] {
  const out: { time: string; text: string; reason: string }[] = [];
  for (const seg of segments) {
    if (out.length >= limit) break;
    if (pattern.test(seg.text)) {
      out.push({ time: fmtTime(seg.start), text: seg.text.trim(), reason });
    }
  }
  return out;
}

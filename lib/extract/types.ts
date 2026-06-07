// 자막 세그먼트(타임스탬프 포함)와 추출 결과 공통 타입.
export interface SubtitleSegment {
  start: number; // 초
  end: number; // 초
  text: string;
}

export interface SubtitleDoc {
  segments: SubtitleSegment[];
  text: string; // 전체 평문
  durationSec: number; // 마지막 세그먼트 end (없으면 0)
}

export interface PdfDoc {
  text: string;
  pages: number;
  charCount: number;
  truncated?: boolean; // 분석용으로 길이를 잘랐는지
}

// 분석에 사용할 PDF 텍스트 최대 길이(전송 본문 4.5MB 제한·분석 효율 고려).
export const PDF_TEXT_MAX = 500_000;

// 추출 텍스트의 제어문자 제거. 특히 NUL(0x00)은 Postgres text에 저장 불가 → 반드시 제거.
// 탭(0x09)·줄바꿈(0x0A)·캐리지리턴(0x0D)은 유지하고 나머지 C0 제어문자만 제거.
export function stripControlChars(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) continue;
    out += s[i];
  }
  return out;
}

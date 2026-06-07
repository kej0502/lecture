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

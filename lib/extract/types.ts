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
}

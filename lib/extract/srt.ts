// SRT / VTT / 일반 txt 자막을 타임스탬프 세그먼트로 파싱.
import type { SubtitleDoc, SubtitleSegment } from "./types";

// 00:00:01,000 또는 00:00:01.000 또는 00:01.000(분:초) → 초
function parseTimestamp(ts: string): number {
  const clean = ts.trim().replace(",", ".");
  const parts = clean.split(":").map((p) => parseFloat(p));
  if (parts.some((n) => Number.isNaN(n))) return NaN;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

const TIME_LINE =
  /(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3})/;

export function parseSubtitle(raw: string, filename = ""): SubtitleDoc {
  const content = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const lower = filename.toLowerCase();
  const hasCues = TIME_LINE.test(content);

  // 타임스탬프 큐가 없고 .txt면 평문 스크립트로 취급
  if (!hasCues && (lower.endsWith(".txt") || !lower)) {
    const text = content.trim();
    return { segments: [], text, durationSec: 0 };
  }

  const segments: SubtitleSegment[] = [];
  const blocks = content.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    let timeLineIdx = -1;
    let m: RegExpMatchArray | null = null;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(TIME_LINE);
      if (match) {
        timeLineIdx = i;
        m = match;
        break;
      }
    }
    if (m == null || timeLineIdx < 0) continue;
    const start = parseTimestamp(m[1]);
    const end = parseTimestamp(m[2]);
    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines
      .join(" ")
      .replace(/<[^>]+>/g, "") // VTT 태그 제거
      .trim();
    if (text === "" || Number.isNaN(start) || Number.isNaN(end)) continue;
    segments.push({ start, end, text });
  }

  const text = segments.map((s) => s.text).join(" ");
  const durationSec = segments.length > 0 ? segments[segments.length - 1].end : 0;
  return { segments, text, durationSec };
}

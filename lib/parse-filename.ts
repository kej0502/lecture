// 파일명에서 강의 메타데이터(플랫폼·영역·강사명) 추정.
import { areaFromText, platformFromText } from "./areas";

const NAME_STOP = new Set([
  "강의", "강", "모의고사", "모의", "평가", "분석", "수업", "개념", "기출",
  "특강", "파이널", "현강", "인강", "복습", "예습", "총정리", "정리", "기본",
  "심화", "자막", "스크립트", "교재", "영상", "고등", "고1", "고2", "고3",
  "수능", "내신", "단원", "강좌", "시즌", "버전",
]);

export interface ParsedLectureMeta {
  platform: string | null;
  area: string | null;
  instructor: string | null;
}

export function parseLectureMeta(filename: string): ParsedLectureMeta {
  const base = filename.replace(/\.[^.]+$/, ""); // 확장자 제거
  const platform = platformFromText(base);
  const area = areaFromText(base);

  // 강사명 추정: 구분자로 나눈 토큰 중 순수 한글 2~4자, 영역/플랫폼/불용어 아님
  const tokens = base.split(/[_\-\s.·,()[\]]+/).filter(Boolean);
  let instructor: string | null = null;
  for (const tk of tokens) {
    if (!/^[가-힣]{2,4}$/.test(tk)) continue;
    if (NAME_STOP.has(tk)) continue;
    if (areaFromText(tk) || platformFromText(tk)) continue;
    instructor = tk;
    break;
  }

  return { platform, area, instructor };
}

// 파일명에서 강의 메타데이터(플랫폼·영역·강사명·강의명) 추정.
import {
  AREA_OPTIONS,
  PLATFORMS,
  areaFromText,
  platformFromText,
} from "./areas";

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
  title: string | null;
}

// 토큰을 표준 플랫폼명으로 정규화 (키워드 매칭 + "기타" 등 PLATFORMS 직접 일치).
function normalizePlatform(token: string): string | null {
  return platformFromText(token) ?? (PLATFORMS.includes(token) ? token : null);
}

// 토큰을 영역명으로 정규화 (키워드 매칭 + "기타" 등 AREA_OPTIONS 직접 일치).
function normalizeArea(token: string): string | null {
  return areaFromText(token) ?? (AREA_OPTIONS.includes(token) ? token : null);
}

function isInstructorToken(token: string): boolean {
  return /^[가-힣]{2,4}$/.test(token) && !NAME_STOP.has(token);
}

export function parseLectureMeta(filename: string): ParsedLectureMeta {
  const base = filename.replace(/\.[^.]+$/, "").trim(); // 확장자 제거

  // 1) 구조화된 규칙: 플랫폼_영역_강사명_강의명 (언더스코어 4칸 이상, 위치 기반)
  const parts = base.split("_").map((t) => t.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const [p, a, ins, ...rest] = parts;
    const platform = normalizePlatform(p);
    const area = normalizeArea(a);
    if (platform && area && isInstructorToken(ins)) {
      return {
        platform,
        area,
        instructor: ins,
        title: rest.join(" ") || null, // 나머지 토큰은 강의명
      };
    }
  }

  // 2) 휴리스틱 폴백: 파일명 전체에서 플랫폼·영역·강사명만 추정(강의명은 미정)
  const platform = platformFromText(base) ?? null;
  const area = areaFromText(base);
  const tokens = base.split(/[_\-\s.·,()[\]]+/).filter(Boolean);
  let instructor: string | null = null;
  for (const tk of tokens) {
    if (!isInstructorToken(tk)) continue;
    if (normalizeArea(tk) || normalizePlatform(tk)) continue; // 영역/플랫폼 토큰 제외
    instructor = tk;
    break;
  }

  return { platform, area, instructor, title: null };
}

// 영역(과목 대분류) 5종 + 기타, 플랫폼, 그리고 텍스트→영역/플랫폼 매핑.

export const AREAS = ["국어", "영어", "수학", "사회", "과학"] as const;
export type Area = (typeof AREAS)[number];
export const AREA_OPTIONS = [...AREAS, "기타"];

// 영역별 키워드(파일명·교육과정 코드·과목명에서 영역 판별)
const AREA_KEYWORDS: Record<Area, string[]> = {
  국어: ["국어", "문학", "독서", "화법", "작문", "언어와매체", "언어", "매체"],
  영어: ["영어", "english", "영독", "영어독해", "영문법"],
  수학: ["수학", "미적분", "미적", "확률과통계", "확통", "기하", "대수", "공통수학", "공수", "수1", "수2", "수I", "수II"],
  사회: ["사회", "한국사", "역사", "지리", "윤리", "정치", "경제", "법과정치", "사회문화", "세계사", "동아시아", "통합사회"],
  과학: ["과학", "물리", "화학", "생명과학", "생명", "지구과학", "지학", "통합과학"],
};

export function areaFromText(text: string): Area | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const area of AREAS) {
    for (const kw of AREA_KEYWORDS[area]) {
      if (t.includes(kw.toLowerCase())) return area;
    }
  }
  return null;
}

// 플랫폼 표준화
export const PLATFORMS = ["메가스터디", "대성마이맥", "이투스", "시대인재", "기타"];

const PLATFORM_KEYWORDS: { canonical: string; keys: string[] }[] = [
  { canonical: "메가스터디", keys: ["메가스터디", "메가", "megastudy", "mega"] },
  { canonical: "대성마이맥", keys: ["대성마이맥", "대성", "마이맥", "mimac"] },
  { canonical: "이투스", keys: ["이투스", "etoos", "etos"] },
  { canonical: "시대인재", keys: ["시대인재", "시대"] },
];

export function platformFromText(text: string): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const p of PLATFORM_KEYWORDS) {
    if (p.keys.some((k) => t.includes(k.toLowerCase()))) return p.canonical;
  }
  return null;
}

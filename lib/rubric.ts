// 루브릭 정의: 2개 대분류(강의력/콘텐츠) + 각 4개 하위 항목, 채점 기준값(적정 범위)·가중치·등급 밴드.
// 모든 기준값은 여기서만 관리한다(조정 가능). 점수는 0~100.

export type Category = "TEACHING" | "CONTENT";

export type Dimension =
  | "DELIVERY"
  | "ENGAGEMENT"
  | "PACING"
  | "PRESENTATION"
  | "ACCURACY"
  | "CURRICULUM"
  | "DIFFICULTY"
  | "READABILITY";

export type ScoringMode = "AUTO" | "PARTIAL" | "HUMAN";

export interface DimensionDef {
  dimension: Dimension;
  category: Category;
  label: string; // 한글 라벨
  desc: string; // 한 줄 설명
  explain: string; // 이 항목이 무엇을 어떻게 평가하는지 설명
  weight: number; // 카테고리 내 가중치 (합 1.0)
  mode: ScoringMode; // 자동 채점 가능 여부 (현재 전 항목 AUTO)
}

export const CATEGORY_LABEL: Record<Category, string> = {
  TEACHING: "강의력",
  CONTENT: "콘텐츠",
};

// 화면 구분용 이모지(카테고리/항목). 채점 로직과 무관, 표시 전용.
export const CATEGORY_EMOJI: Record<Category, string> = {
  TEACHING: "🎤",
  CONTENT: "📚",
};

export const DIMENSION_EMOJI: Record<Dimension, string> = {
  DELIVERY: "🗣️",
  ENGAGEMENT: "🙋",
  PACING: "⏱️",
  PRESENTATION: "💬",
  ACCURACY: "✅",
  CURRICULUM: "🎓",
  DIFFICULTY: "📈",
  READABILITY: "📖",
};

// 카테고리 간 가중치(전체 총점 산출용)
export const CATEGORY_WEIGHT: Record<Category, number> = {
  TEACHING: 0.5,
  CONTENT: 0.5,
};

export const DIMENSIONS: DimensionDef[] = [
  // 강의력
  {
    dimension: "DELIVERY",
    category: "TEACHING",
    label: "설명·전달력",
    desc: "개념 설명의 명료함, 논리적 흐름",
    explain:
      "개념을 도입→정의→예시→정리 구조로 명료하게 전달하는지, 새 용어를 정의하는지, 군더더기(필러어)가 적은지를 자막에서 분석합니다.",
    weight: 0.3,
    mode: "AUTO",
  },
  {
    dimension: "ENGAGEMENT",
    category: "TEACHING",
    label: "참여·흥미 유발",
    desc: "동기부여, 학생 몰입 유도",
    explain:
      "학생에게 던지는 발문, 실생활 예시·비유, 상호작용 유도, 동기부여 멘트의 빈도를 자막에서 측정합니다.",
    weight: 0.25,
    mode: "AUTO",
  },
  {
    dimension: "PACING",
    category: "TEACHING",
    label: "구성·속도",
    desc: "수업 흐름, 진도 속도, 적절한 휴지",
    explain:
      "발화 속도(음절/분), 개념당 설명 시간, 말의 휴지 비율이 적정 범위인지 자막 타임스탬프로 계산합니다.",
    weight: 0.25,
    mode: "AUTO",
  },
  {
    dimension: "PRESENTATION",
    category: "TEACHING",
    label: "표현·전달 태도",
    desc: "어투·문장 완결성 등 전달 태도",
    explain:
      "자막으로 확인 가능한 전달 태도(군더더기, 문장 완결성, 중복 표현)를 평가합니다. 음성 톤·발음·판서는 자막만으로는 알 수 없어 제외됩니다.",
    weight: 0.2,
    mode: "AUTO",
  },
  // 콘텐츠
  {
    dimension: "ACCURACY",
    category: "CONTENT",
    label: "내용 정확성·전문성",
    desc: "개념 정의·논리 전개의 충실도",
    explain:
      "개념 정의 제시와 논리 연결의 충실도로 설명의 정확성을 간접 추정합니다. 사실 오류의 정밀 검증은 전문가 또는 실제 AI 검토가 필요합니다(자막 기반 추정값).",
    weight: 0.35,
    mode: "AUTO",
  },
  {
    dimension: "CURRICULUM",
    category: "CONTENT",
    label: "교육과정 부합도",
    desc: "학년·교육과정·수능 연계성",
    explain:
      "강의에서 다룬 내용이 해당 과목·개정 교육과정 성취기준을 얼마나 포함하는지 키워드 매칭으로 산출합니다(자막만으로 평가 가능).",
    weight: 0.25,
    mode: "AUTO",
  },
  {
    dimension: "DIFFICULTY",
    category: "CONTENT",
    label: "난이도 적절성",
    desc: "대상 등급대 대비 난이도",
    explain:
      "어휘 길이와 개념 밀도를 대상 등급대(상/중/하위권) 기대 수준과 비교해 난이도가 적절한지 평가합니다.",
    weight: 0.2,
    mode: "AUTO",
  },
  {
    dimension: "READABILITY",
    category: "CONTENT",
    label: "자료 구성·가독성",
    desc: "교재/진행의 구성·체계성",
    explain:
      "교재 PDF가 있으면 구조·텍스트 밀도를, 없으면 강의 진행의 구성 체계(도입·정리·순서)를 자막에서 평가합니다.",
    weight: 0.2,
    mode: "AUTO",
  },
];

export const DIMENSION_MAP: Record<Dimension, DimensionDef> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.dimension, d]),
) as Record<Dimension, DimensionDef>;

export function dimensionsByCategory(category: Category): DimensionDef[] {
  return DIMENSIONS.filter((d) => d.category === category);
}

// ── 등급 밴드 ────────────────────────────────────────────────
export interface Band {
  grade: string;
  min: number;
  label: string;
}
export const BANDS: Band[] = [
  { grade: "A", min: 90, label: "매우 우수" },
  { grade: "B", min: 75, label: "우수" },
  { grade: "C", min: 60, label: "보통" },
  { grade: "D", min: 40, label: "미흡" },
  { grade: "E", min: 0, label: "부족" },
];

export function toBand(value: number): Band {
  return BANDS.find((b) => value >= b.min) ?? BANDS[BANDS.length - 1];
}

// ── 채점 기준값(적정 범위 등) ─────────────────────────────────
// PACING: 범위형 지표의 적정 구간 [min, max] (분량/차시 길이는 평가 제외)
export const PACING_THRESHOLDS = {
  syllablesPerMin: { min: 280, max: 340 }, // 발화 속도(음절/분)
  secondsPerConcept: { min: 60, max: 180 }, // 개념당 설명 시간
  pauseRatio: { min: 0.05, max: 0.15 }, // 휴지 비율
};

// DELIVERY: 정의율/필러어 기준
export const DELIVERY_THRESHOLDS = {
  termDefinedRatioTarget: 0.8, // 신규 용어 정의율 목표
  fillerRatioGood: 0.02, // 이 이하면 만점
  fillerRatioBad: 0.08, // 이 이상이면 0점
};

// ENGAGEMENT: 10분당 목표 빈도
export const ENGAGEMENT_THRESHOLDS = {
  questionsPer10min: 3,
  examplesPer10min: 1,
};

// CONTENT/ACCURACY: 오류 건당 감점
export const ACCURACY_THRESHOLDS = {
  penaltyPerError: 15,
  penaltyPerSevereError: 30,
};

// CURRICULUM: 커버리지/범위초과 기준
export const CURRICULUM_THRESHOLDS = {
  coverageTarget: 0.8, // 이 이상이면 만점
  overflowMax: 0.1, // 범위 초과 허용
};

// DIFFICULTY: 대상 등급대별 권장 난이도 분포 (쉬움/중/어려움)
export const DIFFICULTY_DISTRIBUTION: Record<
  string,
  { easy: number; mid: number; hard: number }
> = {
  HIGH: { easy: 0.2, mid: 0.4, hard: 0.4 }, // 상위권
  MID: { easy: 0.3, mid: 0.5, hard: 0.2 }, // 중위권
  LOW: { easy: 0.5, mid: 0.4, hard: 0.1 }, // 하위권
};

export const TARGET_LEVEL_LABEL: Record<string, string> = {
  HIGH: "상위권",
  MID: "중위권",
  LOW: "하위권",
};

// DIFFICULTY: 대상 등급대별 기대 난이도 지수(0~1). 강의 복잡도가 이에 가까울수록 적정.
export const DIFFICULTY_TARGET_INDEX: Record<string, number> = {
  HIGH: 0.7,
  MID: 0.5,
  LOW: 0.35,
};

// 카테고리 평균 → 전체 가중 총점
export function weightedTotal(
  scores: { category: Category; dimension: Dimension; value: number }[],
): number {
  // 점수가 있는 카테고리만으로 가중 총점을 재정규화(교재만 분석 시 강의력 없이 콘텐츠로만).
  let sum = 0;
  let wsum = 0;
  for (const cat of ["TEACHING", "CONTENT"] as Category[]) {
    const defs = dimensionsByCategory(cat);
    let cs = 0;
    let cw = 0;
    for (const def of defs) {
      const s = scores.find((x) => x.dimension === def.dimension);
      if (s == null) continue;
      cs += s.value * def.weight;
      cw += def.weight;
    }
    if (cw > 0) {
      sum += (cs / cw) * CATEGORY_WEIGHT[cat];
      wsum += CATEGORY_WEIGHT[cat];
    }
  }
  return wsum > 0 ? sum / wsum : 0;
}

export function categoryAverage(
  scores: { dimension: Dimension; value: number }[],
  category: Category,
): number {
  const defs = dimensionsByCategory(category);
  let sum = 0;
  let wsum = 0;
  for (const def of defs) {
    const s = scores.find((x) => x.dimension === def.dimension);
    if (s == null) continue;
    sum += s.value * def.weight;
    wsum += def.weight;
  }
  return wsum > 0 ? Math.round(sum / wsum) : 0;
}

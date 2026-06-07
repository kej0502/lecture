// 평가기준(루브릭) 보기 — lib/rubric.ts 상수를 그대로 표시하는 서버 컴포넌트.
import { Card, gradeColor } from "@/components/ui";
import {
  ACCURACY_THRESHOLDS,
  BANDS,
  CATEGORY_LABEL,
  CATEGORY_WEIGHT,
  CURRICULUM_THRESHOLDS,
  type Category,
  DELIVERY_THRESHOLDS,
  DIFFICULTY_DISTRIBUTION,
  type Dimension,
  dimensionsByCategory,
  ENGAGEMENT_THRESHOLDS,
  PACING_THRESHOLDS,
  TARGET_LEVEL_LABEL,
} from "@/lib/rubric";

const pct = (n: number) => `${Math.round(n * 100)}%`;

const CATEGORIES: Category[] = ["TEACHING", "CONTENT"];

// 기본(지표 기반) 분석에서 각 항목이 실제로 계산되는 방식.
const SCORING: Record<Dimension, string> = {
  DELIVERY:
    "설명구조(도입·정의·예시·정리 4요소 충족률) 40% + 정의 단서 횟수(5분당 2회 목표) 30% + 필러어 적음(어·음·그 등, 2%↓ 만점·8%↑ 0점) 30%.",
  ENGAGEMENT:
    "발문(≥3회/10분)·예시(≥1회/10분)·상호작용(≥2회/10분)·동기부여(≥2회/10분) 4개 빈도를 각 목표 대비로 환산해 평균.",
  PACING:
    "발화 속도(280~340음절/분)·휴지 비율(5~15%, 타임스탬프 있을 때만)·개념당 설명 시간(60~180초)이 적정 범위에 가까울수록 만점, 측정 가능한 항목들의 평균. 타임스탬프와 강의 길이가 모두 없으면 계산 불가(기본 50).",
  PRESENTATION:
    "필러어 적음 40% + 문장 완결성(어미로 끝나는 자막 구간 비율) 40% + 어휘 다양성(고유 단어/전체 단어) 20%. 음성 톤·발음·판서는 자막만으로 알 수 없어 제외.",
  ACCURACY:
    "기본 50점에서 시작 + 개념 정의 횟수(3회 만점)와 논리 연결어(그래서·따라서·즉 등, 4회 만점)로 가산. 자막 기반 간접 추정이라 사실 오류 정밀 검증은 못 함(실제 LLM 분석 권장).",
  CURRICULUM:
    "등록된 성취기준 중 강의 텍스트에 키워드가 등장한 비율(커버리지)을 목표 80% 대비로 환산. 해당 영역·개정의 성취기준이 등록돼 있어야 채점(없으면 기본 50).",
  DIFFICULTY:
    "강의 복잡도(어휘 길이 60% + 개념 밀도 40%)를 대상 등급대 기대치(상 0.70·중 0.50·하 0.35)와 비교 — 가까울수록 만점, 너무 쉽거나 어려우면 감점.",
  READABILITY:
    "교재 구조(목차·소제목·문항번호·해설 4요소 충족률) 70% + 페이지당 글자수(800~2000자 적정) 30%. 교재 PDF가 있을 때만 채점(없으면 이 항목 제외).",
};

export default function RubricPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">평가기준</h1>
        <p className="mt-1 text-sm text-slate-500">
          강의는 <b>강의력</b>과 <b>콘텐츠</b> 2개 대분류, 각 4개 항목으로 0~100점
          채점됩니다. 아래 가중치로 합산해 총점을 산출합니다.
        </p>
        <div className="mt-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600 space-y-1">
          <p>
            <b>총점 계산:</b> 항목 점수를 카테고리 내 가중치로 가중평균 → 강의력 평균 ×{" "}
            {pct(CATEGORY_WEIGHT.TEACHING)} + 콘텐츠 평균 × {pct(CATEGORY_WEIGHT.CONTENT)}.
          </p>
          <p>
            <b>두 가지 채점 방식:</b> (1) <b>기본(지표 기반)</b> — 키 없이 무료, 자막·교재에서
            아래 방식대로 수치를 계산. (2) <b>AI(LLM)</b> — 본인 키 입력 시 Claude/Gemini가
            내용을 읽고 같은 8개 항목을 채점. 아래 "채점 방식"은 기본 분석 기준입니다.
          </p>
        </div>
      </div>

      {/* 등급 밴드 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">등급 기준</h2>
        <div className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <span
              key={b.grade}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
              style={{ backgroundColor: gradeColor(b.min), color: "#fff" }}
            >
              {b.grade} · {b.label}
              <span className="opacity-80">({b.min}점 이상)</span>
            </span>
          ))}
        </div>
      </Card>

      {/* 카테고리별 항목 */}
      {CATEGORIES.map((cat) => (
        <Card key={cat} className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{CATEGORY_LABEL[cat]}</h2>
            <span className="text-sm text-slate-500">
              총점 비중 {pct(CATEGORY_WEIGHT[cat])}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {dimensionsByCategory(cat).map((d) => (
              <div key={d.dimension} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium text-slate-900">{d.label}</h3>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {CATEGORY_LABEL[cat]} 내 {pct(d.weight)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{d.desc}</p>
                <p className="mt-1 text-sm text-slate-600">{d.explain}</p>
                <p className="mt-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
                  <b className="text-slate-600">채점 방식:</b> {SCORING[d.dimension]}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* 세부 채점 기준값 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">세부 채점 기준값</h2>
        <p className="text-sm text-slate-500">
          자동 채점에 쓰이는 적정 범위·목표치입니다. (자막 타임스탬프·텍스트 기반)
        </p>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li>
            <b>발화 속도</b>: {PACING_THRESHOLDS.syllablesPerMin.min}~
            {PACING_THRESHOLDS.syllablesPerMin.max} 음절/분
          </li>
          <li>
            <b>개념당 설명 시간</b>: {PACING_THRESHOLDS.secondsPerConcept.min}~
            {PACING_THRESHOLDS.secondsPerConcept.max}초
          </li>
          <li>
            <b>휴지(말 멈춤) 비율</b>: {pct(PACING_THRESHOLDS.pauseRatio.min)}~
            {pct(PACING_THRESHOLDS.pauseRatio.max)}
          </li>
          <li>
            <b>신규 용어 정의율 목표</b>:{" "}
            {pct(DELIVERY_THRESHOLDS.termDefinedRatioTarget)}
          </li>
          <li>
            <b>군더더기(필러어)</b>: {pct(DELIVERY_THRESHOLDS.fillerRatioGood)} 이하
            만점 · {pct(DELIVERY_THRESHOLDS.fillerRatioBad)} 이상 0점
          </li>
          <li>
            <b>발문·예시 빈도(10분당)</b>: 발문 {ENGAGEMENT_THRESHOLDS.questionsPer10min}
            회 · 실생활 예시 {ENGAGEMENT_THRESHOLDS.examplesPer10min}회
          </li>
          <li>
            <b>내용 정확성 감점</b>: 오류당 {ACCURACY_THRESHOLDS.penaltyPerError}점 ·
            중대한 오류당 {ACCURACY_THRESHOLDS.penaltyPerSevereError}점
          </li>
          <li>
            <b>교육과정 커버리지</b>: {pct(CURRICULUM_THRESHOLDS.coverageTarget)} 이상
            만점 · 범위 초과 {pct(CURRICULUM_THRESHOLDS.overflowMax)}까지 허용
          </li>
        </ul>

        <div className="pt-1">
          <h3 className="text-sm font-medium text-slate-700">
            대상 등급대별 권장 난이도 분포 (쉬움 / 중간 / 어려움)
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pr-6 font-medium">등급대</th>
                  <th className="pr-6 font-medium">쉬움</th>
                  <th className="pr-6 font-medium">중간</th>
                  <th className="font-medium">어려움</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(DIFFICULTY_DISTRIBUTION).map(([level, dist]) => (
                  <tr key={level} className="border-t border-slate-100">
                    <td className="py-1 pr-6">
                      {TARGET_LEVEL_LABEL[level] ?? level}
                    </td>
                    <td className="py-1 pr-6">{pct(dist.easy)}</td>
                    <td className="py-1 pr-6">{pct(dist.mid)}</td>
                    <td className="py-1">{pct(dist.hard)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
}

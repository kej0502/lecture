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
  dimensionsByCategory,
  ENGAGEMENT_THRESHOLDS,
  PACING_THRESHOLDS,
  TARGET_LEVEL_LABEL,
} from "@/lib/rubric";

const pct = (n: number) => `${Math.round(n * 100)}%`;

const CATEGORIES: Category[] = ["TEACHING", "CONTENT"];

export default function RubricPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">평가기준</h1>
        <p className="mt-1 text-sm text-slate-500">
          강의는 <b>강의력</b>과 <b>콘텐츠</b> 2개 대분류, 각 4개 항목으로 0~100점
          채점됩니다. 각 항목은 자막·교재 텍스트에서 객관 지표를 계산해 자동 채점되며,
          아래 가중치로 합산해 총점을 산출합니다.
        </p>
      </div>

      {/* 등급 밴드 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">등급 기준</h2>
        <div className="flex flex-wrap gap-2">
          {BANDS.map((b) => (
            <span
              key={b.grade}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-white"
              style={{ backgroundColor: gradeColor(b.min) }}
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

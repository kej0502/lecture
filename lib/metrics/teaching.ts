// 강의력(TEACHING) 지표: 자막에서 DELIVERY / ENGAGEMENT / PACING / PRESENTATION 자동 채점.
// 점수 + 정성평가 + 지표 + 근거(자막 구간·타임)를 산출. 타임스탬프 없으면 강의 길이 입력으로 속도 보정.
import type { SubtitleDoc } from "@/lib/extract/types";
import { qualitativeText } from "@/lib/qualitative";
import {
  DELIVERY_THRESHOLDS,
  ENGAGEMENT_THRESHOLDS,
  PACING_THRESHOLDS,
} from "@/lib/rubric";
import type { DimensionScore, Evidence } from "./types";
import {
  countMatches,
  countSyllables,
  evidenceFromSegments,
  fmtTime,
  rangeScore,
  round,
  tokenize,
} from "./text-utils";

const STRUCTURE_PATTERNS = {
  도입: /오늘은|이번 ?시간|이번 ?강의|배워\s?볼|살펴보|시작해|들어가|알아보/,
  정의: /란\s|이란|라고\s?하|정의|의미는|뜻은|개념은/,
  예시: /예를\s?들|예시|예제|문제를|가령|이를테면|풀어\s?보/,
  정리: /정리하면|요약하면|정리해|마무리|오늘\s?배운|핵심은|기억해/,
};

const FILLER_PATTERN = /(?:^|\s)(어+|음+|그+|이제|뭐|자\b|에\b|아\b)(?=\s|$)/g;
const DEFINITION_CUE = /란\s|이란|라고\s?하|정의|의미는|뜻은/;
const QUESTION_PATTERN = /\?|왜\s|어떻게|어떨까|일까|할까요|볼까요|보세요|구해\s?보|생각해/;
const EXAMPLE_PATTERN = /예를\s?들|예시|예제|가령|실제로|일상|현실|이를테면/;
const INTERACT_PATTERN = /여러분|직접\s|풀어\s?보세요|멈추고|따라\s?해|해\s?봅시다|같이\s/;
const MOTIVATE_PATTERN = /중요한|빈출|시험에|자주\s?나오|꼭\s|반드시|핵심/;
const SENTENCE_END = /(다|요|죠|까|네|함|음|오)[.!?]?$/;

function effectiveMinutes(sub: SubtitleDoc, syllables: number): number {
  if (sub.durationSec > 0) return sub.durationSec / 60;
  return Math.max(syllables / 310, 0.5);
}

export function analyzeTeaching(
  sub: SubtitleDoc,
  runningTimeSec?: number | null,
): DimensionScore[] {
  // 자막/스크립트가 없으면 강의력(전달·참여·속도·태도)은 평가 불가 → 항목 제외(교재만 분석).
  if (!sub.text.trim() && sub.segments.length === 0) return [];
  const text = sub.text;
  const syllables = countSyllables(text);
  const tokens = tokenize(text);
  const minutes = effectiveMinutes(sub, syllables);
  const per10 = (n: number) => (minutes > 0 ? n / (minutes / 10) : 0);

  // ── DELIVERY ──────────────────────────────────────────────
  const structureHits = Object.entries(STRUCTURE_PATTERNS).filter(([, re]) =>
    re.test(text),
  );
  const structureScore = structureHits.length / 4;
  const defCues = countMatches(text, DEFINITION_CUE);
  const defTarget = Math.max(1, (minutes / 5) * 2);
  const defRatio = Math.min(1, defCues / defTarget);
  const fillerCount = countMatches(text, FILLER_PATTERN);
  const fillerRatio = tokens.length > 0 ? fillerCount / tokens.length : 0;
  let fillerScore: number;
  if (fillerRatio <= DELIVERY_THRESHOLDS.fillerRatioGood) fillerScore = 1;
  else if (fillerRatio >= DELIVERY_THRESHOLDS.fillerRatioBad) fillerScore = 0;
  else
    fillerScore =
      1 -
      (fillerRatio - DELIVERY_THRESHOLDS.fillerRatioGood) /
        (DELIVERY_THRESHOLDS.fillerRatioBad - DELIVERY_THRESHOLDS.fillerRatioGood);

  const deliveryValue = round(
    (structureScore * 0.4 + defRatio * 0.3 + fillerScore * 0.3) * 100,
  );
  const delivery: DimensionScore = {
    category: "TEACHING",
    dimension: "DELIVERY",
    value: deliveryValue,
    qualitative: qualitativeText("DELIVERY", deliveryValue),
    comment: `설명 구조 ${structureHits.length}/4요소(${structureHits.map(([k]) => k).join("·") || "없음"}), 정의 단서 ${defCues}회, 필러어 비율 ${(fillerRatio * 100).toFixed(1)}%`,
    indicators: [
      { key: "structure", label: "설명 구조 충족", value: `${structureHits.length}/4`, detail: "도입·정의·예시·정리" },
      { key: "defCue", label: "정의 단서", value: `${defCues}회`, detail: `목표 ${defTarget.toFixed(0)}회` },
      { key: "filler", label: "필러어 비율", value: `${(fillerRatio * 100).toFixed(1)}%`, detail: `적정 ≤${DELIVERY_THRESHOLDS.fillerRatioGood * 100}%` },
    ],
    evidence: [
      ...evidenceFromSegments(sub.segments, DEFINITION_CUE, "개념/용어를 정의하는 부분"),
      ...structureHits.slice(0, 2).map(([k]) => ({ text: `'${k}' 단계 표현이 강의에 나타남`, reason: "설명 구조 4요소 중 충족 항목" })),
    ],
  };

  // ── ENGAGEMENT ────────────────────────────────────────────
  const qCount = countMatches(text, QUESTION_PATTERN);
  const exCount = countMatches(text, EXAMPLE_PATTERN);
  const interactCount = countMatches(text, INTERACT_PATTERN);
  const motivateCount = countMatches(text, MOTIVATE_PATTERN);
  const qScore = Math.min(1, per10(qCount) / ENGAGEMENT_THRESHOLDS.questionsPer10min);
  const exScore = Math.min(1, per10(exCount) / ENGAGEMENT_THRESHOLDS.examplesPer10min);
  const interactScore = Math.min(1, per10(interactCount) / 2);
  const motivateScore = Math.min(1, per10(motivateCount) / 2);
  const engagementValue = round(((qScore + exScore + interactScore + motivateScore) / 4) * 100);
  const engagement: DimensionScore = {
    category: "TEACHING",
    dimension: "ENGAGEMENT",
    value: engagementValue,
    qualitative: qualitativeText("ENGAGEMENT", engagementValue),
    comment: `발문 ${qCount}회, 예시 ${exCount}회, 상호작용 ${interactCount}회, 동기부여 ${motivateCount}회 (약 ${minutes.toFixed(0)}분 기준)`,
    indicators: [
      { key: "question", label: "발문 빈도", value: `${per10(qCount).toFixed(1)}회/10분`, detail: `목표 ≥${ENGAGEMENT_THRESHOLDS.questionsPer10min}` },
      { key: "example", label: "예시·비유", value: `${per10(exCount).toFixed(1)}회/10분`, detail: `목표 ≥${ENGAGEMENT_THRESHOLDS.examplesPer10min}` },
      { key: "interact", label: "상호작용 표현", value: `${interactCount}회` },
      { key: "motivate", label: "동기부여 멘트", value: `${motivateCount}회` },
    ],
    evidence: [
      ...evidenceFromSegments(sub.segments, QUESTION_PATTERN, "학생에게 던진 발문"),
      ...evidenceFromSegments(sub.segments, EXAMPLE_PATTERN, "예시·실생활 연결"),
      ...evidenceFromSegments(sub.segments, INTERACT_PATTERN, "상호작용 유도 표현", 1),
    ].slice(0, 4),
  };

  // ── PACING ────────────────────────────────────────────────
  const hasTimestamps = sub.durationSec > 0;
  const effDurationSec = hasTimestamps
    ? sub.durationSec
    : runningTimeSec && runningTimeSec > 0
      ? runningTimeSec
      : 0;
  const pacingParts: { score: number; label: string; value: string; detail: string }[] = [];
  const pacingEvidence: Evidence[] = [];

  if (effDurationSec > 0) {
    const spm = syllables / (effDurationSec / 60);
    pacingParts.push({
      score: rangeScore(spm, PACING_THRESHOLDS.syllablesPerMin.min, PACING_THRESHOLDS.syllablesPerMin.max),
      label: "발화 속도",
      value: `${spm.toFixed(0)} 음절/분${hasTimestamps ? "" : " (길이 입력 기준)"}`,
      detail: `적정 ${PACING_THRESHOLDS.syllablesPerMin.min}~${PACING_THRESHOLDS.syllablesPerMin.max}`,
    });
  }

  if (hasTimestamps) {
    // 가장 빠른 구간 근거
    let fastest = { spm: 0, seg: sub.segments[0] };
    for (const seg of sub.segments) {
      const dur = seg.end - seg.start;
      if (dur <= 0) continue;
      const s = countSyllables(seg.text) / (dur / 60);
      if (s > fastest.spm) fastest = { spm: s, seg };
    }
    if (fastest.seg) {
      pacingEvidence.push({ time: fmtTime(fastest.seg.start), text: fastest.seg.text.trim(), reason: `가장 빠른 구간 약 ${fastest.spm.toFixed(0)}음절/분` });
    }
    // 휴지 비율
    let gap = 0;
    let maxGap = { d: 0, at: 0 };
    for (let i = 0; i < sub.segments.length - 1; i++) {
      const d = sub.segments[i + 1].start - sub.segments[i].end;
      if (d > 0) {
        gap += d;
        if (d > maxGap.d) maxGap = { d, at: sub.segments[i].end };
      }
    }
    if (sub.segments.length >= 2) {
      const pr = gap / sub.durationSec;
      pacingParts.push({
        score: rangeScore(pr, PACING_THRESHOLDS.pauseRatio.min, PACING_THRESHOLDS.pauseRatio.max),
        label: "휴지 비율",
        value: `${(pr * 100).toFixed(1)}%`,
        detail: `적정 ${PACING_THRESHOLDS.pauseRatio.min * 100}~${PACING_THRESHOLDS.pauseRatio.max * 100}%`,
      });
      pacingEvidence.push(
        maxGap.d > 0
          ? { time: fmtTime(maxGap.at), text: `약 ${maxGap.d.toFixed(1)}초 동안 말의 공백`, reason: "가장 긴 휴지 구간" }
          : { text: "자막 구간 사이 공백이 거의 없음", reason: "휴지 비율 0%에 가까움(쉴 틈 부족 가능)" },
      );
    }
  }

  const conceptSignals = defCues + structureHits.length;
  if (effDurationSec > 0 && conceptSignals > 0) {
    const secPerConcept = effDurationSec / conceptSignals;
    pacingParts.push({
      score: rangeScore(secPerConcept, PACING_THRESHOLDS.secondsPerConcept.min, PACING_THRESHOLDS.secondsPerConcept.max),
      label: "개념당 설명 시간",
      value: `${secPerConcept.toFixed(0)}초`,
      detail: `적정 ${PACING_THRESHOLDS.secondsPerConcept.min}~${PACING_THRESHOLDS.secondsPerConcept.max}초`,
    });
  }

  const pacingValue = pacingParts.length > 0 ? round(pacingParts.reduce((a, b) => a + b.score, 0) / pacingParts.length) : 50;
  let pacingComment: string;
  if (pacingParts.length === 0) {
    pacingComment = "자막 타임스탬프가 없고 강의 길이도 입력되지 않아 속도를 계산할 수 없습니다. 타임스탬프(SRT) 자막을 올리거나 강의 길이(분)를 입력하면 자동 채점됩니다.";
  } else if (!hasTimestamps) {
    pacingComment = `${pacingParts.map((p) => `${p.label} ${p.value}`).join(", ")} — 타임스탬프가 없어 강의 길이 입력값으로 추정(휴지 비율은 측정 불가)`;
  } else {
    pacingComment = pacingParts.map((p) => `${p.label} ${p.value}`).join(", ");
  }
  const pacing: DimensionScore = {
    category: "TEACHING",
    dimension: "PACING",
    value: pacingValue,
    qualitative: qualitativeText("PACING", pacingValue),
    comment: pacingComment,
    indicators: pacingParts.map((p) => ({ key: p.label, label: p.label, value: p.value, detail: p.detail })),
    evidence: pacingEvidence,
  };

  // ── PRESENTATION (자막 기반 전달 태도) ─────────────────────
  const segs = sub.segments.length > 0 ? sub.segments.map((s) => s.text) : [text];
  const completeCount = segs.filter((t) => SENTENCE_END.test(t.trim())).length;
  const completeness = segs.length > 0 ? completeCount / segs.length : 0.5;
  const uniqueRatio = tokens.length > 0 ? new Set(tokens).size / tokens.length : 1;
  const presentationValue = round((fillerScore * 0.4 + completeness * 0.4 + uniqueRatio * 0.2) * 100);
  const presentationEvidence: Evidence[] = evidenceFromSegments(sub.segments, FILLER_PATTERN, "군더더기(필러어)가 포함된 구간", 2);
  if (presentationEvidence.length === 0 && sub.segments.length > 0) {
    presentationEvidence.push({ time: fmtTime(sub.segments[0].start), text: sub.segments[0].text.trim(), reason: "문장이 어미로 깔끔히 마무리되는 예" });
  }
  const presentation: DimensionScore = {
    category: "TEACHING",
    dimension: "PRESENTATION",
    value: presentationValue,
    qualitative: qualitativeText("PRESENTATION", presentationValue),
    comment: `필러어 비율 ${(fillerRatio * 100).toFixed(1)}%, 문장 완결성 ${(completeness * 100).toFixed(0)}%, 어휘 다양성 ${(uniqueRatio * 100).toFixed(0)}% (음성·판서 제외)`,
    indicators: [
      { key: "filler", label: "군더더기 적음", value: `${(fillerRatio * 100).toFixed(1)}%`, detail: "낮을수록 좋음" },
      { key: "complete", label: "문장 완결성", value: `${(completeness * 100).toFixed(0)}%` },
      { key: "diversity", label: "어휘 다양성", value: `${(uniqueRatio * 100).toFixed(0)}%` },
    ],
    evidence: presentationEvidence,
  };

  return [delivery, engagement, pacing, presentation];
}

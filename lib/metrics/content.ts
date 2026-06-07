// 콘텐츠(CONTENT) 지표: 자막 기반 ACCURACY / CURRICULUM / DIFFICULTY 자동 채점.
// READABILITY(자료 구성·가독성)는 교재 PDF가 있을 때만 채점(없으면 항목 제외).
import type { PdfDoc, SubtitleDoc } from "@/lib/extract/types";
import { qualitativeText } from "@/lib/qualitative";
import {
  CURRICULUM_THRESHOLDS,
  DIFFICULTY_TARGET_INDEX,
  TARGET_LEVEL_LABEL,
} from "@/lib/rubric";
import type { DimensionScore, Evidence } from "./types";
import {
  clamp,
  countMatches,
  countSyllables,
  evidenceFromSegments,
  round,
  tokenize,
} from "./text-utils";

export interface StandardLite {
  code: string;
  statement: string;
  keywords: string[];
}

export interface ContentInput {
  subtitle: SubtitleDoc;
  pdf?: PdfDoc | null;
  standards: StandardLite[];
  targetLevel?: string | null;
}

const DEFINITION_CUE = /란\s|이란|라고\s?하|정의|의미는|뜻은/;
const CONNECTIVE = /그래서|따라서|왜냐하면|즉\s|그러므로|때문에|그러면|그러니까|결국/;

export function analyzeContent(input: ContentInput): DimensionScore[] {
  const { subtitle, pdf, standards, targetLevel } = input;
  const subjectText = `${subtitle.text}\n${pdf?.text ?? ""}`;
  const segments = subtitle.segments;
  const result: DimensionScore[] = [];

  // ── ACCURACY (자막 기반 간접 추정) ─────────────────────────
  const defCues = countMatches(subjectText, DEFINITION_CUE);
  const connCount = countMatches(subjectText, CONNECTIVE);
  const tokens = tokenize(subtitle.text);
  const defScore = Math.min(1, defCues / 3);
  const connScore = Math.min(1, connCount / 4);
  const accuracyValue = round(50 + (defScore * 0.5 + connScore * 0.5) * 45);
  result.push({
    category: "CONTENT",
    dimension: "ACCURACY",
    value: accuracyValue,
    qualitative: qualitativeText("ACCURACY", accuracyValue),
    comment: `개념 정의 ${defCues}회·논리 연결어 ${connCount}회로 설명 충실도를 추정(사실검증은 전문가 확인 권장)`,
    indicators: [
      { key: "def", label: "개념 정의", value: `${defCues}회` },
      { key: "conn", label: "논리 연결어", value: `${connCount}회` },
    ],
    evidence: [
      ...evidenceFromSegments(segments, DEFINITION_CUE, "개념을 정의·설명한 부분(정확성 근거)"),
      ...evidenceFromSegments(segments, CONNECTIVE, "논리적 연결(인과·전개)이 드러난 부분", 1),
    ].slice(0, 3),
  });

  // ── CURRICULUM (자막 키워드 매칭) ──────────────────────────
  if (standards.length > 0) {
    let matched = 0;
    const matchedCodes: string[] = [];
    const curEvidence: Evidence[] = [];
    for (const s of standards) {
      const hitKw = s.keywords.find((k) => k.trim() !== "" && subjectText.includes(k.trim()));
      if (hitKw) {
        matched++;
        matchedCodes.push(s.code);
        if (curEvidence.length < 3) {
          const seg = segments.find((g) => g.text.includes(hitKw));
          curEvidence.push({
            text: seg ? seg.text.trim() : `'${hitKw}' 언급`,
            reason: `성취기준 ${s.code} 관련 키워드 '${hitKw}' 등장`,
          });
        }
      }
    }
    const coverage = matched / standards.length;
    const value = round(Math.min(100, (coverage / CURRICULUM_THRESHOLDS.coverageTarget) * 100));
    result.push({
      category: "CONTENT",
      dimension: "CURRICULUM",
      value,
      qualitative: qualitativeText("CURRICULUM", value),
      comment: `성취기준 커버리지 ${(coverage * 100).toFixed(0)}% (${matched}/${standards.length}개 충족)`,
      indicators: [
        { key: "coverage", label: "성취기준 커버리지", value: `${(coverage * 100).toFixed(0)}%`, detail: `목표 ≥${CURRICULUM_THRESHOLDS.coverageTarget * 100}%` },
        { key: "matched", label: "충족 성취기준", value: `${matched}/${standards.length}`, detail: matchedCodes.slice(0, 5).join(", ") },
      ],
      evidence: curEvidence,
    });
  } else {
    result.push({
      category: "CONTENT",
      dimension: "CURRICULUM",
      value: 50,
      qualitative: "해당 영역·개정의 교육과정 데이터가 없어 연계도를 판단하지 못했습니다.",
      comment: "이 영역·개정의 성취기준 데이터가 없어 기본값(50)입니다. /curriculum에서 성취기준을 등록하면 자막 기반으로 자동 채점됩니다.",
      indicators: [{ key: "nodata", label: "성취기준 데이터", value: "없음" }],
      evidence: [],
    });
  }

  // ── DIFFICULTY (어휘·개념 밀도 vs 대상 수준) ───────────────
  const level = targetLevel ?? "MID";
  const targetIndex = DIFFICULTY_TARGET_INDEX[level] ?? DIFFICULTY_TARGET_INDEX.MID;
  const syllables = countSyllables(subtitle.text);
  const avgSyllPerToken = tokens.length > 0 ? syllables / tokens.length : 2;
  const lexIndex = clamp((avgSyllPerToken - 1.5) / (3.0 - 1.5), 0, 1);
  const minutes = subtitle.durationSec > 0 ? subtitle.durationSec / 60 : Math.max(syllables / 310, 0.5);
  const conceptDensity = defCues / Math.max(minutes, 0.5);
  const densityIndex = clamp(conceptDensity / 2, 0, 1);
  const complexity = lexIndex * 0.6 + densityIndex * 0.4;
  const difficultyValue = clamp(round(100 - Math.abs(complexity - targetIndex) * 130));
  const hardTokens = Array.from(new Set(tokens.filter((t) => countSyllables(t) >= 4))).slice(0, 5);
  result.push({
    category: "CONTENT",
    dimension: "DIFFICULTY",
    value: difficultyValue,
    qualitative: qualitativeText("DIFFICULTY", difficultyValue),
    comment: `복잡도 지수 ${(complexity * 100).toFixed(0)} vs 대상 ${TARGET_LEVEL_LABEL[level] ?? "중위권"} 기대 ${(targetIndex * 100).toFixed(0)} (어휘 길이·개념 밀도 기준)`,
    indicators: [
      { key: "lex", label: "평균 어휘 길이", value: `${avgSyllPerToken.toFixed(2)}음절/단어` },
      { key: "density", label: "개념 밀도", value: `${conceptDensity.toFixed(1)}개/분` },
      { key: "target", label: "대상 등급대", value: TARGET_LEVEL_LABEL[level] ?? "중위권" },
    ],
    evidence: hardTokens.length > 0 ? [{ text: hardTokens.join(", "), reason: "난이도 판단에 쓰인 긴 어휘/전문 용어 예시" }] : [],
  });

  // ── READABILITY (교재 PDF가 있을 때만) ─────────────────────
  if (pdf && pdf.charCount > 0) {
    const t = pdf.text;
    const checks = {
      목차: /목\s?차|차례|contents/i.test(t),
      소제목: countMatches(t, /(?:^|\n)\s*\d+[.)]\s|단원|chapter|장\s/) >= 2,
      문항번호: countMatches(t, /[①-⑳]|\b\d+\s*[.)]\s/) >= 3,
      해설정답: /해설|정답|풀이|답\s*:/.test(t),
    };
    const checkHits = Object.values(checks).filter(Boolean).length;
    const structureScore = checkHits / 4;
    const density = pdf.pages > 0 ? pdf.charCount / pdf.pages : pdf.charCount;
    let densityScore: number;
    if (density >= 800 && density <= 2000) densityScore = 1;
    else if (density < 800) densityScore = Math.max(0, density / 800);
    else densityScore = Math.max(0, 1 - (density - 2000) / 2000);
    const value = round((structureScore * 0.7 + densityScore * 0.3) * 100);
    result.push({
      category: "CONTENT",
      dimension: "READABILITY",
      value,
      qualitative: qualitativeText("READABILITY", value),
      comment: `교재 구조 ${checkHits}/4(${Object.entries(checks).filter(([, v]) => v).map(([k]) => k).join("·") || "없음"}), 페이지당 ${density.toFixed(0)}자`,
      indicators: [
        { key: "structure", label: "구조 요소", value: `${checkHits}/4`, detail: "목차·소제목·문항번호·해설" },
        { key: "density", label: "페이지당 글자수", value: `${density.toFixed(0)}자`, detail: "적정 800~2000" },
        { key: "pages", label: "페이지 수", value: `${pdf.pages}p` },
      ],
      evidence: [{ text: `교재 ${pdf.pages}페이지, 총 ${pdf.charCount}자`, reason: "구조·밀도 산출 근거" }],
    });
  }

  return result;
}

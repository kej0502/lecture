"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CombinedReport } from "@/components/CombinedReport";
import { Card, ScoreBadge } from "@/components/ui";
import { api } from "@/lib/client";
import {
  type EvalLite,
  evalAggregate,
  latestOf,
  providerLabel,
} from "@/lib/report-view";
import type { LectureDTO } from "@/lib/types";

const KIND_LABEL: Record<string, string> = {
  SUBTITLE: "자막",
  SCRIPT: "스크립트",
  PDF: "교재 PDF",
  VIDEO: "영상",
};

// AI 제공자별 모델 옵션 + 키 발급 안내
const AI_DEFAULT_MODEL = {
  gemini: "gemini-2.5-flash",
  claude: "claude-opus-4-8",
} as const;
const AI_MODELS: Record<"gemini" | "claude", [string, string][]> = {
  gemini: [
    ["gemini-2.5-flash", "Gemini 2.5 Flash (무료·권장)"],
    ["gemini-2.5-flash-lite", "Gemini 2.5 Flash-Lite (무료·더 빠름)"],
  ],
  claude: [
    ["claude-opus-4-8", "Opus 4.8 (최고 품질·유료)"],
    ["claude-sonnet-4-6", "Sonnet 4.6 (유료)"],
    ["claude-haiku-4-5", "Haiku 4.5 (저렴·유료)"],
  ],
};
const AI_KEY_HELP = {
  gemini: {
    label: "Google AI Studio에서 무료 발급",
    url: "https://aistudio.google.com/apikey",
    placeholder: "AIza...",
  },
  claude: {
    label: "Anthropic 콘솔에서 발급(유료)",
    url: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-...",
  },
} as const;

export default function LectureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lecture, setLecture] = useState<LectureDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [evaluator, setEvaluator] = useState("");
  // 사용자별 AI 제공자/키/모델 (브라우저에만 저장, 서버 전송은 분석 시 헤더로만)
  const [provider, setProvider] = useState<"gemini" | "claude">("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>(AI_DEFAULT_MODEL.gemini);

  useEffect(() => {
    const p =
      (localStorage.getItem("ai_provider") as "gemini" | "claude") || "gemini";
    setProvider(p);
    setApiKey(localStorage.getItem(`ai_key_${p}`) ?? "");
    setModel(localStorage.getItem(`ai_model_${p}`) ?? AI_DEFAULT_MODEL[p]);
  }, []);

  function changeProvider(p: "gemini" | "claude") {
    setProvider(p);
    localStorage.setItem("ai_provider", p);
    setApiKey(localStorage.getItem(`ai_key_${p}`) ?? "");
    setModel(localStorage.getItem(`ai_model_${p}`) ?? AI_DEFAULT_MODEL[p]);
  }
  function saveKey(v: string) {
    setApiKey(v);
    localStorage.setItem(`ai_key_${provider}`, v);
  }
  function saveModel(v: string) {
    setModel(v);
    localStorage.setItem(`ai_model_${provider}`, v);
  }

  const reload = useCallback(async () => {
    const data = await api<LectureDTO>(`/api/lectures/${id}`);
    setLecture(data);
  }, [id]);

  useEffect(() => {
    reload()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [reload]);

  async function runAnalyze() {
    if (!evaluator.trim()) {
      setError("평가자 이름을 입력하세요.");
      return;
    }
    setAnalyzing(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey.trim()) {
        headers["x-ai-provider"] = provider;
        headers["x-ai-api-key"] = apiKey.trim();
        headers["x-ai-model"] = model;
      }
      await api(`/api/lectures/${id}/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({ evaluatorName: evaluator }),
      });
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function removeLecture() {
    if (!confirm("이 강의와 모든 평가 이력을 삭제할까요?")) return;
    await api(`/api/lectures/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (loading) return <p className="text-slate-500">불러오는 중…</p>;
  if (error && !lecture) return <p className="text-red-600">{error}</p>;
  if (!lecture) return null;

  const evals = lecture.evaluations as unknown as EvalLite[];
  const aiEv = latestOf(evals, "AI");

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline">
            ← 대시보드
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{lecture.title}</h1>
          <p className="text-sm text-slate-500">
            {lecture.platform ? `${lecture.platform} · ` : ""}
            {lecture.subject}
            {lecture.instructor ? ` · ${lecture.instructor}` : ""}
            {lecture.targetGrade ? ` · ${lecture.targetGrade}` : ""}
            {lecture.targetLevel ? ` · ${levelLabel(lecture.targetLevel)}` : ""}
            {lecture.curriculumRevision ? ` · ${lecture.curriculumRevision} 개정` : ""}
          </p>
          {lecture.sourceUrl && (
            <a
              href={lecture.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              강의 링크 ↗
            </a>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2">
            <a
              href={`/api/lectures/${id}/export?format=csv`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              CSV
            </a>
            <a
              href={`/api/lectures/${id}/export?format=pdf`}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              PDF 리포트
            </a>
          </div>
          <button
            onClick={removeLecture}
            className="text-xs text-slate-400 hover:text-red-600"
          >
            강의 삭제
          </button>
        </div>
      </div>

      {error && <p className="text-red-600">{error}</p>}

      {/* 입력 자료 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">입력 자료</h2>
        {lecture.assets.length === 0 && (
          <p className="text-sm text-slate-400">업로드된 자료가 없습니다.</p>
        )}
        {lecture.assets.map((a) => (
          <div key={a.id} className="rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {KIND_LABEL[a.kind] ?? a.kind} · {a.filename}
              </span>
              <span className="text-xs text-slate-400">{metaLabel(a.meta)}</span>
            </div>
            {a.extractedText && (
              <p className="mt-1 line-clamp-3 text-xs text-slate-500">
                {a.extractedText.slice(0, 300)}
              </p>
            )}
          </div>
        ))}
      </Card>

      {/* AI 자동 평가 실행 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">AI 자동 평가</h2>
        <p className="text-sm text-slate-500">
          자막(+교재)을 분석해 8개 항목을 채점하고, 각 항목의 평가 근거(자막 구간·타임)를
          함께 제시합니다.
        </p>

        {/* 내 AI 키 — 각자 자기 계정으로 분석 (Gemini 무료 / Claude 유료) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">AI 제공자</span>
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={provider}
              onChange={(e) =>
                changeProvider(e.target.value as "gemini" | "claude")
              }
            >
              <option value="gemini">Gemini (무료)</option>
              <option value="claude">Claude (유료)</option>
            </select>
          </div>
          <p className="text-xs text-slate-400">
            본인 키를 넣으면 <b>내 계정으로 실제 LLM 분석</b>을 합니다. 키는 이 브라우저에만
            저장되며 서버에 보관하지 않습니다.{" "}
            <a
              href={AI_KEY_HELP[provider].url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {AI_KEY_HELP[provider].label} ↗
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder={AI_KEY_HELP[provider].placeholder}
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              autoComplete="off"
            />
            <select
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={model}
              onChange={(e) => saveModel(e.target.value)}
            >
              {AI_MODELS[provider].map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            {apiKey && (
              <button
                onClick={() => saveKey("")}
                className="text-xs text-slate-400 hover:text-red-600"
              >
                키 삭제
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {apiKey.trim()
              ? `✅ 내 ${provider === "gemini" ? "Gemini" : "Claude"} 키로 실제 LLM 분석을 실행합니다.`
              : "키 미입력 시 기본(지표 기반) 분석으로 실행됩니다."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="평가자 이름"
            value={evaluator}
            onChange={(e) => setEvaluator(e.target.value)}
          />
          <button
            onClick={runAnalyze}
            disabled={analyzing}
            style={{ color: "#fff" }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {analyzing ? "분석 중…" : aiEv ? "다시 평가" : "AI 평가 실행"}
          </button>
        </div>
      </Card>

      {/* 리포트 */}
      {aiEv && (
        <p className="text-sm text-slate-500">
          최근 분석 방식:{" "}
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              aiEv.provider === "claude" || aiEv.provider === "gemini"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {providerLabel(aiEv.provider)}
          </span>
        </p>
      )}
      {aiEv && <CombinedReport ev={aiEv} />}

      {/* 평가 이력 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">평가 이력 ({evals.length})</h2>
        {evals.length === 0 && (
          <p className="text-sm text-slate-400">평가 이력이 없습니다.</p>
        )}
        <div className="space-y-2">
          {[...evals]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            )
            .map((ev) => {
              const agg = evalAggregate(ev);
              return (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="font-medium">{ev.evaluatorName ?? "익명"}</span>
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                        ev.provider === "claude" || ev.provider === "gemini"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {providerLabel(ev.provider)}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date(ev.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <ScoreBadge value={agg?.total} />
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}

function levelLabel(level: string): string {
  return { HIGH: "상위권", MID: "중위권", LOW: "하위권" }[level] ?? level;
}

function metaLabel(meta: string | null): string {
  if (!meta) return "";
  try {
    const m = JSON.parse(meta);
    if (typeof m.durationSec === "number" && m.segmentCount != null) {
      return m.durationSec > 0
        ? `타임스탬프 있음 · ${Math.round(m.durationSec / 60)}분 · ${m.segmentCount}구간`
        : "타임스탬프 없음 · 속도는 ‘강의 길이’ 입력 시 계산";
    }
    if (m.pages) return `${m.pages}p · ${m.charCount ?? 0}자`;
    if (m.sizeBytes) return `${(m.sizeBytes / 1e6).toFixed(1)}MB`;
  } catch {
    /* ignore */
  }
  return "";
}

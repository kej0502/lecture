"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui";
import { AREA_OPTIONS, PLATFORMS } from "@/lib/areas";
import { api } from "@/lib/client";
import { parseLectureMeta } from "@/lib/parse-filename";

const labelCls = "block text-sm font-medium text-slate-700 mb-1";
const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

const GRADES = ["고1", "고2", "고3", "n수"];

function UploadBox({
  label,
  hint,
  accept,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 hover:border-slate-400 hover:bg-slate-100">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400">{hint}</p>
        </div>
        <span
          className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
            file
              ? "bg-green-100 text-green-700"
              : "bg-slate-900 text-white"
          }`}
        >
          {file ? "✓ 선택됨" : "파일 선택"}
        </span>
      </div>
      {file && (
        <p className="mt-2 truncate text-xs text-slate-500">📄 {file.name}</p>
      )}
    </label>
  );
}

export default function NewLecturePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    area: "",
    instructor: "",
    platform: "",
    targetLevel: "MID",
    runningTimeMin: "",
    curriculumRevision: "2022",
    sourceUrl: "",
  });
  const [grades, setGrades] = useState<string[]>([]);
  const [gradeEtc, setGradeEtc] = useState(false);
  const [gradeEtcText, setGradeEtcText] = useState("");

  const [subtitle, setSubtitle] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // 파일명에서 플랫폼·영역·강사명·강의명 자동 채움(비어 있는 칸만)
  // 구조화된 규칙 "플랫폼_영역_강사명_강의명"이면 위치 기반으로 강의명까지 분리.
  function applyParse(filename: string) {
    const meta = parseLectureMeta(filename);
    const base = filename.replace(/\.[^.]+$/, "");
    setForm((f) => ({
      ...f,
      title: f.title || meta.title || base,
      area: f.area || meta.area || "",
      platform: f.platform || meta.platform || "",
      instructor: f.instructor || meta.instructor || "",
    }));
  }

  function pickSubtitle(f: File | null) {
    setSubtitle(f);
    if (f) applyParse(f.name);
  }
  function pickPdf(f: File | null) {
    setPdf(f);
    if (f) applyParse(f.name);
  }
  function pickVideo(f: File | null) {
    setVideo(f);
    if (f) applyParse(f.name);
  }

  function toggleGrade(g: string) {
    setGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  }

  async function uploadAsset(id: string, kind: string, file: File) {
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);
    const res = await fetch(`/api/lectures/${id}/assets`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      throw new Error(b.error ?? "자료 업로드 실패");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError("강의명을 입력하세요.");
      return;
    }
    if (!form.area) {
      setError("영역을 선택하세요.");
      return;
    }
    const allGrades = [...grades];
    if (gradeEtc && gradeEtcText.trim()) allGrades.push(gradeEtcText.trim());

    setBusy(true);
    try {
      const lecture = await api<{ id: string }>("/api/lectures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subject: form.area, // 영역을 과목으로 저장
          instructor: form.instructor || null,
          platform: form.platform || null,
          targetGrade: allGrades.join(","),
          targetLevel: form.targetLevel,
          runningTimeSec: form.runningTimeMin
            ? Math.round(Number(form.runningTimeMin) * 60)
            : null,
          curriculumRevision: Number(form.curriculumRevision),
          sourceUrl: form.sourceUrl || null,
        }),
      });
      if (subtitle) await uploadAsset(lecture.id, "SUBTITLE", subtitle);
      if (pdf) await uploadAsset(lecture.id, "PDF", pdf);
      if (video) await uploadAsset(lecture.id, "VIDEO", video);
      router.push(`/lectures/${lecture.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">새 강의 등록</h1>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* 1. 자료 업로드 (먼저) */}
        <Card className="space-y-3">
          <div>
            <h2 className="font-semibold">1. 자료 업로드</h2>
            <p className="text-xs text-slate-400">
              파일을 올리면 파일명에서 플랫폼·영역·강사명·강의명을 자동으로 채워줍니다.
              <br />
              예: <code>플랫폼_영역_강사명_강의명</code> (예: 메가스터디_수학_임재석_삼차방정식) — 아래에서 수정 가능
            </p>
          </div>
          <UploadBox
            label="자막 / 스크립트"
            hint=".srt · .vtt · .txt — 강의력 자동 채점의 핵심 자료"
            accept=".srt,.vtt,.txt"
            file={subtitle}
            onPick={pickSubtitle}
          />
          <UploadBox
            label="교재 PDF (선택)"
            hint=".pdf — 자료 구성·가독성 평가에 사용(없으면 해당 항목 제외)"
            accept=".pdf"
            file={pdf}
            onPick={pickPdf}
          />
          <UploadBox
            label="영상 파일 (선택)"
            hint="메타데이터만 저장 — 파일명 자동 인식용"
            accept="video/*"
            file={video}
            onPick={pickVideo}
          />
        </Card>

        {/* 2. 강의 정보 */}
        <Card className="space-y-4">
          <h2 className="font-semibold">2. 강의 정보</h2>
          <div>
            <label className={labelCls}>강의명 *</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="예: 지수함수와 로그함수 1강"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>영역 *</label>
              <select
                className={inputCls}
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
              >
                <option value="">선택</option>
                {AREA_OPTIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>강사명</label>
              <input
                className={inputCls}
                value={form.instructor}
                onChange={(e) => set("instructor", e.target.value)}
                placeholder="예: 홍길동"
              />
            </div>
            <div>
              <label className={labelCls}>플랫폼</label>
              <select
                className={inputCls}
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
              >
                <option value="">선택</option>
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>대상 학년 (중복 선택 가능)</label>
            <div className="flex flex-wrap items-center gap-2">
              {GRADES.map((g) => {
                const on = grades.includes(g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGrade(g)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      on
                        ? "border-slate-800 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setGradeEtc((v) => !v)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  gradeEtc
                    ? "border-slate-800 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                기타(직접입력)
              </button>
              {gradeEtc && (
                <input
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                  placeholder="예: 예비고1"
                  value={gradeEtcText}
                  onChange={(e) => setGradeEtcText(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>대상 등급대</label>
              <select
                className={inputCls}
                value={form.targetLevel}
                onChange={(e) => set("targetLevel", e.target.value)}
              >
                <option value="HIGH">상위권</option>
                <option value="MID">중위권</option>
                <option value="LOW">하위권</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>강의 길이(분, 선택)</label>
              <input
                className={inputCls}
                type="number"
                value={form.runningTimeMin}
                onChange={(e) => set("runningTimeMin", e.target.value)}
                placeholder="자막에 타임스탬프 없을 때 속도 계산용"
              />
            </div>
            <div>
              <label className={labelCls}>교육과정 개정연도</label>
              <select
                className={inputCls}
                value={form.curriculumRevision}
                onChange={(e) => set("curriculumRevision", e.target.value)}
              >
                <option value="2022">2022 개정</option>
                <option value="2015">2015 개정</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>강의 URL (선택)</label>
            <input
              className={inputCls}
              value={form.sourceUrl}
              onChange={(e) => set("sourceUrl", e.target.value)}
              placeholder="https://..."
            />
          </div>
        </Card>

        {error && <p className="text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "등록 중…" : "등록하고 평가 시작"}
        </button>
      </form>
    </div>
  );
}

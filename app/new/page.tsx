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
    title: "", // 강의명 (자막/영상 파일명에서 파싱)
    bookTitle: "", // 교재명 (PDF 파일명에서 파싱)
    area: "",
    instructor: "",
    platform: "",
    targetLevel: "", // 기본 미선택
    runningTimeMin: "",
    curriculumRevision: "2022",
    sourceUrl: "",
  });
  const [grades, setGrades] = useState<string[]>([]);
  const [gradeEtc, setGradeEtc] = useState(false);
  const [gradeEtcText, setGradeEtcText] = useState("");
  const [levelEtcText, setLevelEtcText] = useState(""); // 대상 등급대 기타(직접입력)

  const [subtitle, setSubtitle] = useState<File | null>(null);
  const [subtitleText, setSubtitleText] = useState(""); // 자막 텍스트 직접 입력(타임스탬프 포함 가능)
  const [pdf, setPdf] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  // 교재 PDF 텍스트 추출 상태(선택 즉시 브라우저에서 추출 → 피드백)
  const [pdfDoc, setPdfDoc] = useState<{
    text: string;
    pages: number;
    charCount: number;
    truncated?: boolean;
  } | null>(null);
  const [pdfStatus, setPdfStatus] = useState<
    "" | "extracting" | "ok" | "empty" | "error" | "garbled"
  >("");
  const [ocrStatus, setOcrStatus] = useState<"" | "running" | "error">("");
  const [ocrProg, setOcrProg] = useState({ i: 0, n: 0 });
  const [ocrPages, setOcrPages] = useState("10");

  async function runOcr() {
    if (!pdf) return;
    setOcrStatus("running");
    setOcrProg({ i: 0, n: 0 });
    try {
      const { ocrPdfClient } = await import("@/lib/extract/ocr-client");
      const doc = await ocrPdfClient(pdf, Number(ocrPages) || 10, (i, n) =>
        setOcrProg({ i, n }),
      );
      if (doc.text.trim()) {
        setPdfDoc({
          text: doc.text,
          pages: doc.pages,
          charCount: doc.charCount,
          truncated: doc.truncated,
        });
        setPdfStatus("ok");
        setOcrStatus("");
      } else {
        setOcrStatus("error");
      }
    } catch {
      setOcrStatus("error");
    }
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // 파일명에서 플랫폼·영역·강사명을 채움(이미 입력된 칸은 유지). "플랫폼_영역_강사명_이름" 규칙 인식.
  // 자막/영상 파일명 → 강의명, 교재 PDF 파일명 → 교재명으로 각각 파싱.
  function shared(meta: ReturnType<typeof parseLectureMeta>, prev: typeof form) {
    return {
      area: prev.area || meta.area || "",
      platform: prev.platform || meta.platform || "",
      instructor: prev.instructor || meta.instructor || "",
    };
  }
  function baseName(filename: string) {
    return filename.replace(/\.[^.]+$/, "");
  }

  function pickSubtitle(f: File | null) {
    setSubtitle(f);
    if (!f) return;
    const meta = parseLectureMeta(f.name);
    setForm((prev) => ({
      ...prev,
      title: meta.title || baseName(f.name), // 자막 → 강의명
      ...shared(meta, prev),
    }));
  }
  async function pickPdf(f: File | null) {
    setPdf(f);
    setPdfDoc(null);
    setPdfStatus("");
    if (!f) return;
    const meta = parseLectureMeta(f.name);
    setForm((prev) => ({
      ...prev,
      bookTitle: meta.title || baseName(f.name), // PDF → 교재명
      ...shared(meta, prev),
    }));
    // 선택 즉시 브라우저에서 텍스트 추출 시도(성공/실패를 바로 표시)
    setPdfStatus("extracting");
    try {
      const { extractPdfTextClient } = await import("@/lib/extract/pdf-client");
      const doc = await extractPdfTextClient(f);
      if (!doc.text.trim()) {
        setPdfStatus("empty");
      } else if (doc.garbled) {
        setPdfStatus("garbled"); // 깨진 텍스트 → 분석에 쓰지 않음
      } else {
        setPdfDoc(doc);
        setPdfStatus("ok");
      }
    } catch {
      setPdfStatus("error");
    }
  }
  function pickVideo(f: File | null) {
    setVideo(f);
    if (!f) return;
    const meta = parseLectureMeta(f.name);
    setForm((prev) => ({
      ...prev,
      title: prev.title || meta.title || baseName(f.name), // 영상 → 강의명(비어있을 때)
      ...shared(meta, prev),
    }));
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
      const detail = await res.text().catch(() => "");
      throw new Error(
        `${kind} 업로드 실패 (HTTP ${res.status}) ${detail.slice(0, 200)}`,
      );
    }
  }

  // 클라이언트에서 추출한 텍스트/메타만 전송 (PDF·영상 — Vercel 4.5MB 업로드 제한 우회)
  async function uploadAssetJson(
    id: string,
    kind: string,
    filename: string,
    extractedText: string | null,
    meta: Record<string, unknown>,
  ) {
    const res = await fetch(`/api/lectures/${id}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, filename, extractedText, meta }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `${kind} 업로드 실패 (HTTP ${res.status}) ${detail.slice(0, 200)}`,
      );
    }
  }

  // 교재 PDF: 브라우저 추출 시도 → 실패 시 서버 추출(≤4.5MB) → 그래도 안 되면 메타만 저장(등록은 계속)
  async function uploadPdf(id: string, file: File, name: string) {
    try {
      const { extractPdfTextClient } = await import("@/lib/extract/pdf-client");
      const doc = await extractPdfTextClient(file);
      if (doc.text.trim()) {
        await uploadAssetJson(id, "PDF", name, doc.text, {
          pages: doc.pages,
          charCount: doc.charCount,
        });
        return;
      }
    } catch {
      /* 클라이언트 추출 실패 → 폴백 */
    }
    // 폴백: 서버에서 추출(멀티파트). Vercel 4.5MB 제한 이하만 시도.
    if (file.size <= 4 * 1024 * 1024) {
      const fd = new FormData();
      fd.append("kind", "PDF");
      fd.append("file", file, name.endsWith(".pdf") ? name : `${name}.pdf`);
      const res = await fetch(`/api/lectures/${id}/assets`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) return;
    }
    // 최후: 텍스트 없이 파일 정보만 저장(등록 자체는 성공시킴)
    await uploadAssetJson(id, "PDF", name, null, {
      note: "텍스트 추출 실패(스캔 이미지 또는 대용량 PDF일 수 있음)",
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // 강의명 또는 교재명 중 하나는 필수(교재만 분석 시 교재명 필수). 강의명 없으면 교재명을 강의 제목으로 사용.
    const lectureTitle = form.title.trim() || form.bookTitle.trim();
    if (!lectureTitle) {
      setError("강의명 또는 교재명을 입력하세요.");
      return;
    }
    if (!form.area) {
      setError("영역을 선택하세요.");
      return;
    }
    const allGrades = [...grades];
    if (gradeEtc && gradeEtcText.trim()) allGrades.push(gradeEtcText.trim());

    // 대상 등급대: 미선택→null, 기타→직접입력값
    const targetLevel =
      form.targetLevel === "ETC"
        ? levelEtcText.trim() || null
        : form.targetLevel || null;

    setBusy(true);
    try {
      const lecture = await api<{ id: string }>("/api/lectures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: lectureTitle, // 강의명 없으면 교재명 사용
          subject: form.area, // 영역을 과목으로 저장
          instructor: form.instructor || null,
          platform: form.platform || null,
          targetGrade: allGrades.join(","),
          targetLevel,
          runningTimeSec: form.runningTimeMin
            ? Math.round(Number(form.runningTimeMin) * 60)
            : null,
          curriculumRevision: Number(form.curriculumRevision),
          sourceUrl: form.sourceUrl || null,
        }),
      });
      // 자막: 파일 우선, 없으면 붙여넣은 텍스트(타임스탬프 포함 가능 → 서버가 SRT/평문 자동 판별)
      if (subtitle) {
        await uploadAsset(lecture.id, "SUBTITLE", subtitle);
      } else if (subtitleText.trim()) {
        const f = new File([subtitleText], "붙여넣기.txt", { type: "text/plain" });
        await uploadAsset(lecture.id, "SUBTITLE", f);
      }
      // 교재 PDF: 추출 텍스트 우선. 깨짐/빈 텍스트면 분석에 안 쓰고 파일 정보만 저장.
      if (pdf) {
        const name = form.bookTitle.trim() || pdf.name;
        if (pdfDoc && pdfDoc.text.trim()) {
          await uploadAssetJson(lecture.id, "PDF", name, pdfDoc.text, {
            pages: pdfDoc.pages,
            charCount: pdfDoc.charCount,
          });
        } else if (pdfStatus === "garbled" || pdfStatus === "empty") {
          await uploadAssetJson(lecture.id, "PDF", name, null, {
            note:
              pdfStatus === "garbled"
                ? "글꼴 인코딩 문제로 텍스트가 깨져 분석 제외"
                : "텍스트 없음(스캔 PDF)",
          });
        } else {
          await uploadPdf(lecture.id, pdf, name); // 추출 오류 → 서버 재시도
        }
      }
      // 영상: 파일 업로드 없이 메타데이터만 저장(대용량 업로드 방지)
      if (video) {
        await uploadAssetJson(lecture.id, "VIDEO", video.name, null, {
          sizeBytes: video.size,
        });
      }
      router.push(`/lectures/${lecture.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">✏️ 새 강의 등록</h1>
      <form onSubmit={onSubmit} className="space-y-5">
        {/* 1. 자료 업로드 (먼저) */}
        <Card className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">📤 1. 자료 업로드</h2>
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
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">
              또는 자막을 텍스트로 붙여넣기
            </p>
            <textarea
              className={`${inputCls} h-32 font-mono ${
                subtitle ? "bg-slate-100 text-slate-400" : ""
              }`}
              placeholder={
                "타임스탬프가 있으면 그대로 붙여넣으세요(자동 인식).\n예)\n00:00:01,000 --> 00:00:04,000\n오늘은 삼차방정식을 배웁니다.\n\n타임스탬프 없는 평문도 가능합니다."
              }
              value={subtitleText}
              onChange={(e) => setSubtitleText(e.target.value)}
              disabled={!!subtitle}
            />
            <p className="mt-1 text-xs text-slate-400">
              자막 파일을 올리면 이 텍스트는 무시됩니다. SRT/VTT 타임스탬프(
              <code>00:00:01,000 --&gt; 00:00:04,000</code>) 형식을 자동 인식합니다.
            </p>
          </div>
          <UploadBox
            label="교재 PDF (선택)"
            hint=".pdf — 파일명은 교재명으로 자동 입력. 자막과 함께 올리면 결합해 분석"
            accept=".pdf"
            file={pdf}
            onPick={pickPdf}
          />
          {pdfStatus === "extracting" && (
            <p className="text-xs text-slate-400">교재 텍스트 추출 중…</p>
          )}
          {pdfStatus === "ok" && pdfDoc && (
            <p className="text-xs text-green-600">
              ✅ 교재 텍스트 {pdfDoc.charCount.toLocaleString()}자 추출됨 (
              {pdfDoc.pages}p)
              {pdfDoc.truncated && (
                <span className="text-amber-600">
                  {" "}
                  · 분량이 커서 앞부분만 분석에 사용합니다
                </span>
              )}
            </p>
          )}
          {pdfStatus === "empty" && (
            <p className="text-xs text-amber-600">
              ⚠️ 텍스트를 찾지 못했습니다. 스캔(이미지) PDF는 분석에 쓸 수 없어요. 텍스트가
              선택·복사되는 PDF를 올려주세요.
            </p>
          )}
          {pdfStatus === "garbled" && (
            <p className="text-xs text-amber-600">
              ⚠️ 교재 텍스트가 깨져서 추출됩니다(글꼴 인코딩 문제 — 수학 교재 등에서 흔함).
              이 PDF는 분석에 쓸 수 없어 제외됩니다. 텍스트가 정상 복사되는 PDF나 자막으로
              분석해 주세요.
            </p>
          )}
          {pdfStatus === "error" && (
            <p className="text-xs text-amber-600">
              ⚠️ 추출 실패 — 등록 시 서버에서 다시 시도합니다(대용량은 실패할 수 있음).
            </p>
          )}

          {/* OCR: 깨지거나 스캔된 PDF에서 글자 인식(브라우저에서 무료 실행) */}
          {pdf && (
            <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">
                  텍스트가 깨지거나 스캔 PDF면 OCR로 인식:
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={ocrPages}
                  onChange={(e) => setOcrPages(e.target.value)}
                  className="w-16 rounded border border-slate-300 px-2 py-1"
                />
                <span className="text-slate-400">페이지까지</span>
                <button
                  type="button"
                  onClick={runOcr}
                  disabled={ocrStatus === "running"}
                  className="rounded-md bg-slate-900 px-3 py-1 text-white disabled:opacity-50"
                >
                  {ocrStatus === "running"
                    ? `OCR 인식 중 ${ocrProg.i}/${ocrProg.n}…`
                    : "OCR로 텍스트 인식"}
                </button>
              </div>
              {ocrStatus === "error" && (
                <p className="text-xs text-amber-600">
                  OCR 인식에 실패했습니다. 페이지 수를 줄여 다시 시도해 보세요.
                </p>
              )}
              <p className="text-xs text-slate-400">
                브라우저에서 페이지를 이미지로 변환해 글자를 인식합니다. 페이지가 많으면
                수십 초~수 분 걸릴 수 있어요. (한국어+영문)
              </p>
            </div>
          )}
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
          <h2 className="text-lg font-semibold">📝 2. 강의 정보</h2>
          <div>
            <label className={labelCls}>강의명</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="예: 지수함수와 로그함수 1강 (자막/영상 파일명에서 자동)"
            />
          </div>
          <div>
            <label className={labelCls}>교재명</label>
            <input
              className={inputCls}
              value={form.bookTitle}
              onChange={(e) => set("bookTitle", e.target.value)}
              placeholder="예: 수학Ⅰ 개념원리 (교재 PDF 파일명에서 자동)"
            />
            <p className="mt-1 text-xs text-slate-400">
              강의명·교재명 중 <b>최소 하나</b>는 필요합니다. (교재만 분석할 땐 교재명만
              있어도 됩니다)
            </p>
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
                <option value="">선택</option>
                <option value="HIGH">상위권</option>
                <option value="MID">중위권</option>
                <option value="LOW">하위권</option>
                <option value="ETC">기타(직접입력)</option>
              </select>
              {form.targetLevel === "ETC" && (
                <input
                  className={`${inputCls} mt-2`}
                  placeholder="예: 최상위권 / 의대반"
                  value={levelEtcText}
                  onChange={(e) => setLevelEtcText(e.target.value)}
                />
              )}
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

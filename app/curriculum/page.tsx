"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { api } from "@/lib/client";

interface Group {
  subject: string;
  revisionYear: number;
  count: number;
}
interface Standard {
  id: string;
  subject: string;
  revisionYear: number;
  unit: string | null;
  code: string;
  statement: string;
  keywords: string[];
}
interface CurriculumResp {
  groups: Group[];
  standards: Standard[];
}

export default function CurriculumPage() {
  const [data, setData] = useState<CurriculumResp>({ groups: [], standards: [] });
  const [selected, setSelected] = useState<string | null>(null); // "subject__year"
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 업로드 폼 (교육과정 PDF만 — 과목·개정연도 자동 인식)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const d = await api<CurriculumResp>("/api/curriculum");
    setData(d);
  }, []);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  async function uploadPdf() {
    setError(null);
    setMsg(null);
    if (!pdfFile) {
      setError("PDF 파일을 선택하세요.");
      return;
    }
    setBusy(true);
    try {
      // 브라우저에서 PDF 텍스트 추출 후 텍스트만 전송 (큰 파일 업로드 제한 우회)
      const { extractPdfTextClient } = await import("@/lib/extract/pdf-client");
      const doc = await extractPdfTextClient(pdfFile);
      if (!doc.text.trim()) {
        throw new Error(
          "PDF에서 텍스트를 추출하지 못했습니다. (스캔 이미지 PDF는 지원하지 않습니다)",
        );
      }
      const res = await fetch("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfText: doc.text, filename: pdfFile.name }),
      });
      const b = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(b.error ?? "PDF 업로드 실패");
      setMsg(
        `'${b.subject}' (${b.revisionYear} 개정)로 인식해 ${b.count}개 성취기준을 저장했습니다. 키워드는 자동 생성되니 필요하면 표에서 확인·수정하세요.`,
      );
      setPdfFile(null);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteGroup(g: Group) {
    if (!confirm(`${g.subject} (${g.revisionYear} 개정) ${g.count}개를 삭제할까요?`)) return;
    await api(
      `/api/curriculum?subject=${encodeURIComponent(g.subject)}&revisionYear=${g.revisionYear}`,
      { method: "DELETE" },
    );
    setSelected(null);
    await reload();
  }

  async function deleteStandard(s: Standard) {
    await api(`/api/curriculum/${s.id}`, { method: "DELETE" });
    await reload();
  }

  const shown = selected
    ? data.standards.filter((s) => `${s.subject}__${s.revisionYear}` === selected)
    : [];

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">교육과정 관리</h1>
      <p className="text-sm text-slate-500">
        과목·개정연도별 성취기준을 등록하면 강의의 교육과정 부합도가 자동 채점됩니다. 한 번
        올리면 영구 보관·재사용되고, 같은 과목·개정연도를 다시 올리면 교체됩니다.
      </p>

      {/* 등록된 그룹 */}
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">등록된 과목 · 개정</h2>
        {data.groups.length === 0 && (
          <p className="text-sm text-slate-400">등록된 성취기준이 없습니다.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {data.groups.map((g) => {
            const key = `${g.subject}__${g.revisionYear}`;
            return (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                  selected === key
                    ? "border-slate-500 bg-slate-100"
                    : "border-slate-200 bg-white"
                }`}
              >
                <button onClick={() => setSelected(selected === key ? null : key)}>
                  {g.subject}{" "}
                  <span className="text-xs text-slate-400">
                    {g.revisionYear} · {g.count}개
                  </span>
                </button>
                <button
                  onClick={() => deleteGroup(g)}
                  className="text-xs text-slate-400 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {selected && (
          <div className="mt-3 max-h-80 overflow-auto rounded-lg border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-2 py-1">코드</th>
                  <th className="px-2 py-1">단원</th>
                  <th className="px-2 py-1">성취기준</th>
                  <th className="px-2 py-1">키워드</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-2 py-1 whitespace-nowrap font-mono">{s.code}</td>
                    <td className="px-2 py-1">{s.unit}</td>
                    <td className="px-2 py-1">{s.statement}</td>
                    <td className="px-2 py-1 text-slate-400">{s.keywords.join(", ")}</td>
                    <td className="px-2 py-1">
                      <button
                        onClick={() => deleteStandard(s)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 업로드 — 교육과정 PDF (과목·개정연도 자동 인식) */}
      <Card className="space-y-3">
        <h2 className="text-xl font-semibold">교육과정 PDF 업로드</h2>
        <p className="text-xs text-slate-400">
          PDF 안의 <code>[12수학Ⅰ-01-02] …</code> 형식 코드에서 <b>과목명·개정연도를 자동
          인식</b>하고 성취기준·키워드를 등록합니다. 별도 선택은 필요 없습니다.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            onClick={uploadPdf}
            disabled={busy || !pdfFile}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {busy ? "분석 중…" : "PDF에서 추출"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
      </Card>
    </div>
  );
}

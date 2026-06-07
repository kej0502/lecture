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

const inputCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

export default function CurriculumPage() {
  const [data, setData] = useState<CurriculumResp>({ groups: [], standards: [] });
  const [selected, setSelected] = useState<string | null>(null); // "subject__year"
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // 업로드 폼
  const [subject, setSubject] = useState("");
  const [revisionYear, setRevisionYear] = useState("2022");
  const [csv, setCsv] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const d = await api<CurriculumResp>("/api/curriculum");
    setData(d);
  }, []);

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, [reload]);

  async function upload() {
    setError(null);
    setMsg(null);
    if (!subject.trim() || !csv.trim()) {
      setError("과목과 CSV 내용을 입력하세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ count: number }>("/api/curriculum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          revisionYear: Number(revisionYear),
          csv,
        }),
      });
      setMsg(`${res.count}개 성취기준을 저장했습니다.`);
      setCsv("");
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadPdf() {
    setError(null);
    setMsg(null);
    if (!pdfFile) {
      setError("PDF 파일을 선택하세요.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", pdfFile); // 과목·개정연도는 PDF에서 자동 인식
      const res = await fetch("/api/curriculum", { method: "POST", body: fd });
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
      <h1 className="text-2xl font-bold">교육과정 관리</h1>
      <p className="text-sm text-slate-500">
        과목·개정연도별 성취기준을 등록하면 강의의 교육과정 부합도가 자동 채점됩니다. 한 번
        올리면 영구 보관·재사용되고, 같은 과목·개정연도를 다시 올리면 교체됩니다.
      </p>

      {/* 등록된 그룹 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">등록된 과목 · 개정</h2>
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

      {/* 업로드 */}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">성취기준 업로드</h2>
        <div className="flex flex-wrap gap-3">
          <input
            className={inputCls}
            placeholder="과목명 (예: 수학Ⅱ)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <select
            className={inputCls}
            value={revisionYear}
            onChange={(e) => setRevisionYear(e.target.value)}
          >
            <option value="2022">2022 개정</option>
            <option value="2015">2015 개정</option>
          </select>
        </div>

        {/* PDF 업로드 (과목·개정 자동 인식) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-sm font-medium">
            방법 1) 교육과정 PDF 업로드 (과목·개정연도 자동 인식)
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
              disabled={busy}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? "분석 중…" : "PDF에서 추출"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            PDF 안의 <code>[12수학Ⅰ-01-02] …</code> 형식 코드에서 과목명·개정연도를 자동
            인식하고 성취기준·키워드를 등록합니다. (위 과목/개정 입력란은 아래 CSV 방식에만 사용)
          </p>
        </div>

        <p className="text-sm font-medium">방법 2) CSV 직접 입력 (과목·개정 선택)</p>
        <textarea
          className={`${inputCls} h-40 w-full font-mono`}
          placeholder={"단원,코드,성취기준,키워드(; 구분)\n극한,12수학Ⅱ-01-01,함수의 극한을 이해한다.,극한;수렴;발산"}
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
        />
        <p className="text-xs text-slate-400">
          형식: <code>단원,코드,성취기준,키워드</code> (한 줄에 하나, 키워드는 ; 로 구분).
          헤더 줄은 자동으로 건너뜁니다.
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {msg && <p className="text-sm text-green-600">{msg}</p>}
        <button
          onClick={upload}
          disabled={busy}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "저장 중…" : "업로드"}
        </button>
      </Card>
    </div>
  );
}

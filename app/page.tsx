"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ScoreBadge } from "@/components/ui";
import { AREAS } from "@/lib/areas";
import { api } from "@/lib/client";
import type { Aggregate } from "@/lib/report";
import { providerLabel } from "@/lib/report-view";

interface LectureListItem {
  id: string;
  title: string;
  subject: string;
  instructor: string | null;
  platform: string | null;
  targetGrade: string | null;
  createdAt: string;
  evaluationCount: number;
  evaluatorName: string | null;
  evaluatedAt: string | null;
  aiProvider: string | null;
  ai: Aggregate | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [lectures, setLectures] = useState<LectureListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructor, setInstructor] = useState("");
  const [area, setArea] = useState("");
  const [touched, setTouched] = useState(false); // 한 번이라도 DB를 조회했는지

  function load(filters?: { instructor?: string; area?: string }) {
    const params = new URLSearchParams();
    const ins = filters?.instructor ?? instructor;
    const ar = filters?.area ?? area;
    if (ins.trim()) params.set("instructor", ins.trim());
    if (ar.trim()) params.set("area", ar.trim());
    const qs = params.toString();
    setLoading(true);
    setError(null);
    setTouched(true);
    api<LectureListItem[]>(`/api/lectures${qs ? `?${qs}` : ""}`)
      .then(setLectures)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  // 검색어가 있을 때만 DB 조회. 비어 있으면 목록을 비워두고 호출하지 않음.
  useEffect(() => {
    if (!instructor.trim() && !area.trim()) {
      setLectures([]);
      setTouched(false);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instructor, area]);

  async function deleteLecture(e: React.MouseEvent, l: LectureListItem) {
    e.stopPropagation();
    if (!confirm(`'${l.title}' 강의와 모든 평가를 삭제할까요?`)) return;
    await api(`/api/lectures/${l.id}`, { method: "DELETE" });
    setLectures((prev) => prev.filter((x) => x.id !== l.id));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          📊 강의 평가 대시보드
        </h1>
        <div className="flex gap-2">
          {lectures.length > 0 && (
            <a
              href="/api/export?format=csv"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
            >
              전체 CSV 내보내기
            </a>
          )}
          <Link
            href="/new"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + 새 평가
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
          placeholder="강사명으로 검색"
          className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        >
          <option value="">전체 영역</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        {(instructor || area) && (
          <button
            onClick={() => {
              setInstructor("");
              setArea("");
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            초기화
          </button>
        )}
        <button
          onClick={() => load({ instructor: "", area: "" })}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          전체 보기
        </button>
      </div>

      {loading && lectures.length === 0 && (
        <p className="text-slate-500">불러오는 중…</p>
      )}
      {loading && lectures.length > 0 && (
        <p className="text-xs text-slate-400">갱신 중…</p>
      )}
      {error && <p className="text-red-600">{error}</p>}

      {/* 기본 화면: 조회 전 — 목록을 바로 부르지 않고 안내만 표시 */}
      {!loading && !touched && lectures.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          강사명·영역으로 <b>검색</b>하면 결과를 보여줍니다.
          <br />
          전체 강의를 보려면{" "}
          <button
            onClick={() => load({ instructor: "", area: "" })}
            className="font-medium text-slate-900 underline"
          >
            전체 보기
          </button>
          를 누르세요.
        </div>
      )}

      {/* 조회했지만 결과 없음 */}
      {!loading && touched && lectures.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-slate-500">
          {instructor || area ? (
            "검색 결과가 없습니다."
          ) : (
            <>
              아직 평가한 강의가 없습니다.{" "}
              <Link href="/new" className="text-slate-900 underline">
                첫 강의를 등록
              </Link>
              해 보세요.
            </>
          )}
        </div>
      )}

      {lectures.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">플랫폼</th>
                <th className="px-4 py-3 font-medium">영역</th>
                <th className="px-4 py-3 font-medium">강사명</th>
                <th className="px-4 py-3 font-medium">강의명</th>
                <th className="px-4 py-3 font-medium">평가자</th>
                <th className="px-4 py-3 font-medium">분석 방식</th>
                <th className="px-4 py-3 font-medium">날짜</th>
                <th className="px-4 py-3 text-right font-medium">총점</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {lectures.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => router.push(`/lectures/${l.id}`)}
                  className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">{l.platform ?? "-"}</td>
                  <td className="px-4 py-3">{l.subject}</td>
                  <td className="px-4 py-3">{l.instructor ?? "-"}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{l.title}</td>
                  <td className="px-4 py-3">{l.evaluatorName ?? "-"}</td>
                  <td className="px-4 py-3">
                    {l.ai ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          l.aiProvider === "claude" || l.aiProvider === "gemini"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {providerLabel(l.aiProvider)}
                      </span>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {l.evaluatedAt
                      ? new Date(l.evaluatedAt).toLocaleDateString("ko-KR")
                      : new Date(l.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ScoreBadge value={l.ai?.total} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => deleteLecture(e, l)}
                      className="text-slate-300 hover:text-red-600"
                      title="삭제"
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
    </div>
  );
}

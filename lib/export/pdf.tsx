// PDF 리포트 생성 (@react-pdf/renderer). 강사 전달용 — 깔끔한 표지·요약·항목 리포트.
import { join } from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  type EvalLite,
  dimensionRows,
  evalAggregate,
  latestOf,
  providerLabel,
} from "@/lib/report-view";
import { CATEGORY_EMOJI, CATEGORY_LABEL, toBand } from "@/lib/rubric";

Font.register({
  family: "Nanum",
  src: join(process.cwd(), "public", "fonts", "NanumGothic-Regular.ttf"),
});
Font.registerHyphenationCallback((w) => [w]); // 한글 줄바꿈 깨짐 방지

const INK = "#111827";
const SUB = "#6b7280";
const FAINT = "#9ca3af";
const LINE = "#e5e7eb";
const PANEL = "#f9fafb";
const ACCENT = "#4f46e5";

function gradeColor(v: number): string {
  if (v >= 90) return "#16a34a";
  if (v >= 75) return "#65a30d";
  if (v >= 60) return "#ca8a04";
  if (v >= 40) return "#ea580c";
  return "#dc2626";
}

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 44,
    fontFamily: "Nanum",
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.5,
  },
  // 헤더
  kicker: { fontSize: 8, color: ACCENT, letterSpacing: 2, marginBottom: 6 },
  title: { fontSize: 21, color: INK, marginBottom: 6 },
  metaLine: { fontSize: 9.5, color: SUB },
  rule: { height: 2, backgroundColor: ACCENT, marginTop: 12, marginBottom: 16 },
  subMetaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  subMeta: { fontSize: 8.5, color: SUB },

  // 요약 카드
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  stat: {
    flexGrow: 1,
    flexBasis: 0,
    border: `1pt solid ${LINE}`,
    borderRadius: 6,
    padding: 12,
  },
  statTotal: { borderColor: ACCENT, backgroundColor: "#f5f5ff" },
  statLabel: { fontSize: 8, color: SUB, letterSpacing: 1, marginBottom: 6 },
  statValue: { fontSize: 22, color: INK },
  statUnit: { fontSize: 10, color: SUB },
  statSub: { fontSize: 8, color: FAINT, marginTop: 3 },

  // 종합 의견
  summaryBox: {
    backgroundColor: PANEL,
    borderRadius: 6,
    borderLeft: `3pt solid ${ACCENT}`,
    padding: 12,
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 8, color: ACCENT, letterSpacing: 1, marginBottom: 4 },
  summaryText: { fontSize: 9.5, color: "#374151" },

  // 카테고리
  catHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: `1pt solid ${INK}`,
    paddingBottom: 5,
    marginTop: 8,
    marginBottom: 10,
  },
  catTitle: { fontSize: 13, color: INK },
  catAvg: { fontSize: 9, color: SUB },

  // 항목
  item: { marginBottom: 14 },
  itemHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemLabel: { fontSize: 11, color: INK },
  itemScore: { fontSize: 12 },
  barTrack: {
    height: 5,
    backgroundColor: "#edf0f4",
    borderRadius: 3,
    marginBottom: 5,
  },
  barFill: { height: 5, borderRadius: 3 },
  explain: { fontSize: 8, color: FAINT, marginBottom: 4 },
  block: { marginTop: 3, flexDirection: "row" },
  blockTag: { fontSize: 8, color: SUB, width: 52 },
  blockText: { fontSize: 8.5, color: "#374151", flexGrow: 1, flexBasis: 0 },
  evi: { flexDirection: "row", marginTop: 2, paddingLeft: 52 },
  eviTime: {
    fontSize: 7.5,
    color: "#4338ca",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 4,
  },
  eviText: { fontSize: 8, color: SUB, flexGrow: 1, flexBasis: 0 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5pt solid ${LINE}`,
    paddingTop: 6,
  },
  footText: { fontSize: 7.5, color: FAINT },
});

export interface LectureForPdf {
  title: string;
  subject: string;
  instructor?: string | null;
  platform?: string | null;
  targetGrade?: string | null;
  evaluations: EvalLite[];
}

function fmtDate(d: string | Date | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function lectureToPdf(l: LectureForPdf): Promise<Buffer> {
  const ev = latestOf(l.evaluations, "AI");
  const rows = dimensionRows(ev, true);
  const agg = evalAggregate(ev);
  const band = agg != null ? toBand(agg.total) : null;
  const metaParts = [l.platform, l.subject, l.instructor, l.targetGrade].filter(
    Boolean,
  );

  const doc = (
    <Document
      title={`${l.title} 평가 리포트`}
      author="고등 온라인 강의 평가"
    >
      <Page size="A4" style={s.page}>
        {/* ── 표지 헤더 ── */}
        <Text style={s.kicker}>강의 평가 리포트</Text>
        <Text style={s.title}>{l.title}</Text>
        <Text style={s.metaLine}>{metaParts.join("  ·  ")}</Text>
        <View style={s.rule} />
        <View style={s.subMetaRow}>
          <Text style={s.subMeta}>평가자  {ev?.evaluatorName ?? "-"}</Text>
          <Text style={s.subMeta}>분석 방식  {providerLabel(ev?.provider)}</Text>
          <Text style={s.subMeta}>평가일  {fmtDate(ev?.createdAt)}</Text>
        </View>

        {/* ── 요약 ── */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statLabel}>강의력</Text>
            <Text style={s.statValue}>
              {agg?.teaching != null ? agg.teaching : "-"}
              <Text style={s.statUnit}> 점</Text>
            </Text>
          </View>
          <View style={s.stat}>
            <Text style={s.statLabel}>콘텐츠</Text>
            <Text style={s.statValue}>
              {agg?.content != null ? agg.content : "-"}
              <Text style={s.statUnit}> 점</Text>
            </Text>
          </View>
          <View style={[s.stat, s.statTotal]}>
            <Text style={[s.statLabel, { color: ACCENT }]}>종합 총점</Text>
            <Text style={s.statValue}>
              {agg ? agg.total : "-"}
              <Text style={s.statUnit}> 점</Text>
            </Text>
            {band && (
              <Text style={[s.statSub, { color: gradeColor(agg?.total ?? 0) }]}>
                {band.grade} 등급 · {band.label}
              </Text>
            )}
          </View>
        </View>

        {ev?.summary ? (
          <View style={s.summaryBox}>
            <Text style={s.summaryLabel}>종합 의견</Text>
            <Text style={s.summaryText}>{ev.summary}</Text>
          </View>
        ) : null}

        {/* ── 항목별 ── */}
        {(["TEACHING", "CONTENT"] as const).map((cat) => {
          const catRows = rows.filter((r) => r.def.category === cat);
          if (catRows.length === 0) return null;
          const catAvg = cat === "TEACHING" ? agg?.teaching : agg?.content;
          return (
            <View key={cat} wrap={false}>
              <View style={s.catHead}>
                <Text style={s.catTitle}>
                  {CATEGORY_EMOJI[cat]} {CATEGORY_LABEL[cat]}
                </Text>
                <Text style={s.catAvg}>평균 {catAvg ?? "-"}점</Text>
              </View>
              {catRows.map((r) => {
                const v = r.value ?? 0;
                return (
                  <View style={s.item} key={r.def.dimension} wrap={false}>
                    <View style={s.itemHead}>
                      <Text style={s.itemLabel}>{r.def.label}</Text>
                      <Text style={[s.itemScore, { color: gradeColor(v) }]}>
                        {r.value ?? "-"}점
                      </Text>
                    </View>
                    <View style={s.barTrack}>
                      <View
                        style={[
                          s.barFill,
                          { width: `${v}%`, backgroundColor: gradeColor(v) },
                        ]}
                      />
                    </View>
                    <Text style={s.explain}>{r.explain}</Text>
                    {r.qualitative ? (
                      <View style={s.block}>
                        <Text style={s.blockTag}>정성 평가</Text>
                        <Text style={s.blockText}>{r.qualitative}</Text>
                      </View>
                    ) : null}
                    {r.comment ? (
                      <View style={s.block}>
                        <Text style={s.blockTag}>측정 지표</Text>
                        <Text style={s.blockText}>{r.comment}</Text>
                      </View>
                    ) : null}
                    {r.evidence.length > 0 ? (
                      <View style={s.block}>
                        <Text style={s.blockTag}>판단 근거</Text>
                        <View style={{ flexGrow: 1, flexBasis: 0 }}>
                          {r.evidence.map((e, i) => (
                            <View style={{ flexDirection: "row", marginBottom: 1 }} key={i}>
                              {e.time ? (
                                <Text style={s.eviTime}>{e.time}</Text>
                              ) : null}
                              <Text style={s.eviText}>
                                “{e.text}” — {e.reason}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          );
        })}

        {/* ── 푸터(모든 페이지) ── */}
        <View style={s.footer} fixed>
          <Text style={s.footText}>고등 온라인 강의 평가 리포트</Text>
          <Text
            style={s.footText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
          <Text style={s.footText}>
            생성 {new Date().toLocaleDateString("ko-KR")}
          </Text>
        </View>
      </Page>
    </Document>
  );

  return (await renderToBuffer(doc)) as Buffer;
}

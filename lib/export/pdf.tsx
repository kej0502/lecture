// PDF 리포트 생성 (@react-pdf/renderer). AI 자동 평가 기준. 한글은 NanumGothic 등록.
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
} from "@/lib/report-view";
import { CATEGORY_LABEL, toBand } from "@/lib/rubric";

Font.register({
  family: "Nanum",
  src: join(process.cwd(), "public", "fonts", "NanumGothic-Regular.ttf"),
});

const styles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Nanum", fontSize: 10, color: "#1a1a1a" },
  title: { fontSize: 18, marginBottom: 4 },
  meta: { fontSize: 10, color: "#555", marginBottom: 2 },
  totalsRow: { flexDirection: "row", gap: 12, marginTop: 8, marginBottom: 8 },
  totalBox: { border: "1pt solid #ddd", borderRadius: 4, padding: 8, flexGrow: 1 },
  totalLabel: { fontSize: 9, color: "#666" },
  totalValue: { fontSize: 16 },
  catTitle: { fontSize: 13, marginTop: 14, marginBottom: 4 },
  item: { borderBottom: "0.5pt solid #eee", paddingVertical: 5 },
  itemHead: { flexDirection: "row", justifyContent: "space-between" },
  itemLabel: { fontSize: 11 },
  explain: { fontSize: 8, color: "#888", marginTop: 1 },
  comment: { fontSize: 9, color: "#444", marginTop: 2 },
  evidence: { fontSize: 8, color: "#666", marginTop: 1, paddingLeft: 6 },
  footer: { marginTop: 18, fontSize: 8, color: "#999" },
});

export interface LectureForPdf {
  title: string;
  subject: string;
  instructor?: string | null;
  platform?: string | null;
  targetGrade?: string | null;
  evaluations: EvalLite[];
}

function fmt(d: string | Date | undefined) {
  return d ? new Date(d).toLocaleString("ko-KR") : "-";
}

export async function lectureToPdf(l: LectureForPdf): Promise<Buffer> {
  const ev = latestOf(l.evaluations, "AI");
  const rows = dimensionRows(ev, true);
  const agg = evalAggregate(ev);
  const band = agg != null ? toBand(agg.total) : null;

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{l.title}</Text>
        <Text style={styles.meta}>
          {l.platform ? `${l.platform} · ` : ""}
          {l.subject}
          {l.instructor ? ` · ${l.instructor}` : ""}
          {l.targetGrade ? ` · ${l.targetGrade}` : ""}
        </Text>
        <Text style={styles.meta}>
          평가자: {ev?.evaluatorName ?? "-"} · 평가일: {fmt(ev?.createdAt)}
        </Text>

        <View style={styles.totalsRow}>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>강의력</Text>
            <Text style={styles.totalValue}>{agg ? `${agg.teaching}점` : "-"}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>콘텐츠</Text>
            <Text style={styles.totalValue}>{agg ? `${agg.content}점` : "-"}</Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>총점 / 등급</Text>
            <Text style={styles.totalValue}>
              {agg ? `${agg.total} (${band?.grade})` : "-"}
            </Text>
          </View>
        </View>

        {(["TEACHING", "CONTENT"] as const).map((cat) => (
          <View key={cat}>
            <Text style={styles.catTitle}>{CATEGORY_LABEL[cat]}</Text>
            {rows
              .filter((r) => r.def.category === cat)
              .map((r) => (
                <View style={styles.item} key={r.def.dimension}>
                  <View style={styles.itemHead}>
                    <Text style={styles.itemLabel}>{r.def.label}</Text>
                    <Text style={styles.itemLabel}>{r.value ?? "-"}점</Text>
                  </View>
                  <Text style={styles.explain}>{r.explain}</Text>
                  {r.qualitative ? (
                    <Text style={styles.comment}>정성: {r.qualitative}</Text>
                  ) : null}
                  {r.comment ? (
                    <Text style={styles.comment}>측정: {r.comment}</Text>
                  ) : null}
                  {r.evidence.map((e, i) => (
                    <Text style={styles.evidence} key={i}>
                      • {e.time ? `[${e.time}] ` : ""}
                      {e.text} — {e.reason}
                    </Text>
                  ))}
                </View>
              ))}
          </View>
        ))}

        {ev?.summary ? <Text style={styles.comment}>{ev.summary}</Text> : null}
        <Text style={styles.footer}>
          고등 온라인 강의 평가 툴 · 생성 {new Date().toLocaleString("ko-KR")}
        </Text>
      </Page>
    </Document>
  );

  return (await renderToBuffer(doc)) as Buffer;
}

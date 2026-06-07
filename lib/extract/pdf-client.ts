// 브라우저(클라이언트)에서 PDF → 텍스트 추출.
// Vercel 서버리스는 요청 본문 4.5MB 제한이 있어 큰 PDF 업로드가 413으로 거부된다.
// → 파일을 올리지 않고 브라우저에서 텍스트만 추출해 서버로 전송한다.
import type { PdfDoc } from "./types";

export async function extractPdfTextClient(file: File): Promise<PdfDoc> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const merged = (text ?? "").trim();
  return { text: merged, pages: totalPages ?? 0, charCount: merged.length };
}

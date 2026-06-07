// PDF → 텍스트 추출. 서버리스(Node)에서 안정적인 unpdf 사용.
// (pdf-parse는 브라우저 API DOMMatrix에 의존해 Vercel 서버리스에서 로드만으로 크래시했음)
import { extractText, getDocumentProxy } from "unpdf";
import { type PdfDoc, PDF_TEXT_MAX } from "./types";

export async function parsePdf(buffer: Buffer): Promise<PdfDoc> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  const full = (text ?? "").trim();
  const truncated = full.length > PDF_TEXT_MAX;
  const merged = truncated ? full.slice(0, PDF_TEXT_MAX) : full;
  return {
    text: merged,
    pages: totalPages ?? 0,
    charCount: merged.length,
    truncated,
  };
}

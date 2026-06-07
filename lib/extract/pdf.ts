// PDF → 텍스트 추출 (pdf-parse v2의 PDFParse 사용).
import { PDFParse } from "pdf-parse";
import type { PdfDoc } from "./types";

export async function parsePdf(buffer: Buffer): Promise<PdfDoc> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const text = (result.text ?? "").trim();
    return { text, pages: result.total ?? 0, charCount: text.length };
  } finally {
    await parser.destroy();
  }
}

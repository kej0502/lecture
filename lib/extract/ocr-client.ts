// 브라우저 OCR: PDF 페이지를 이미지로 렌더 → Tesseract(한국어+영문)로 글자 인식.
// 글꼴 인코딩이 깨지거나 스캔(이미지) PDF에서 텍스트를 얻기 위함. 페이지 수 제한 필수(느림).
import { type PdfDoc, PDF_TEXT_MAX, stripControlChars } from "./types";

export async function ocrPdfClient(
  file: File,
  maxPages: number,
  onProgress?: (page: number, total: number) => void,
): Promise<PdfDoc & { ocrPages: number }> {
  const { getDocumentProxy, renderPageAsImage } = await import("unpdf");
  const { createWorker } = await import("tesseract.js");

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data);
  const total: number = pdf.numPages ?? 0;
  const n = Math.max(1, Math.min(total || maxPages, maxPages));

  const worker = await createWorker("kor+eng");
  let out = "";
  try {
    for (let i = 1; i <= n; i++) {
      onProgress?.(i, n);
      const buf = await renderPageAsImage(pdf, i, { scale: 2 });
      const blob = new Blob([buf], { type: "image/png" });
      const {
        data: { text },
      } = await worker.recognize(blob);
      out += `${text}\n`;
      if (out.length > PDF_TEXT_MAX) break;
    }
  } finally {
    await worker.terminate();
  }

  const truncated = out.length > PDF_TEXT_MAX;
  const clean = stripControlChars(out).slice(0, PDF_TEXT_MAX).trim();
  return {
    text: clean,
    pages: total,
    charCount: clean.length,
    truncated,
    ocrPages: n,
  };
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "고등 온라인 강의 평가 툴",
  description: "AI 자동 분석 + 사람 루브릭 채점으로 고등 온라인 강의를 평가합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-bold text-lg">
              📚 강의 평가
            </Link>
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900">
              대시보드
            </Link>
            <Link href="/new" className="text-sm text-slate-600 hover:text-slate-900">
              새 평가
            </Link>
            <Link
              href="/curriculum"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              교육과정 관리
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}

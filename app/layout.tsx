import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "고등 온라인 강의 평가 툴",
  description: "AI 자동 분석 + 사람 루브릭 채점으로 고등 온라인 강의를 평가합니다.",
};

const navCls =
  "text-xs uppercase tracking-wider text-slate-400 transition-colors hover:text-slate-900";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f7f5f0]/85 backdrop-blur-md">
          <nav className="mx-auto flex max-w-5xl items-center gap-7 px-4 py-4">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              강의 평가<span className="text-slate-400">.eval</span>
            </Link>
            <Link href="/" className={navCls}>
              대시보드
            </Link>
            <Link href="/new" className={navCls}>
              새 평가
            </Link>
            <Link href="/rubric" className={navCls}>
              평가기준
            </Link>
            <Link href="/curriculum" className={navCls}>
              교육과정
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
          {children}
        </main>
        <footer className="border-t border-black/10 px-4 py-6">
          <p className="mx-auto max-w-5xl text-xs text-slate-500">
            고등 온라인 강의 평가 · AI + 루브릭
          </p>
        </footer>
      </body>
    </html>
  );
}

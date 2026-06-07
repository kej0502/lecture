import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 네이티브/서버 전용 패키지는 번들링하지 않고 런타임에서 require.
  serverExternalPackages: [
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "pdf-parse",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;

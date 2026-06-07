import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 네이티브/서버 전용 패키지는 번들링하지 않고 런타임에서 require.
  serverExternalPackages: [
    "pg",
    "@prisma/adapter-pg",
    "unpdf",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;

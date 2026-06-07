// Prisma 클라이언트 싱글톤. Prisma 7 드라이버 어댑터(node-postgres) 사용.
// Supabase(Postgres) 연결 — DATABASE_URL은 Supabase 커넥션 문자열.
// DB 접근은 모두 이 모듈 → 다른 Postgres 호스팅으로 전환 시 어댑터만 교체.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

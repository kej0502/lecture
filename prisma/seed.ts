// 교육과정 성취기준 시드: data/curriculum.seed.json → CurriculumStandard (upsert).
// 실행: npm run db:seed  (tsx prisma/seed.ts)
import "dotenv/config"; // tsx는 .env를 자동 로드하지 않으므로 명시적으로 로드
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

interface SeedStandard {
  unit?: string;
  code: string;
  statement: string;
  keywords: string[];
}
interface SeedFile {
  revisionYear: number;
  subjects: { subject: string; standards: SeedStandard[] }[];
}

async function main() {
  const file = join(process.cwd(), "data", "curriculum.seed.json");
  const data = JSON.parse(readFileSync(file, "utf-8")) as SeedFile;

  let count = 0;
  for (const subj of data.subjects) {
    for (const s of subj.standards) {
      await prisma.curriculumStandard.upsert({
        where: {
          subject_revisionYear_code: {
            subject: subj.subject,
            revisionYear: data.revisionYear,
            code: s.code,
          },
        },
        update: {
          unit: s.unit ?? null,
          statement: s.statement,
          keywords: JSON.stringify(s.keywords),
        },
        create: {
          subject: subj.subject,
          revisionYear: data.revisionYear,
          unit: s.unit ?? null,
          code: s.code,
          statement: s.statement,
          keywords: JSON.stringify(s.keywords),
        },
      });
      count++;
    }
  }
  console.log(`Seeded ${count} curriculum standards.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

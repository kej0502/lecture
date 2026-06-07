-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "instructor" TEXT,
    "platform" TEXT,
    "grade" TEXT,
    "targetGrade" TEXT,
    "targetLevel" TEXT,
    "runningTimeSec" INTEGER,
    "curriculumRevision" INTEGER,
    "sourceType" TEXT NOT NULL DEFAULT 'FILE',
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "extractedText" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluation" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "evaluatorName" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Score" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "dimension" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "comment" TEXT,
    "qualitative" TEXT,
    "explain" TEXT,
    "evidence" TEXT,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumStandard" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "revisionYear" INTEGER NOT NULL,
    "unit" TEXT,
    "code" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumStandard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_lectureId_idx" ON "Asset"("lectureId");

-- CreateIndex
CREATE INDEX "Evaluation_lectureId_idx" ON "Evaluation"("lectureId");

-- CreateIndex
CREATE INDEX "Score_evaluationId_idx" ON "Score"("evaluationId");

-- CreateIndex
CREATE INDEX "CurriculumStandard_subject_revisionYear_idx" ON "CurriculumStandard"("subject", "revisionYear");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumStandard_subject_revisionYear_code_key" ON "CurriculumStandard"("subject", "revisionYear", "code");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evaluation" ADD CONSTRAINT "Evaluation_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "Evaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

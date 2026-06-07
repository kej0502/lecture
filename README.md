# 고등 온라인 강의 평가 툴

AI 자동 분석 + 사람 루브릭 채점을 한 화면에서 비교하는 웹 도구.
강의 자막/교재를 입력하면 **객관 지표 기반**으로 강의력·콘텐츠를 채점하고, 사람 평가와 나란히 비교·내보내기(CSV/PDF)합니다.

## 평가 루브릭

| 대분류 | 항목 | 자동 채점 |
|---|---|---|
| **강의력** | 설명·전달력 / 참여·흥미 유발 / 구성·속도·분량 | ✅ 자막 지표 |
| | 표현·전달 태도 | 사람(추후 vision) |
| **콘텐츠** | 교육과정 부합도 | ✅ 성취기준 매칭 |
| | 내용 정확성 / 난이도 / 자료 가독성 | 사람 / 교재 PDF 일부 |

채점 기준값(속도 280~340 음절/분 등)은 `lib/rubric.ts`에서 조정합니다.

## 실행

```bash
npm install
npx prisma migrate dev      # DB 생성 (최초 1회)
npm run db:seed             # 교육과정 시드(수학Ⅰ·영어) 주입
npm run dev                 # http://localhost:3000
```

> Node.js 20+ 필요. SQLite(`dev.db`) 로컬 DB 사용.

## 주요 화면

- `/` 대시보드 — 강의 목록 + AI/사람 총점, 전체 CSV 내보내기
- `/new` 강의 등록 — 메타 입력 + 자막/교재/영상 업로드
- `/lectures/[id]` 상세 — AI 분석 실행 · 사람 루브릭 · 통합 리포트 · 평가 이력 · CSV/PDF 다운로드
- `/curriculum` 교육과정 관리 — 성취기준 업로드/삭제(과목·개정연도별)

## 확장 포인트(설계 훅 마련됨)

- **실제 AI 분석**: `lib/analyzer/claude.ts` — `AI_PROVIDER=claude` + `ANTHROPIC_API_KEY`로 전환 (모델 `claude-opus-4-8`)
- **영상 자막 자동 추출**: `lib/transcribe`(미구현) — URL은 yt-dlp, 파일은 ffmpeg+Whisper
- **판서 구조 분석**: analyzer `frames` 입력 — Claude vision 키프레임 채점
- **공유 서버 배포**: `DATABASE_URL`을 Postgres로 교체 (Prisma 어댑터 분리됨)

## 구조

```
app/                 화면 + API 라우트
lib/rubric.ts        루브릭·채점 기준값
lib/extract/         자막(srt/vtt)·PDF 텍스트 추출
lib/metrics/         객관 지표 계산(강의력/콘텐츠)
lib/analyzer/        분석기 추상화(mock + claude 스텁)
lib/export/          CSV·PDF 생성
prisma/              스키마·시드
data/curriculum.seed.json  교육과정 시드
```

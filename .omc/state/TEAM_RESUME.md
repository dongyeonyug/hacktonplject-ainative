# 세션 연속성 문서 (RESUME) — /clear 후 여기서 이어가기

> 다음 대화에서 이 파일 + `CLAUDE.md`(자동 로드됨) + `PROJECT_STATUS.md`를 읽으면 흐름이 그대로 이어집니다.
> 최종 업데이트: 2026-07-05.

## 지금 상태 한 줄
마음곁 MVP **구현·검증·로컬 실행 완료**, 대화→데이터추출→추천 루프 작동(라이브 검증됨). Vercel 배포 안내까지 마침. **협업 문서 3종 방금 작성 완료.**

## 이번까지 완료된 것 (핵심 로그)
- 딥인터뷰(18%) → 합의 계획 → 팀 빌드(T1~T8) → 검증 + 치명 보안결함(AC-13) 수정 → 실제 대화 동작.
- **UI/기능 추가**: 공용 네비 `components/AppNav.tsx`(대화/추천/기록 + 관리자만 통계 + 로그아웃), `/journal` 페이지.
- **로그아웃**: 기존 `signOutAction` 연결.
- **백그라운드 추출 완성**: `lib/extract/run-extraction.ts` + `app/api/chat/route.ts`에서 `next/server` `after()`로 호출(Vercel 서버리스 안전). 라이브로 추출 동작 확인.
- **Google 로그인 제거**: 공급자 미설정이라 로그인/회원가입 UI에서 버튼 삭제(백엔드 액션은 잔존).
- **GitHub**: `dongyeonyug/ainativehackton` main에 push 완료(최신 커밋 `d6b38a2` 이후 상태). 비밀키 미커밋 확인됨.
- **협업 문서 신규**: `CLAUDE.md`, `CONTRIBUTING.md`, `docs/ARCHITECTURE.md` 작성 완료.

## ⏭️ 다음에 할 일 (우선순위)
1. **협업 문서 커밋+푸시** — 방금 만든 `CLAUDE.md`/`CONTRIBUTING.md`/`docs/ARCHITECTURE.md`는 아직 커밋 안 됨. push 필요(사용자 승인 후).
2. **Vercel 배포** — 사용자가 대시보드에서: 저장소 import + 환경변수 5개(`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY/ANTHROPIC_API_KEY/ADMIN_EMAILS`) 입력 + Deploy → Supabase Site URL에 Vercel 도메인 등록. (코드는 준비됨)
3. **팀 온보딩** — 팀원에게 CLAUDE.md/CONTRIBUTING.md 안내, 공용 Supabase 접근 공유, GitHub 협업자 추가, main 브랜치 보호 설정.
4. (선택) 독립 보안 재감사, 라이브 통합테스트(pgTAP/Playwright), 이메일 인증·Google 로그인 정식화.

## 검증 상태
`npm run typecheck` ✅ · `npm test` 75/75 ✅ · `npm run build` ✅ (최근 코드 기준).

## 산출물 지도
- 협업: `CLAUDE.md`(AI 자동로드 규칙) · `CONTRIBUTING.md`(git/PR 규칙) · `docs/ARCHITECTURE.md`(구조 상세)
- 현황/배포: `PROJECT_STATUS.md` · 발표: `PPT_발표자료.md`
- 설계: `.omc/plans/plan-jobseeker-mental-care.md` · 스펙: `.omc/specs/deep-interview-jobseeker-mental-care.md`
- DB: `supabase/SETUP_ALL.sql`, `supabase/migrations/0001~0003`

## 불변식(수정 시 리뷰 필수) — 상세는 CLAUDE.md
위기 fail-safe(핫라인 109/1577-0199) · ai_processing 국외이전 동의 게이트 · 동의 append-only 원장 · 실명 DB 트리거 · RLS/관리자 집계전용 · 성인전용 · 추출은 after()(부동 프로미스 금지).

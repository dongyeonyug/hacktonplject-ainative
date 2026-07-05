# CLAUDE.md — 마음곁 프로젝트 (팀 협업 가이드)

> 이 파일은 **Claude Code가 매 세션 자동으로 읽는** 프로젝트 규칙서입니다. 팀원 누구의 Claude Code든 여기 규칙을 따라 움직입니다.
> 사람용 상세 문서: [CONTRIBUTING.md](CONTRIBUTING.md)(협업 규칙) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)(구조) · [PROJECT_STATUS.md](PROJECT_STATUS.md)(현황).

## 프로젝트 한 줄 요약
취준생의 만성 불안·고립감을 24시간 **AI 동반자(챗봇)**로 돌보고, 대화에서 **어려움 데이터**를 백그라운드로 추출·축적해 **맞춤 공개기관/정책 정보를 추천**하는 웹/PWA. (2차: 실제 기관 연결·취업 기능)

## 기술 스택
- **프론트/백:** Next.js 16 (App Router, TypeScript), Tailwind CSS v4, PWA
- **데이터/인증:** Supabase (Postgres + Auth + RLS + Edge Functions)
- **AI:** Anthropic Claude — `claude-opus-4-8`(대화), `claude-haiku-4-5`(위기 분류·데이터 추출)
- **테스트:** Vitest(유닛) · Playwright(E2E) · pgTAP(DB)
- **배포:** Vercel (서버리스)

## 명령어
```bash
npm run dev         # 개발 서버 http://localhost:3000
npm run build       # 프로덕션 빌드
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm test            # Vitest 유닛 테스트 (반드시 통과 유지)
npm run test:e2e    # Playwright (라이브 Supabase+키 필요)
```
**작업 완료 전 필수:** `npm run typecheck` + `npm test` + `npm run build` 모두 통과.

## 디렉터리 지도 (핵심만)
```
app/(auth)/        회원가입·로그인·로그아웃 서버 액션 + 페이지
app/onboarding/    연령 게이트(≥19) + ai_processing(국외이전) 동의
app/consent/       동의 원장 UI (grant/revoke)
app/chat/          대화 페이지 + app/api/chat/route.ts (AI 스트리밍 + 위기감지 + 추출 트리거)
app/journal/       내 대화·루틴 기록
app/recommendations/  룰 기반 기관 추천
app/admin/metrics/ 집계 전용 관리자 통계 (ADMIN_EMAILS만)
components/AppNav.tsx  공용 상단 네비 (관리자 링크 조건부 + 로그아웃)
lib/supabase/      client(브라우저) / server(RLS) / admin(service_role, 서버전용)
lib/ai/            anthropic(클라이언트) / companion(대화 프롬프트·스트림)
lib/safety/        crisis-core(순수 판정) / crisis(haiku 분류) / hotlines
lib/extract/       taxonomy / parse(순수) / run-extraction(앱내 추출 실행기)
lib/match/curate.ts   추천 룰 (순수)
lib/metrics/       quality(품질점수 순수) / admin-auth(allowlist)
lib/consent.ts, lib/profile.ts
proxy.ts           Next 16 미들웨어(=middleware). /chat 동의 게이트 + 세션 갱신
supabase/migrations/  0001(스키마+RLS+트리거) 0002(추출트리거) 0003(기관시드)
supabase/functions/extract-difficulty/  Edge Function(서버리스 배포용, 선택)
```

## 🔒 절대 훼손 금지 — 안전·컴플라이언스 불변식 (변경 시 반드시 PR 리뷰)
이 프로젝트는 **정신건강 민감정보**를 다룹니다. 아래는 설계 합의에서 정한 비협상 규칙이며, 관련 코드를 건드릴 땐 반드시 사람 리뷰를 받으세요.
1. **위기 감지 fail-safe** (`lib/safety/*`, `app/api/chat/route.ts`): 사용자 메시지를 응답 **전** 입력측에서 검사. 분류기가 실패/타임아웃해도 **핫라인(109 / 1577-0199)을 보여주는 쪽으로 안전 실패** — 절대 정상 응답으로 fail-open 금지.
2. **국외이전 동의 게이트** (AC-13, `proxy.ts` + `app/api/chat/route.ts`): `ai_processing` 동의 없이는 `/chat`·`/api/chat` 도달·전송 불가. 대화 내용은 Claude(미국)로 전송되므로 대화 전 고지·동의가 법적 필수.
3. **동의 원장** (`consent_events`, `lib/consent.ts`): append-only. 철회는 revoke 행 추가, 삭제/수정 금지. 계정삭제 시 대부분 cascade 삭제하되 `consent_events`·`crisis_events`는 **익명화**(법적 보존).
4. **실명 보호** (`guard_realname` 트리거, 0001): `institution_sharing` 동의 없이는 `profiles.real_name` 쓰기 DB 레벨 차단.
5. **RLS** (0001): 모든 사용자 데이터는 `user_id = auth.uid()`(messages는 conversations 조인). `admin`/`extraction_status`는 service_role 전용. 관리자 대시보드는 **집계 전용**(개인 식별 금지).
6. **성인 전용**: 온보딩 연령 게이트(≥19).

## 코딩 컨벤션
- TypeScript strict. 순수 로직(파서·룰·점수·위기판정)은 **I/O와 분리**해 `lib/**`에 두고 **유닛 테스트**(이미 75개). 새 순수 로직도 테스트 추가.
- 서버 전용 모듈은 `import "server-only"` 유지. `lib/supabase/admin.ts`(service_role)는 **절대 클라이언트 import 금지**.
- Tailwind 유틸리티, 모바일 퍼스트(`sm:` 브레이크포인트). 다크모드 클래스 유지.
- 서버 컴포넌트 기본, 상호작용만 `"use client"`.
- 비밀키는 `.env.local`(git 무시)에만. 코드/문서에 실제 키 절대 커밋 금지.

## 협업 워크플로우 (요약 — 상세는 CONTRIBUTING.md)
- `main` 직접 push 금지. `feat/…`·`fix/…`·`docs/…` 브랜치 → PR → **1인 이상 리뷰** 후 merge.
- 커밋: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- PR 전 로컬에서 typecheck+test+build 통과 필수. 위 불변식 관련 변경은 리뷰 강조.

## 환경 변수 (`.env.local`, `.env.local.example` 참고)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(서버전용), `ANTHROPIC_API_KEY`(서버전용), `ADMIN_EMAILS`(관리자 allowlist).

## 신규 개발자 셋업
1. `npm install`
2. `.env.local.example` → `.env.local` 복사 후 값 채우기(팀 리더에게 요청)
3. Supabase 프로젝트에 `supabase/SETUP_ALL.sql` 적용(또는 migrations 0001→0002→0003)
4. `npm run dev`

## Gotchas (자주 걸리는 것)
- **Vercel 서버리스**: 백그라운드 추출은 `next/server`의 `after()`로 스케줄됨(`app/api/chat/route.ts`). fire-and-forget 부동 프로미스로 되돌리지 말 것 — 서버리스에서 유실됨.
- **이메일 인증**: 현재 Supabase에서 꺼둠(테스트 편의). 켜면 `app/auth/callback`의 PKCE 처리 보강 필요.
- **Google 로그인**: 공급자 미설정이라 UI에서 제거함. `signInWithOAuthAction`은 남아 있으니 Supabase에 Google 켜면 버튼만 복구하면 됨.
- **추출 정식(서버리스 대안)**: `supabase/functions/extract-difficulty` Edge Function 배포 경로도 있음(멱등 동일). 앱내 `after()` 방식과 병행해도 idempotent라 안전.

## 참고 문서
- 요구사항 스펙: `.omc/specs/deep-interview-jobseeker-mental-care.md`
- 설계/의사결정(ADR): `.omc/plans/plan-jobseeker-mental-care.md`
- 현황·배포: `PROJECT_STATUS.md` · 발표자료: `PPT_발표자료.md`

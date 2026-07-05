# Team 실행 재개 문서 (TEAM RESUME) — 빌드 완료

> 상태: **MVP 구현 + verify + critical fix 완료.** 남은 것은 (선택) 독립 보안 재감사, 라이브 환경 검증, 커밋.
> 마지막 업데이트: 2026-07-04.

## 한 줄 요약
취준생 멘탈케어 AI 동반자 MVP를 team으로 빌드 완료. T1~T8 전부 + team-verify(보안 감사) + team-fix(critical 2건) 완료. **tsc 0 / 유닛 75-75 / build(11 라우트) 통과.** 아직 커밋 안 함.

## 구현 완료 (T1~T8) — 모두 통과
- T1 Next.js16/PWA 스캐폴드, T2 DB(12테이블+RLS+realname 트리거+동의 원장), T3 auth+연령게이트+ai_processing 동의+proxy 게이트, T4 챗+입력측 위기분류+핫라인+fail-safe, T5 비동기 추출 스파인(Edge Fn), T6 큐레이션+/recommendations, T7 집계 관리자 지표, T8 Vitest 75/75+pgTAP+Playwright+PWA.
- 상세: `README.md`, 계획 `.omc/plans/plan-jobseeker-mental-care.md`.

## team-verify 결과 (2026-07-04)
독립 security-reviewer(opus)는 세션 한도로 중단됨. 리드가 직접 핵심 감사 수행:
- **CRITICAL 발견·수정됨 (AC-13)**: `/api/chat`(Claude/US 데이터 유출 지점)이 `ai_processing` 동의를 강제하지 않았음(proxy는 `/chat` 페이지만 게이트, `/api/chat` 제외). → **FIX-1**: 라우트 상단에 미인증 401 / 미동의 403 게이트 추가(핫라인 포함). `app/api/chat/route.ts`.
- **AC-3 갭 수정됨**: `/journal` 라우트 부재(page.tsx dead link). → **FIX-2**: `app/journal/page.tsx` 신규(본인 대화/루틴 시간순, RLS 보호).
- 오탐 정정: `proxy.ts`는 Next 16의 유효한 미들웨어 관례(빌드에 `ƒ Proxy (Middleware)` 확인). `/chat` 페이지 게이트는 정상.
- 코드/마이그레이션 정적 확인 OK: 테이블별 RLS, `guard_realname` SECURITY DEFINER 트리거, 관리자 집계 전용+allowlist, `admin.ts` server-only, 위기 fail-safe(유닛 테스트 포함).

## ▶ 남은 일 (다음 세션, 선택/권장)
1. **독립 보안 재감사(권장)**: 세션 한도로 security-reviewer 완주 못 함. 여유 시 재실행해 RLS/pg_net 웹훅 인증/injection을 독립 검증.
2. **라이브 환경 검증**: Supabase 프로비저닝 후 pgTAP(`supabase/tests/`)·Playwright E2E(`e2e/`) 실제 실행, AC-2 지연 부하테스트(미자동화).
3. **커밋**: 사용자 승인 시 커밋(현재 워킹트리에만 존재, git init됨).
4. (미자동화 갭) AD-1 추출 재시도/멱등 자동테스트, AC-2 부하테스트 — README "Not yet automated" 참조.

## 외부 준비(사용자 필요 — 워커 불가)
Supabase 프로젝트 + `.env.local`(URL/anon/service_role/ANTHROPIC_API_KEY/ADMIN_EMAILS), 마이그레이션 0001→0002→0003 적용, Edge Function 배포+`extraction_config` 입력. 상세 `README.md`.

## 불변 제약(수정 시 훼손 금지)
위기 입력측+fail-safe(핫라인 109/1577-0199), ai_processing 국외이전 동의 선행 관문(이제 /chat+/api/chat 양쪽 강제), 동의 append-only 원장(consent/crisis는 삭제 대신 익명화), 실명화 DB 트리거 차단, 관리자 집계 전용.

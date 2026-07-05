# Work Plan (DRAFT): 취준생 멘탈케어 AI 동반자 MVP

Source spec: `.omc/specs/deep-interview-jobseeker-mental-care.md` (ambiguity 18%, PASSED)
Mode: consensus / deliberate (compliance/PII)

## Requirements Summary
취준생의 만성 불안·고립감을 24시간 AI 동반자(챗봇)로 상시 동반하고, 대화에서 구조화된 어려움 데이터를 자연스럽게 추출·축적하며, 그 데이터를 근거로 공개 기관/정책 정보를 큐레이션 추천한다. MVP는 반응형 웹/PWA, 가명 계정(동의 시 실명화). North-star = 어려움 데이터 품질/양. 실제 기관 제휴·라이브 연결·취업기회 기능은 2차로 defer.

## RALPLAN-DR Summary

### Principles (5)
1. **Help-first, data-as-byproduct** — 사용자에게 실제 도움이 우선이고 데이터는 그 자연스러운 부산물이다. 설문·강제 입력 금지.
2. **Privacy by default** — 가명 우선, 최소 수집, 명시적 동의 게이트 없이는 실명화·기관 이관 없음.
3. **Staged trust** — AI 신뢰 형성 → 데이터 축적 → 동의 → 기관 연결. 단계를 건너뛰지 않는다.
4. **Ship the funnel, measure the fuel** — MVP는 큐레이션 매칭까지만. 성공은 데이터 품질/양으로 측정.
5. **Safety-critical UX** — 정신건강 맥락. 자살/위기 신호 감지 시 에스컬레이션 경로 필수(비협상).

### Decision Drivers (top 3)
1. 민감(정신건강) 개인정보 보호·동의·컴플라이언스
2. AI 대화 품질과 구조화 데이터 추출 정확도
3. MVP 개발 속도(반응형 웹/PWA 단일 코드) 대비 확장성

### Viable Options

**Option A — Next.js 풀스택 (App Router + Route Handlers + Supabase)**
- Pros: 단일 코드베이스, 빠른 MVP, Supabase Auth/RLS로 가명계정·민감정보 보호 즉시 확보, PWA 쉬움
- Cons: 무거운 AI/데이터 추출 파이프라인이 Node 런타임에 묶임, 배치/비동기 처리 확장 시 제약

**Option B — Next.js 프론트 + FastAPI(파이썬) AI 백엔드 분리**
- Pros: AI/NLP·데이터 추출·스코어링을 파이썬 생태계에서 처리, 관심사 분리, 확장 용이
- Cons: 2개 서비스 운영·배포 복잡도 증가, MVP 속도 저하, 인증/세션 경계 관리 부담

**Option C — Next.js 프론트 + Supabase + Edge Function(경량 AI 오케스트레이션)**
- Pros: A의 속도 + AI 호출을 Edge/서버리스로 분리, 확장 시 B로 발전 가능한 중간 경로
- Cons: Edge 런타임 제약(장시간 작업 어려움), 복잡한 데이터 추출은 별도 워커 필요

**추천: Option A → C 진화 경로.** MVP는 A(속도·보안 즉시 확보), AI 데이터 추출 부하가 커지면 C의 서버리스 분리, 2차 확장 시 B로 이관.

## Acceptance Criteria (spec에서 상속 + 정제)
- [ ] AC-1: 가명 계정(이메일/소셜) 가입·로그인, 실명 미요구. Supabase Auth 기준 이메일 검증 통과, `profiles.real_name IS NULL` 기본.
- [ ] AC-2: 인증 사용자는 `/chat`에서 AI와 대화, 응답 지연 p95 < 4s(스트리밍 첫 토큰 < 1.5s).
- [ ] AC-3: 대화/루틴 활동이 저장되고 `/journal`에서 시간순 조회 가능.
- [ ] AC-4: AI 응답은 공감·지지 시스템 프롬프트 전략을 따르며, 위기 신호 감지 시 위기 대응 리소스(핫라인)를 표시.
- [ ] AC-5: 반응형 웹/PWA — Lighthouse PWA 설치 가능, 모바일(≤375px)·데스크톱 레이아웃 정상.
- [ ] AC-6: 대화에서 어려움이 `difficulty_data`(category, intensity 1-5, context) 구조로 추출·저장.
- [ ] AC-7: 데이터 품질/양 지표(사용자별 추출 레코드 수, 카테고리 커버리지, 완성도 점수)를 관리자 대시보드에서 조회.
- [ ] AC-8: 민감정보 암호화 저장(at-rest) + RLS로 사용자 본인만 접근, 동의 상태(`consents`) 명확 관리.
- [ ] AC-9: 축적 데이터 기반 공개 기관/정책 정보 큐레이션 추천을 `/recommendations`에 표시.
- [ ] AC-10: 추천 수용(열람/저장) 이벤트가 `recommendation_events`에 기록.
- [ ] AC-11: 기관 연결(실명화)은 `consents.institution_sharing = true` 동의 게이트 통과 시에만 활성(MVP는 동의 흐름 UI+상태까지, 실제 이관 없음).
- [ ] AC-12 (safety): 위기 키워드 감지 로직 + 에스컬레이션 UI가 존재하고 테스트로 검증됨.

## Implementation Steps

### Phase 0 — 기반 (Foundation)
1. 저장소 초기화: Next.js(App Router, TS), Tailwind, PWA(manifest + service worker). `package.json`, `next.config.js`, `app/`, `public/manifest.json`.
2. Supabase 프로젝트 연결: `.env.local`(URL/anon key), `lib/supabase/{client,server}.ts`.
3. DB 스키마 마이그레이션 (`supabase/migrations/0001_init.sql`):
   - `profiles`(id, pseudonym, real_name NULL, created_at)
   - `conversations`, `messages`
   - `difficulty_data`(id, user_id, category, intensity, context, source_message_id, created_at)
   - `routines`, `emotional_states`
   - `consents`(user_id, scope, granted_at, institution_sharing bool)
   - `institutions`(공개정보 시드), `curated_matches`, `recommendation_events`
   - **RLS 정책**: 모든 사용자 데이터 테이블에 `user_id = auth.uid()` 강제.

### Phase 1 — 인증 & 가명 계정 (AC-1, AC-8)
4. Supabase Auth 이메일/소셜 로그인, 가명 온보딩(닉네임만). `app/(auth)/`, `app/onboarding/`.
5. RLS + at-rest 암호화 확인, 동의(`consents`) 초기 레코드 생성.

### Phase 2 — AI 동반자 (AC-2, AC-4, AC-12)
6. 채팅 UI 스트리밍(`app/chat/`, `components/Chat*`).
7. AI 오케스트레이션 서버 라우트(`app/api/chat/route.ts`): 최신 Claude 모델(claude-opus-4-8) 사용, 공감·지지 시스템 프롬프트.
8. **위기 신호 감지**: 입력/응답 스캔 → 위기 시 핫라인 리소스 카드 + 로깅(`lib/safety/crisis.ts`). 비협상 안전 요구.

### Phase 3 — 어려움 데이터 추출 (AC-6, AC-7)
9. 대화 후처리 추출기(`lib/extract/difficulty.ts`): 메시지 → 구조화(category taxonomy, intensity, context). Claude tool-use/structured output.
10. 데이터 품질 점수 계산 + 관리자 대시보드(`app/admin/metrics/`).

### Phase 4 — 큐레이션 매칭 (AC-9, AC-10, AC-11)
11. 공개 기관/정책 정보 시드 + 큐레이션 로직(`lib/match/curate.ts`): 축적 데이터 → 규칙/휴리스틱 추천(MVP는 룰 기반).
12. `/recommendations` UI + 수용 이벤트 로깅.
13. 기관 연결 동의 게이트 UI(`app/consent/`) — 상태 전환까지, 실제 이관 없음.

### Phase 5 — PWA & 마감 (AC-5)
14. PWA 설치/오프라인 셸, 반응형 QA, Lighthouse.
15. E2E 스모크 + 시드 데이터.

## Risks and Mitigations
| Risk | Mitigation |
|------|-----------|
| 민감정보 유출/부적절 접근 | RLS 강제 + at-rest 암호화 + 최소수집 + 동의 게이트. 보안 리뷰 필수. |
| 위기 상황(자살 위험) 미대응 | AC-12 위기 감지 + 핫라인 에스컬레이션을 릴리스 차단 기준으로. |
| AI가 부적절/해로운 조언 | 시스템 프롬프트 가드레일 + 면책 + "전문 상담 아님" 고지. |
| 데이터 추출 품질 저하 → North-star 실패 | 추출 정확도 평가셋 + 품질 점수 모니터링. |
| 가명↔실명 승격 흐름의 동의 누락 | 동의 없이는 실명 필드/이관 코드 경로가 실행 불가하도록 DB 제약+테스트. |

## Verification Steps
1. `npm run build && npm run typecheck` 통과.
2. RLS 테스트: 타 사용자 데이터 접근 차단 자동 테스트.
3. 위기 감지 유닛 테스트(키워드/문맥 케이스).
4. E2E: 가입→대화→데이터추출→추천 표시 스모크.
5. 동의 게이트: 미동의 시 실명화 경로 차단 검증.

## Pre-mortem (deliberate) — 3 실패 시나리오
1. **"설문처럼 느껴진다"** → 데이터 추출이 대화를 방해(추가 질문 폭탄). 방지: 추출은 100% 백그라운드 후처리, 사용자에게 폼 강요 금지(Principle 1).
2. **컴플라이언스 사고** → 민감정보를 동의 없이 기관/제3자에 노출. 방지: institution_sharing 경로를 동의 없으면 코드·DB 레벨에서 실행 불가; 보안 리뷰 게이트.
3. **위기 대응 실패** → 자살 위험 사용자를 놓쳐 실제 피해. 방지: AC-12를 릴리스 차단 기준, QA 시나리오 필수, 핫라인 상시 노출.

## Expanded Test Plan (deliberate)
- **Unit**: 위기 키워드 감지, 어려움 추출 파서, 품질 점수, 동의 상태 머신, 큐레이션 룰.
- **Integration**: Supabase RLS(본인만 접근), Auth 흐름, 추출→저장 파이프라인.
- **E2E**: 온보딩→채팅(스트리밍)→추천, 동의 게이트 차단, PWA 설치.
- **Observability**: 데이터 품질/양 지표 대시보드, 위기 감지 이벤트 로깅/알림, 응답 지연 메트릭.

## ADR (초안 — Critic 승인 후 확정)
- **Decision**: MVP는 Next.js 풀스택(App Router) + Supabase(Auth/RLS/Postgres), AI는 서버 라우트에서 최신 Claude 모델, 큐레이션은 룰 기반. (Option A, C로 진화)
- **Drivers**: PII 보호, AI 대화·추출 품질, MVP 속도.
- **Alternatives considered**: B(FastAPI 분리 — MVP 과잉), 순수 서버리스(C 단독 — 장시간 작업 제약).
- **Why chosen**: 보안(RLS) + 속도 + 단일 코드 PWA, 확장 경로 보존.
- **Consequences**: AI 부하 커지면 C/B로 분리 필요, 파이썬 NLP 생태계는 나중.
- **Follow-ups**: 2차 기관 파트너십, 실명 이관 파이프라인, 취업기회 컴포넌트, 추천 알고리즘 고도화.

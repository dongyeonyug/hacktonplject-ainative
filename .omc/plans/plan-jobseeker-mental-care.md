# Work Plan: 취준생 멘탈케어 AI 동반자 MVP (Consensus v2)

Source spec: `.omc/specs/deep-interview-jobseeker-mental-care.md` (ambiguity 18%, PASSED)
Mode: consensus / deliberate (compliance/PII). Revision 2 — incorporates Architect(6) + Critic(10) required changes.
Status: **pending approval**

## Requirements Summary
취준생의 만성 불안·고립감을 24시간 AI 동반자(챗봇)로 상시 동반하고, 대화에서 구조화된 어려움 데이터를 백그라운드로 추출·축적하며, 그 데이터를 근거로 공개 기관/정책 정보를 큐레이션 추천한다. MVP는 반응형 웹/PWA, 가명 계정(동의 시 실명화). North-star = 어려움 데이터 품질/양. 실제 기관 제휴·라이브 연결·취업기회 기능은 2차로 defer. **MVP는 성인(만 19세 이상) 전용.**

## RALPLAN-DR Summary

### Principles (5)
1. **Help-first, data-as-byproduct** — 실제 도움이 우선, 데이터는 자연스러운 부산물. 추출은 100% 백그라운드(폼 강요 금지).
2. **Privacy by default** — 가명 우선, 최소 수집, 명시적 동의 게이트 없이는 실명화·기관 이관·국외이전 없음.
3. **Staged trust** — 필수 `ai_processing` 동의(국외이전, 대화 시작 전 법적 관문)가 선행한 뒤, AI 신뢰 → 데이터 축적 → `institution_sharing` 동의 → 기관 연결의 단계적 신뢰를 DB 레벨(AD-4)로 강제.
4. **Ship the funnel, measure the fuel** — MVP는 큐레이션 매칭까지. 성공은 데이터 품질/양으로 측정(측정 정의 필수).
5. **Safety-critical UX (비협상)** — 위기 신호 입력측 동기 감지 + 한국 핫라인 에스컬레이션. 릴리스 차단 기준.

### Decision Drivers (top 3)
1. 민감(정신건강) 개인정보 보호·동의·국외이전 컴플라이언스(PIPA)
2. AI 대화 품질 + 백그라운드 구조화 데이터 추출의 신뢰성(North-star)
3. MVP 개발 속도(반응형 웹/PWA) 대비 확장성

### Viable Options (재평가 — 결정축: MVP에서 백그라운드 추출을 어떻게 실행하는가)

**Option A(원안) — Next.js 풀스택, 추출은 phase C로 defer**
- Pros: 최속 데모, 단일 코드
- Cons: **서버리스에 신뢰성 있는 백그라운드 실행 없음 → Principle 1/AC-2와 충돌(불가능한 삼각형). 제품 핵심(추출)을 가장 늦게 설계. A→C→B는 반복 재배선.** ❌ 무효화됨.

**Option B — Next.js + FastAPI 분리**
- Pros: NLP/추출 자연스러운 생태계, 깨끗한 경계
- Cons: 2서비스 운영·이중 인증 경계, MVP 속도 저하

**Option C(채택) — "A shell + C spine, day one": Next.js + Supabase + 얇은 비동기 스파인을 MVP에 선반영**
- 채택 이유: A의 속도·보안(RLS)을 유지하되, 추출을 안정 계약 뒤의 잡(job)으로 Day 1부터 분리 → Principle 1·AC-2 동시 충족, 미래 B 이관은 워커 교체로 축소.
- Cons: 큐/Edge Function 한 조각 추가 운영(수용).

**Invalidation rationale:** A는 제품 핵심의 런타임이 MVP에 부재하여 무효. B는 MVP 단계 과잉(이중 서비스). → C 채택.

## Architecture Decisions (반영된 필수 변경)

### AD-1 비동기 추출 스파인 (Architect#1 / Critic#1)
- 트리거: Supabase Database Webhook 또는 `pgmq`+`pg_cron` on `messages` INSERT → Edge Function 워커.
- 계약: in=`source_message_id`, out=`difficulty_data` rows + `extraction_status`.
- 테이블 `extraction_status(message_id, state[queued|running|done|failed], attempts, error, updated_at)`, **멱등키=source_message_id**, 재시도/백오프, dead-letter.
- 응답 스트림을 절대 블록하지 않음(Principle 1).

### AD-2 위기 감지 (Architect#2 / Critic#2, 비협상)
- **입력측 동기 분류기**: 사용자 메시지를 생성 전에 빠른 모델(claude-haiku-4-5)로 위기 분류 + 키워드 fallback.
- 양성 시: 시스템 프롬프트를 위기 지원 모드로 override + 즉시 핫라인 카드 표시(스트림과 독립).
- **지연 처리(RC-3)**: 분류기(haiku)와 본 생성을 **동시 실행하되 분류기 결과가 올 때까지 스트림을 버퍼링/홀드** — 순차 직렬화가 아닌 concurrent+gate로 AC-2(첫 토큰<1.5s) 예산 안에서 안전을 우선.
- **출력측 보조망(RC-4, 2차 follow-up)**: 입력측이 놓친/생성 중 출현하는 위기 신호를 위한 경량 출력측 스캔은 post-MVP로 ADR follow-up에 기록.
- **분류기 실패 모드(fail-safe)**: haiku 분류기가 에러/타임아웃이면 **핫라인 카드 표시 + 키워드 fallback으로 degrade — 절대 정상 응답으로 fail-open 하지 않음**(안전 우선).
- **명시 한국 리소스: 자살예방상담 109, 정신건강위기상담 1577-0199.**
- `crisis_events(user_id, message_id, severity, detected_at)` 로깅 + 보존정책.
- **MVP 범위 명시: 인간 위기 대응자 없음 — 핫라인이 에스컬레이션의 종착.** 알림 수신자 = 운영 로그/모니터링(집계), 개별 사용자 실시간 인간개입 없음(사용자에게 오해 없게 UX 고지).

### AD-3 동의 원장 (Architect#3 / Critic#3·#7, 법적)
- `consent_events(user_id, scope, action[grant|revoke], policy_version, occurred_at, source)` **append-only 원장** + 현재상태 파생 뷰 `current_consents`.
- **분리된 동의 scope 3종**: `ai_processing`(국외이전·제3자 Claude/US 처리), `data_storage`, `institution_sharing`.
- 국외이전 고지: 온보딩에서 Anthropic(미국) 하위처리자 및 대화 내용 국외이전 명시 고지 + 동의(PIPA 민감정보+국외이전 별도 요건).
- 보존/삭제(RC-2): 계정삭제 시 `messages, conversations, difficulty_data, emotional_states, routines, recommendation_events`는 **하드 삭제**. 단 `consent_events`·`crisis_events`는 법적 보존 의무(동의 증빙·주의의무 위기로그)와 잊힐 권리의 충돌을 해소하기 위해 **하드 삭제 대신 익명화**(user_id/가명키 null화)로 처리. 정책을 명시 문서화.

### AD-4 실명/공유 쓰기 가드 (Architect#4 / Critic#4)
- `profiles.real_name` 및 공유 경로에 **BEFORE INSERT/UPDATE SECURITY DEFINER 트리거**: `current_consents`에 활성 `institution_sharing` grant 없으면 예외. (CHECK 불가 — 교차참조 필요)
- 음성 테스트: 미동의 상태 실명 쓰기 거부 검증.

### AD-5 RLS 테이블별 명세 (Architect#5 / Critic#5)
- `profiles, conversations, difficulty_data, emotional_states, routines, consent_events, crisis_events, recommendation_events`(RC-1): `user_id = auth.uid()`.
- `messages`: user_id 없음 → `EXISTS(SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())`.
- `extraction_status`(RC-1): RLS enable + **사용자 정책 없음 → service-role 전용**(사용자 직접 접근 불가, 기본 거부 명시).
- `institutions`(공개 시드): public read, no user scope.
- **관리자 대시보드: 집계 전용(개별 드릴다운 없음)**. service-role 뒤 admin-authz 체크(별도 admin 역할 클레임), `auth.uid()` RLS 아님. 가능하면 비식별 집계 뷰로 노출.
- 추출 워커: service_role로 RLS 우회(민감데이터 접근 경로 명시·감사).

### AD-6 암호화 명확화 (Architect#6 / Critic#6)
- **디스크/볼륨 레벨 at-rest 암호화(Supabase 관리형)** 채택 — 쿼리 가능성 유지(North-star 분석 필요). 컬럼 레벨 암호화는 추출/집계 쿼리를 깨므로 미채택. ADR에 근거 기록.

### AD-7 어려움 Taxonomy & 품질 점수 (Critic#8, 테스트 가능성)
- v1 카테고리 taxonomy(enumerated): `career_anxiety, financial_stress, social_isolation, self_worth, sleep_health, family_pressure, burnout, uncertainty_future` (+ `other`).
- intensity 1–5 정의(1=경미, 5=심각/일상지장).
- **완성도/품질 점수 공식**: `quality = 0.4*category_coverage + 0.3*context_richness + 0.3*temporal_consistency`, 목표 임계 ≥ 0.6. 소규모 라벨 eval set(≥50 대화)로 추출 정확도 baseline.
- **서브지표 정의(재현성)**: `category_coverage` = 사용자에게서 추출된 고유 카테고리 수 / 전체 9개; `context_richness` = context 필드가 비어있지 않고 최소 토큰수(예: ≥8 토큰)를 만족하는 레코드 비율; `temporal_consistency` = 다중 세션에서 카테고리/강도 신호가 상호모순 없이 이어지는 비율. Phase 3 착수 전 각 공식 확정.

### AD-8 미성년자 처리 (Critic#9)
- **MVP는 성인 전용**: 온보딩 연령 게이트(만 19세 이상 확인), 미만은 차단 + 안내(핫라인 정보 제공). 보호자 동의 흐름은 2차.
- **잔여 위험(accepted)**: 연령 게이트는 자가 신고(self-attestation)라 미성년자 허위 신고 가능. MVP 수용 위험으로 명시 기록(하드 컨트롤 아님), 2차에 본인확인 강화 검토.

## Acceptance Criteria
- [ ] AC-1: 가명 계정(이메일/소셜) 가입·로그인, 실명 미요구, `profiles.real_name IS NULL` 기본.
- [ ] AC-2: `/chat` 스트리밍 응답, 첫 토큰 < 1.5s, p95 < 4s (부하 테스트로 측정).
- [ ] AC-3: 대화/루틴이 저장되고 `/journal` 시간순 조회.
- [ ] AC-4: AI 응답이 공감·지지 시스템 프롬프트 전략을 따름 + "전문 상담 아님" 고지.
- [ ] AC-5: 반응형 웹/PWA — Lighthouse PWA 설치 가능, 모바일(≤375px)·데스크톱 정상.
- [ ] AC-6: 어려움이 **AD-7 taxonomy** 기준 `difficulty_data(category, intensity 1-5, context)`로 백그라운드 추출·저장.
- [ ] AC-7: **AD-7 품질/양 지표**(레코드 수, 카테고리 커버리지, 품질 점수 ≥0.6)를 집계 대시보드에서 조회.
- [ ] AC-8: 민감정보 디스크레벨 at-rest 암호화 + RLS 본인만 접근 + 동의 원장 관리.
- [ ] AC-9: 축적 데이터 기반 공개 기관/정책 큐레이션 추천을 `/recommendations`에 표시(룰 기반).
- [ ] AC-10: 추천 수용(열람/저장)이 `recommendation_events`에 기록.
- [ ] AC-11: 기관 연결(실명화)은 활성 `institution_sharing` 동의 게이트(AD-4 트리거) 통과 시에만 가능(MVP는 동의 UI+상태 전환까지, 실제 이관 없음).
- [ ] AC-12 (safety): AD-2 입력측 위기 분류기 + 한국 핫라인 에스컬레이션 UI 존재 + 테스트 검증. **릴리스 차단 기준.**
- [ ] AC-13 (compliance): 온보딩에서 국외이전(Anthropic/US)·민감정보 처리 별도 고지+동의(`ai_processing` scope) 없이는 대화 시작 불가.
- [ ] AC-14 (compliance): 동의 철회 + 계정삭제 시 관련 민감데이터 cascade 삭제 — **단 AD-3/RC-2 예외**: `consent_events`·`crisis_events`는 법적 보존을 위해 하드 삭제가 아닌 익명화 처리(하드 삭제 금지).
- [ ] AC-15: 온보딩 연령 게이트(만 19세 이상)로 미성년자 차단.

## Implementation Steps

### Phase 0 — 기반
1. Next.js(App Router, TS) + Tailwind + PWA(manifest, service worker).
2. Supabase 연결(`lib/supabase/{client,server,admin}.ts` — admin은 service_role).
3. 마이그레이션 `supabase/migrations/0001_init.sql`: 스키마 + **테이블별 RLS(AD-5)** + `extraction_status`(AD-1) + `consent_events`/`current_consents`(AD-3) + `crisis_events`(AD-2). 각 마이그레이션에 **down 스크립트**(AD-10 롤백).

### Phase 1 — 인증·동의·연령 (AC-1,13,15 / AD-3,8)
4. Supabase Auth + 가명 온보딩(닉네임) + **연령 게이트** + **국외이전/민감정보 동의(`ai_processing`)**.
5. 동의 원장 기록 + `current_consents` 뷰 + 철회 UI.

### Phase 2 — AI 동반자 + 위기 (AC-2,4,12 / AD-2)
6. 스트리밍 채팅 UI(`app/chat/`).
7. AI 라우트(`app/api/chat/route.ts`): claude-opus-4-8, 공감·지지 프롬프트.
8. **입력측 동기 위기 분류기**(`lib/safety/crisis.ts`, claude-haiku-4-5 + 키워드 fallback) → 위기 시 프롬프트 override + 한국 핫라인 카드 + `crisis_events` 로깅.

### Phase 3 — 비동기 추출 (AC-6,7 / AD-1,7)
9. `messages` INSERT 트리거 → Edge Function 워커: taxonomy 기반 구조화 추출(Claude structured output), `difficulty_data` + `extraction_status` 기록, 멱등·재시도.
10. 품질 점수 계산 + **집계 전용** 관리자 대시보드(`app/admin/metrics/`, service-role+admin authz).

### Phase 4 — 큐레이션 매칭 (AC-9,10,11 / AD-4)
11. 공개 기관/정책 시드 + 룰 기반 큐레이션(`lib/match/curate.ts`).
12. `/recommendations` UI + 수용 이벤트 로깅.
13. 기관 연결 동의 게이트 UI + **AD-4 SECURITY DEFINER 트리거**로 실명화 보호.

### Phase 5 — PWA·마감 (AC-5)
14. PWA 설치/오프라인 셸 + 반응형 QA + Lighthouse.
15. 시드 데이터 + E2E 스모크.

## Risks and Mitigations
| Risk | Mitigation | Gate |
|------|-----------|------|
| 민감정보 유출/부적절 접근 | 테이블별 RLS(AD-5) + 디스크 암호화 + 최소수집 + service-role 경로 감사 | security-reviewer 승인 |
| 위기 상황 미대응 | AD-2 입력측 분류기 + 한국 핫라인, AC-12 릴리스 차단 | QA 위기 시나리오 통과 |
| 국외이전 컴플라이언스 사고 | AC-13 별도 동의 없이는 대화 불가 | 법무/정책 고지문 확인 |
| 동의 철회/잊힐권리 미이행 | AD-3 원장 + cascade 삭제, AC-14 테스트 | 삭제 테스트 통과 |
| 추출 신뢰성 저하 → North-star 실패 | AD-1 멱등·재시도·dead-letter + 품질 baseline | 추출 재시도 테스트 |
| 실명 승격 동의 누락 | AD-4 트리거 + 음성 테스트 | 음성 테스트 통과 |
| 추출이 대화를 방해(설문화) | 100% 백그라운드(AD-1) | UX 리뷰 |

## Verification Steps
1. `npm run build` + typecheck 통과.
2. RLS 통합 테스트: 타 사용자 데이터 접근 차단(특히 `messages` 조인 경로).
3. 위기 입력측 분류기 유닛 테스트(**패러프레이즈/우회표현 케이스 포함**, 키워드 only 아님).
4. 동의 철회 + 계정삭제 cascade 테스트.
5. 실명 가드 **음성 테스트**(미동의 쓰기 거부).
6. 추출 파이프라인 재시도/멱등 테스트.
7. AC-2 p95 지연 부하 테스트(측정 방법 명시).
8. E2E: 연령게이트→동의→채팅(스트리밍)→백그라운드추출→추천 표시.

## Pre-mortem (deliberate) — 3 실패 시나리오
1. **설문화** → 방지: AD-1로 추출 100% 백그라운드, 사용자 폼 강요 없음.
2. **컴플라이언스 사고(국외이전 포함)** → 방지: AC-13 국외이전 별도 동의 + `institution_sharing` 게이트(AD-4). message#1에 이미 Claude/US로 전송됨을 온보딩에 고지.
3. **위기 대응 실패** → 방지: AD-2 입력측 동기 감지 + 한국 핫라인 상시, AC-12 릴리스 차단, 인간개입 부재를 UX에 명확 고지(오해 방지).

## Expanded Test Plan (deliberate)
- **Unit**: 위기 입력 분류(패러프레이즈), 추출 파서/taxonomy, 품질 점수, 동의 상태머신, 큐레이션 룰, 실명 가드 트리거.
- **Integration**: RLS(본인만, messages 조인), Auth+동의 흐름, 추출 트리거→저장→status, 계정삭제 cascade.
- **E2E**: 연령게이트→동의→채팅→추천, 동의 게이트 차단, 철회, PWA 설치.
- **Observability**: 데이터 품질/양 집계 대시보드, 위기 이벤트 로깅(수신자=운영 모니터링), 응답 지연 메트릭, 추출 실패/재시도 메트릭.

## ADR
- **Decision**: Option C — Next.js + Supabase(Auth/RLS/Postgres) + Day-1 얇은 비동기 추출 스파인(Edge Function + extraction_status). AI는 서버 라우트에서 claude-opus-4-8, 위기 분류는 claude-haiku-4-5 입력측. 큐레이션 룰 기반. 디스크레벨 암호화. 성인 전용.
- **Drivers**: PII/국외이전 컴플라이언스, 추출 신뢰성(North-star), MVP 속도.
- **Alternatives considered**: A(추출 런타임 MVP 부재로 무효), B(이중 서비스 과잉).
- **Why chosen**: 보안(RLS)+속도+단일 PWA를 유지하며 제품 핵심(추출)을 안정 계약 뒤로 Day1 분리, B 이관은 워커 교체로 축소.
- **Consequences**: 큐/Edge 운영 1조각 추가. 컬럼 암호화 미채택(쿼리성 우선). 국외이전 동의가 온보딩 필수 관문.
- **Follow-ups**: 2차 기관 파트너십·실명 이관 파이프라인, 취업기회 컴포넌트, 보호자 동의(미성년), 추천 알고리즘 고도화, 인간 위기 대응자 도입 검토, 인/국내 모델로 국외이전 제거 검토.

## Changelog
- **v1→v2**: Architect 6건(비동기 스파인, 위기 입력측, 동의 원장, 실명 트리거, RLS 테이블별, 암호화 명확화) + Critic 4건(국외이전 동의 AC-13, taxonomy·품질공식 AD-7, 성인 전용 AD-8, 롤백·누락 테스트) 전부 반영. Option A 무효화, Option C 채택.
- **v2→v2.1** (Architect 재검토): RC-1 RLS에 `recommendation_events`·`extraction_status` 추가, RC-2 cascade에 `routines`·`recommendation_events` 추가 + `consent_events`/`crisis_events`는 삭제 대신 익명화, RC-3 위기 분류기 concurrent+버퍼 게이트로 AC-2 예산 보호, RC-4 출력측 보조망 2차 follow-up, Principle 3 문구를 `ai_processing` 선행 관문에 맞춰 수정.
- **v2.1→v2.2** (Critic APPROVE + 비차단 개선): 위기 분류기 fail-safe(fail-open 금지) 명시, AC-14에 익명화 예외 참조 추가, AD-7 서브지표(coverage/richness/consistency) 공식 정의, 연령 게이트 자가신고 잔여 위험 명시. **Consensus 도달 — Architect SOUND, Critic APPROVE.**

## Consensus Status
- Architect: **SOUND-WITH-CHANGES → 전건 반영 완료**
- Critic: **APPROVE** (10/10 findings resolved, 모든 ralplan 게이트 PASS)
- Iterations: 2 (max 5 이내)
- **Plan status: `pending approval`** — 실행은 별도의 명시적 승인 필요.

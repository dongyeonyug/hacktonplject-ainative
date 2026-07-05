# 아키텍처 (ARCHITECTURE)

마음곁의 구조·데이터 흐름·주요 모듈 상세. 신규 개발자 온보딩용. (요약은 [CLAUDE.md](../CLAUDE.md))

## 1. 전체 그림
```
[사용자] → Next.js 16 (반응형 웹 / PWA)
   │
   ├─ proxy.ts (Next 16 미들웨어): 세션 갱신 + /chat 접근 시 ai_processing 동의 게이트
   │
   ├─ 인증/온보딩: Supabase Auth(가명 계정) → 연령 게이트(≥19) → ai_processing 동의
   │
   ├─ /chat → /api/chat (route.ts)
   │     1) ai_processing 동의 재확인(defense-in-depth)
   │     2) 사용자 메시지 저장(messages)
   │     3) 입력측 위기 분류(haiku) + 키워드 fallback → 위기 시 핫라인 카드 + crisis_events
   │     4) 동반자 응답 생성(opus, 스트리밍)
   │     5) after(): 백그라운드 어려움 추출 → difficulty_data
   │
   ├─ /recommendations → difficulty_data 집계 → 룰 큐레이션 → 공개기관 카드 + recommendation_events
   ├─ /journal → 내 대화·루틴 기록
   └─ /admin/metrics → (allowlist) 집계 통계 (service_role, 비식별)

[Supabase Postgres] RLS로 사용자별 격리. 민감정보 디스크 암호화(at-rest).
```

## 2. 기술 스택 상세
- **Next.js 16 App Router / TypeScript** — 서버 컴포넌트 기본, 서버 액션 + Route Handler.
- **Tailwind v4** — `@import "tailwindcss"`, 모바일 퍼스트.
- **Supabase** — Postgres(RLS), Auth(이메일/비번, 가명), Edge Functions(선택적 추출 워커).
- **Anthropic Claude** — `@anthropic-ai/sdk`. opus=대화, haiku=위기분류·추출.
- **PWA** — `public/manifest.json` + `public/sw.js`(앱셸, `/api/*`는 캐시 안 함).

## 3. 데이터베이스 (supabase/migrations/0001_init.sql)
주요 테이블:
| 테이블 | 설명 | 소유/RLS |
|--------|------|----------|
| `profiles` | 1:1 auth.users, 가명(pseudonym), real_name(기본 NULL, 트리거 보호), age_verified | `id = auth.uid()` |
| `conversations` | 대화 세션 | `user_id = auth.uid()` |
| `messages` | 메시지(user_id 없음) | conversations 조인 EXISTS |
| `difficulty_data` | 추출된 어려움(category/intensity 1-5/context/source_message_id UNIQUE) | `user_id = auth.uid()` |
| `emotional_states`, `routines` | 감정 추이·루틴 | `user_id = auth.uid()` |
| `consent_events` | **append-only 동의 원장**(scope: ai_processing/data_storage/institution_sharing, action: grant/revoke) | `user_id = auth.uid()`, 삭제 시 SET NULL |
| `crisis_events` | 위기 로깅 | 삭제 시 SET NULL(익명화 보존) |
| `institutions` | 공개 기관/정책(categories 배열, 0003에서 확장) | public read |
| `curated_matches`, `recommendation_events` | 추천·이벤트 | `user_id = auth.uid()` |
| `extraction_status` | 추출 상태(queued/running/done/failed, attempts) | service_role 전용(정책 없음) |

- **뷰 `current_consents`**: 원장에서 (user_id, scope)별 최신 grant/revoke 도출. action='grant'면 현재 활성.
- **트리거 `guard_realname`** (SECURITY DEFINER): real_name 쓰기 시 institution_sharing 활성 동의 없으면 예외.
- 마이그레이션: 0001(스키마+RLS+트리거+시드) / 0002(pg_net 추출 트리거) / 0003(기관 categories+추가 시드). 각 `*.down.sql` 롤백 존재. `SETUP_ALL.sql`은 셋 합본.

## 4. 요청 생애주기 — 대화 (app/api/chat/route.ts)
1. body 파싱 → `userMessage`.
2. `supabase.auth.getUser()` → 미인증 401.
3. **ai_processing 동의 확인** → 없으면 403(핫라인 포함).
4. conversation 없으면 생성, `messages`에 user 메시지 저장 → `userMessageId`.
5. `after(() => runExtraction({messageId, content, userId}))` 예약 (응답 후 실행, 서버리스 안전).
6. **위기 게이트**: `matchCrisisKeywords`(즉시) + `classifyWithHaiku`(동시) → `decideCrisis`. speculative 정상 응답 스트림을 만들어 두고, 분류 결과 나올 때까지 버퍼링(AC-2 지연 보호).
   - 위기면: speculative abort → `hotline` 이벤트 전송 → 위기 프롬프트로 재생성 → `crisis_events` 기록.
   - **fail-safe**: 분류기 실패 시 핫라인 표시(정상 응답 fail-open 금지).
7. NDJSON 스트림(`meta`/`hotline`/`delta`/`done`) 반환. 완료 후 assistant 메시지 저장(best-effort).

## 5. 주요 모듈
### 안전 (lib/safety/)
- `crisis-core.ts` — **순수**: `CRISIS_KEYWORDS`, `matchCrisisKeywords`, `decideCrisis`(우선순위: 키워드>분류기실패 fail-safe>분류기 위기>정상). 유닛 테스트 대상.
- `crisis.ts` — `classifyWithHaiku`(haiku tool-use, 타임아웃, never throw), 순수 API 재export.
- `hotlines.ts` — `HOTLINES`(109/1577-0199) + 사람 미모니터링 고지.

### 추출 (lib/extract/)
- `taxonomy.ts` — 9개 카테고리 enum + 가드(순수).
- `parse.ts` — `parseDifficultyExtraction(modelJson)` 모델응답→검증행(순수, 테스트).
- `run-extraction.ts` — **앱내 실행기**: admin client + haiku tool-use + parse → difficulty_data + extraction_status. 멱등(source_message_id UNIQUE)·재시도·dead-letter. `after()`로 호출됨.
- (선택) `supabase/functions/extract-difficulty/index.ts` — 동일 계약의 Edge Function(서버리스 정식 경로).

### 대화 (lib/ai/)
- `anthropic.ts` — 지연 클라이언트, `COMPANION_MODEL`/`CLASSIFIER_MODEL`.
- `companion.ts` — 정상/위기 시스템 프롬프트 + `createCompanionStream`(스트리밍).

### 동의/프로필 (lib/)
- `consent.ts` — `getCurrentConsents`, `hasActiveConsent`, `recordConsent`, `requireAiProcessingConsent`.
- `profile.ts` — `ensureProfile`(가명 프로필 idempotent 생성).

### 추천 (lib/match/curate.ts)
- **순수**: 사용자 difficulty_data(카테고리 빈도·강도) → 기관 category 겹침으로 점수·정렬. 신호 없으면 전체 fallback.

### 지표 (lib/metrics/)
- `quality.ts` — **순수** AD-7: category_coverage/context_richness/temporal_consistency → `quality=0.4/0.3/0.3`, 목표 ≥0.6 + 볼륨/추출건전성.
- `admin-auth.ts` — `ADMIN_EMAILS` allowlist(`getAdminUser`/`isAdminEmail`). 비관리자는 `notFound()`.

### 공용 UI (components/)
- `AppNav.tsx` — 대화/추천/기록 + (관리자만)통계 + 로그아웃. 세 페이지 공유.
- `components/chat/` — `ChatPanel`(스트리밍 클라이언트), `HotlineCard`.

### 인증 게이트 (proxy.ts)
- Next 16 미들웨어(파일명 `proxy.ts`, export `proxy`). 세션 쿠키 갱신 + `/chat*` 접근 시 로그인·ai_processing 동의 검사→리다이렉트.

## 6. 테스트
- **유닛(Vitest)**: `lib/**/__tests__/*.test.ts` — 순수 모듈(위기/파서/큐레이션/품질) 75개. `npm test`.
- **DB(pgTAP)**: `supabase/tests/database/*.sql` — RLS 격리·실명가드 음성·동의철회/삭제. 라이브 DB 필요.
- **E2E(Playwright)**: `e2e/smoke.spec.ts` — 온보딩→동의→대화→추천. 라이브 Supabase+키 필요(없으면 skip).

## 7. 새 기능 추가할 때 (권장 절차)
1. `CLAUDE.md` 불변식 확인(특히 안전/동의/RLS 영향 여부).
2. 순수 로직은 `lib/**`에 + 유닛 테스트.
3. DB 변경은 **새 마이그레이션 파일**(0004…)로, down 스크립트 포함. 기존 마이그레이션 수정 금지.
4. `feat/…` 브랜치 → typecheck/test/build → PR → 리뷰 → merge.

## 8. 알아둘 점
- Vercel 서버리스: 백그라운드 작업은 `after()`(부동 프로미스 금지).
- 이메일 인증 현재 OFF, Google 로그인 UI 제거(공급자 미설정).
- 민감정보: 컬럼 암호화 대신 디스크 암호화(쿼리성 유지). 프롬프트에 불필요한 PII 최소화.

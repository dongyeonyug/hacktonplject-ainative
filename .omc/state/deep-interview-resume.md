# Deep Interview → Plan — 재개용 진행 문서 (RESUME)

> 다음에 다시 시작할 때 이 문서를 읽고 **"실행 승인" 단계**부터 이어가면 됩니다.
> 현재 위치: 딥 인터뷰 완료 → 합의 계획 완료 → **실행은 pending approval (미실행)**.

## 현재 상태 요약
- ✅ **Deep Interview 완료** — 10라운드, 최종 모호도 **18%** (PASSED, 임계 20%)
- ✅ **omc-plan --consensus --direct 완료** — Architect SOUND + Critic APPROVE, 2 iterations
- ⏸️ **실행 미시작** — 계획은 `pending approval`. 사용자가 "일단 여기까지, 다음에 이 부분부터 재시작" 선택.

## 산출물 (경로)
- 📄 스펙: `.omc/specs/deep-interview-jobseeker-mental-care.md`
- 📄 합의 계획(최종 v2.2): `.omc/plans/plan-jobseeker-mental-care.md`  ← **실행 대상**
- ⚙️ 상태: `.omc/state/deep-interview-state.json` (active=false, handed-off-to-plan)

## ▶ 다음에 여기부터 재개 — 실행 승인
합의된 계획 `.omc/plans/plan-jobseeker-mental-care.md`을 어떻게 실행할지 선택하면 됨:
- **team으로 실행** — N개 병렬 에이전트 (대형 계획 권장) → `Skill("oh-my-claudecode:team")`
- **ralph로 실행** — 검증 동반 순차 지속 루프 → `Skill("oh-my-claudecode:ralph")`
- **계획 더 다듬기** — 특정 Phase/결정 재정제
※ 실행 전 별도의 명시적 승인 필요. 자동 실행 금지.

## 확정된 제품 핵심 (한눈에)
- **무엇:** 취준생 만성 불안·고립감을 24시간 **AI 동반자(챗봇)**로 상시 동반 → 대화에서 **어려움 데이터**를 백그라운드 추출 → **큐레이션 기관/정책 추천** → (2차) 동의 기반 실제 기관 연결.
- **MVP 범위:** AI 동반자 + 데이터 축적 + 큐레이션 매칭까지. **성인 전용**, 반응형 웹/PWA.
- **North-star:** 어려움 데이터 품질/양.
- **스택:** Next.js + Supabase(Auth/RLS/Postgres) + Day-1 얇은 비동기 추출 스파인(Edge Function). AI=claude-opus-4-8(대화)/claude-haiku-4-5(위기 분류).
- **2차 defer:** 실제 기관 제휴·실명 이관, 취업기회 제공, 보호자 동의(미성년), 추천 알고리즘 고도화.

## 합의에서 확정된 핵심 제약 (실행 시 반드시 지킬 것)
1. **안전(비협상):** 위기 감지는 **입력측 동기 분류기**(haiku)+키워드 fallback, 한국 핫라인 **109 / 1577-0199**, fail-open 금지, 인간개입 부재 UX 고지.
2. **컴플라이언스(PIPA):** 대화가 message#1부터 Claude(미국) 국외이전 → `ai_processing` **별도 동의를 대화 전 관문**으로. 동의는 append-only 원장(철회 가능). 잊힐 권리 cascade 삭제(단 `consent_events`·`crisis_events`는 익명화).
3. **DB:** 테이블별 RLS(`messages`는 conversations 조인, 관리자 집계 전용 service-role, `extraction_status` service-role 전용). 실명화는 `SECURITY DEFINER` 트리거로 동의 게이트.
4. **암호화:** 디스크레벨 at-rest(컬럼레벨 미채택 — 쿼리성).
5. **추출:** 100% 백그라운드(폼 강요 금지), 멱등키=source_message_id, 재시도/dead-letter.
6. **taxonomy:** 9종 카테고리 + intensity 1-5 + 품질점수 `0.4*coverage+0.3*richness+0.3*consistency` ≥0.6.

## 이전 인터뷰 라운드 요약 (참고)
R0 토폴로지 확정(멘탈케어 핵심 엔진) → R1 핵심행동 미정 → R2 만성 불안·고립 상시 → R3 AI 동반자 → R4(Contrarian) 둘 다 필수·단계분리 → R5 성공=기관 연결 성사 → R6(Simplifier) MVP=큐레이션 매칭까지 → R7 MVP지표=데이터 품질/양 → R8 가명+동의시 실명화 → R9 반응형 웹/PWA → R10 취업기회 defer. 최종 18%.

# Deep Interview Spec: 취준생 멘탈케어 AI 동반자 (데이터 기반 기관 매칭)

## Metadata
- Interview ID: `di-jobseeker-wellness-001`
- Rounds: 10
- Final Ambiguity Score: **18%**
- Type: greenfield
- Generated: 2026-07-04
- Threshold: 0.2 (20%)
- Threshold Source: `default`
- Initial Context Summarized: no
- Status: **PASSED**

## Clarity Breakdown
| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Goal Clarity | 0.88 | 0.40 | 0.352 |
| Constraint Clarity | 0.85 | 0.30 | 0.255 |
| Success Criteria | 0.72 | 0.30 | 0.216 |
| **Total Clarity** | | | **0.823** |
| **Ambiguity** | | | **0.177 (18%)** |

## Core Framing (핵심 프레이밍)
> **데이터화·기관협업이 최종 목적이지만, 그 데이터를 모으는 *방법*으로 실제로 도움이 되는 멘탈케어를 제공한다.**
> 설문/리서치 도구가 아니라 **진짜 도움이 되는 AI 동반자가 자연스럽게 고품질 어려움 데이터를 생성**하고, 그 데이터가 기관 협업·매칭의 연료가 된다.

## Topology
| Component | Status | Description | Coverage / Deferral Note |
|-----------|--------|-------------|--------------------------|
| 멘탈케어 & 루틴회복 (`mental-care`) | active | 24시간 AI 동반자(챗봇)가 만성 불안·고립감을 상시 동반하며 공감·지지. 핵심 가치 엔진이자 데이터 생성원 | AC-1~5 |
| 어려움 데이터화 & 기관협업 (`data-institution`) | active | 대화에서 자연스럽게 추출된 어려움을 구조화·축적. 기관 협업의 연료 | AC-6~8 |
| 맞춤기관 매칭 (`matching`) | active | MVP는 공개 기관/정책 정보의 **큐레이션 추천**까지. 실제 제휴·실명 연결은 2차 | AC-9~10 |
| 취업기회 제공 (`job-opportunity`) | **deferred** | 채용/취업기회 제공 기능 | **User-confirmed defer to post-MVP (2026-07-04)** — MVP는 멘탈케어·데이터·큐레이션 매칭에 집중 |

## Goal
취준 기간 내내 이어지는 **만성 불안·고립감**을 겪는 취준생에게, **24시간 대화 가능한 AI 동반자(챗봇)**를 제공하여 실질적 정서적 지지와 루틴 회복을 돕는다. 이 대화 경험은 (설문이 아니라 자연스러운 상호작용을 통해) **기관 협업에 가치 있는 고품질 '어려움 데이터'를 생성**하며, 축적된 데이터를 바탕으로 사용자에게 **큐레이션된 맞춤 기관/정책 정보를 추천**한다. 궁극적으로는(2차) 사용자 동의 하에 실제 관련 기관과 연결하여 실질적 도움을 성사시키는 것을 지향한다.

## Constraints
- **플랫폼:** 반응형 웹 / PWA (Next.js). 단일 코드로 모바일·데스크톱 대응.
- **신원/데이터 모델:** 기본은 **가명 계정**(이메일/소셜 로그인, 실명 불필요)으로 데이터 축적. 기관 연결 단계에서만 **명시적 동의를 받아 실명화**.
- **단계 분리 원칙:** AI로 신뢰·데이터를 먼저 쌓은 뒤, 사용자 동의를 게이트로 하여 점진적으로 기관 연결. 익명 위로와 기관 연결(실명·데이터 이관)은 순차적으로 분리.
- **MVP 경계:** 실제 기관 제휴·라이브 상담 연결·실명 이관은 **제외**. 공개 정보 큐레이션 추천까지만.
- **민감정보:** 정신건강 관련 어려움 데이터는 민감정보 — 암호화, 동의 관리, 데이터 거버넌스 필요(Supabase RLS 등 검토).
- **기술 후보:** Next.js(프론트/PWA), 백엔드 Node.js 또는 FastAPI, DB/Auth는 PostgreSQL/Supabase. 전부 사용 강제 아님.

## Non-Goals (MVP 제외)
- 실제 기관과의 제휴 및 라이브 상담사 연결 (2차)
- 개별 사용자 실명 데이터의 기관 이관 (2차, 동의 기반)
- 채용공고/취업기회 제공 기능 (`job-opportunity` 컴포넌트 전체, 2차로 defer)
- 설문/리서치 중심 데이터 수집 (명시적 반대 방향)
- 네이티브 모바일 앱 (2차 확장 후보)

## Acceptance Criteria
- [ ] AC-1: 가명 계정(이메일/소셜)으로 가입·로그인할 수 있고 실명은 요구되지 않는다.
- [ ] AC-2: 사용자는 언제든 AI 동반자와 대화할 수 있으며, AI는 공감·지지 톤으로 응답한다.
- [ ] AC-3: 대화/루틴 활동이 기록되어 사용자가 자신의 흐름을 되돌아볼 수 있다.
- [ ] AC-4: AI 대화는 불안·고립감 완화를 목표로 설계된 응답 전략을 따른다.
- [ ] AC-5: 반응형 웹/PWA로 모바일·데스크톱에서 동일하게 접근 가능하다.
- [ ] AC-6: 대화에서 사용자의 '어려움'이 **구조화된 데이터**(카테고리/강도/맥락 등)로 자연스럽게 추출·저장된다.
- [ ] AC-7: 축적된 어려움 데이터의 **품질/양**을 측정할 수 있는 지표가 존재한다 (MVP North-star 지표).
- [ ] AC-8: 민감정보는 암호화 저장되고, 기관 활용 시 동의 상태가 명확히 관리된다.
- [ ] AC-9: 축적된 데이터를 바탕으로 공개 기관/정책 정보를 **큐레이션 추천**한다.
- [ ] AC-10: 추천이 사용자에게 표시되고, 추천 수용(열람/저장/행동) 여부를 추적할 수 있다.
- [ ] AC-11: 기관 연결(실명화)은 **명시적 동의 게이트**를 통과해야만 진행된다 (MVP에서는 동의 흐름 뼈대까지).

## Assumptions Exposed & Resolved
| Assumption | Challenge | Resolution |
|------------|-----------|------------|
| "앱을 열면 하는 핵심 행동이 있다" | Round 1: 핵심 행동 미정 → 온톨로지/트리거로 전환 | 특정 행동이 아니라 **상시 동반**이 본질 |
| "특정 순간(이벤트)을 잡는다" | Round 2: 트리거 순간? | **만성 불안·고립감 상시** — 지속 동반자 성격 |
| "고립감은 도구로 푼다" | Round 3: 연결 주체는? | **AI 동반자(챗봇)** — 혼자 쓰지만 외롭지 않게 |
| "익명 위로 vs 기관 연결은 충돌한다" | Round 4 (Contrarian): 어느 쪽이 중심? | **둘 다 필수, 단계 분리** (신뢰→동의→연결) |
| "성공 = 정서 개선/재방문" | Round 5: 진짜 성공 신호? | North-star = **기관 연결 성사** |
| "실제 기관 제휴가 MVP에 필요" | Round 6 (Simplifier): 가장 단순한 v1? | MVP = **큐레이션 정보 매칭까지** |
| "MVP 성공은 재방문율" | Round 7: MVP 측정 지표? | **어려움 데이터 품질/양** (2차 협업의 선행 증거) |
| "민감정보는 완전 익명이어야" | Round 8: 데이터/신원 모델? | **가명 계정 + 동의 시 실명화** |
| "네이티브 앱 필요" | Round 9: 플랫폼? | **반응형 웹 / PWA** |
| "취업기회 제공도 MVP" | Round 10: 처리? | **2차로 defer** |

## Technical Context (greenfield)
- **프론트:** Next.js 기반 반응형 웹 + PWA.
- **백엔드:** Node.js 또는 FastAPI (택1 가능). AI 대화 오케스트레이션 + 어려움 데이터 추출 파이프라인.
- **DB/Auth:** PostgreSQL / Supabase (가명 계정 인증, RLS로 민감정보 보호).
- **AI:** 최신·최강 Claude 모델(예: Opus 4.8) 기반 대화 에이전트 권장. 대화 중 구조화 데이터 추출(감정상태/어려움 카테고리/강도/맥락).
- **데이터 거버넌스:** 민감(정신건강) 데이터 — 암호화, 동의 상태 관리, 가명↔실명 승격 흐름.
- **미해결/후속 정밀화 필요:** 어려움 데이터 스키마(카테고리 taxonomy), 큐레이션 추천 알고리즘 근거, 데이터 품질 측정 정의, 2차 기관 파트너십 대상(고용센터/청년정책/정신건강복지센터/대학 취업지원 등).

## Ontology (Key Entities) — 최종 라운드 기준
| Entity | Type | Fields | Relationships |
|--------|------|--------|---------------|
| 취준생(User) | core domain | 가명ID, 가입일, 동의상태 | has many 대화, has 감정상태 이력, receives 추천 |
| AI동반자(Companion) | core domain | 페르소나, 응답전략 | converses with User, extracts 어려움데이터 |
| 대화(Conversation) | core domain | 메시지, 타임스탬프 | belongs to User, produces 어려움데이터 |
| 감정상태(EmotionalState) | core domain | 불안/고립 수준, 시점 | tracked from 대화 |
| 루틴(Routine) | supporting | 활동, 지속일수 | logged by User |
| 어려움데이터(DifficultyData) | core domain | 카테고리, 강도, 맥락 | extracted from 대화, feeds 매칭 & 기관협업 |
| 동의(Consent) | core domain | 범위, 시점, 실명화 여부 | gates 기관연결 |
| 가명계정(PseudonymAccount) | core domain | 이메일/소셜ID | belongs to User, upgradable to 실명 |
| 큐레이션추천(CuratedMatch) | core domain | 기관/정책정보, 수용여부 | recommended to User |
| 관련기관(Institution) | external system | 유형, 공개정보 | (2차) matched to User |

## Ontology Convergence
| Round | Entity Count | New | Changed | Stable | Stability Ratio |
|-------|-------------|-----|---------|--------|----------------|
| 1 | 5 | 5 | - | - | N/A |
| 2 | 6 | 1 (감정상태) | - | 5 | 83% |
| 3 | 8 | 2 (AI동반자, 대화) | - | 6 | 75% |
| 4 | 9 | 1 (동의) | - | 8 | 89% |
| 5 | 9 | 0 | - | 9 | 100% |
| 6 | 9 | 1 (큐레이션추천) | 1 (매칭→큐레이션추천) | 8 | ~95% |
| 7 | 9 | 0 | - | 9 | 100% |
| 8 | 10 | 1 (가명계정) | - | 9 | 90% |
| 9 | 10 | 0 | - | 10 | 100% |
| 10 | 10 | 0 | - | 10 | 100% |

수렴 결론: 도메인 모델이 마지막 3라운드에서 안정(변화 없음). 핵심 엔티티 10개로 수렴.

## Interview Transcript
<details>
<summary>Full Q&A (10 rounds)</summary>

### Round 0 — Topology
**Q:** 4개 최상위 컴포넌트(멘탈케어/취업기회/데이터·기관협업/맞춤매칭)가 맞나?
**A:** 데이터/기관협업이 목적이지만, 그 데이터를 모으는 방법으로 실제 도움이 되는 멘탈케어를 제공. 설문/리서치가 아닌 실제 도움. → 4개 유지, mental-care가 핵심 엔진.

### Round 1 — 핵심 행동
**Q:** 앱을 열었을 때 가장 먼저 하는 핵심 행동 하나는?
**A:** 아직 정해지지 않음.
**Ambiguity:** 79% (Goal 0.25 / Constraints 0.20 / Criteria 0.15)

### Round 2 — 트리거 순간
**Q:** 앱이 가장 잘 잡아야 할 사용자의 순간/상태는?
**A:** 만성 불안·고립감 상시.
**Ambiguity:** 72% (Goal 0.45 / Constraints 0.20 / Criteria 0.15)

### Round 3 — 연결 주체
**Q:** 고립감을 덜어주는 주체는 누구인가?
**A:** AI 동반자(챗봇).
**Ambiguity:** 68% (Goal 0.55 / Constraints 0.20 / Criteria 0.15)

### Round 4 — Contrarian
**Q:** 익명 위로 vs 기관 연결이 충돌할 때 어느 쪽이 중심?
**A:** 둘 다 필수, 단계 분리.
**Ambiguity:** 56% (Goal 0.65 / Constraints 0.45 / Criteria 0.15)

### Round 5 — 성공 신호
**Q:** 서비스가 성공했다고 말할 가장 중요한 신호?
**A:** 기관 연결 성사.
**Ambiguity:** 44% (Goal 0.70 / Constraints 0.45 / Criteria 0.50)

### Round 6 — Simplifier
**Q:** 가치 있는 가장 단순한 MVP 경계는?
**A:** 큐레이션된 정보 매칭까지.
**Ambiguity:** 34% (Goal 0.75 / Constraints 0.65 / Criteria 0.55)

### Round 7 — MVP 지표
**Q:** MVP 단계 핵심 측정 지표?
**A:** 어려움 데이터 품질/양.
**Ambiguity:** 27% (Goal 0.80 / Constraints 0.65 / Criteria 0.72)

### Round 8 — 데이터/신원 모델
**Q:** MVP에서 사용자 신원·데이터를 어떻게?
**A:** 가명 계정 + 동의 시 실명화.
**Ambiguity:** 22% (Goal 0.82 / Constraints 0.78 / Criteria 0.72)

### Round 9 — 플랫폼
**Q:** MVP 플랫폼?
**A:** 반응형 웹 / PWA.
**Ambiguity:** 20% (Goal 0.82 / Constraints 0.85 / Criteria 0.72)

### Round 10 — 취업기회 처리
**Q:** `job-opportunity` 컴포넌트 MVP 처리?
**A:** 2차로 defer.
**Ambiguity:** 18% (Goal 0.88 / Constraints 0.85 / Criteria 0.72)

</details>

---
**Status: pending approval** — 실행은 별도의 명시적 승인이 필요합니다.

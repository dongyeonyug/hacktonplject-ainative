# 협업 가이드 (CONTRIBUTING)

마음곁 프로젝트에 함께해 주셔서 감사합니다. 이 문서는 **팀(2~5명)이 Claude Code + GitHub로 협업**하는 기본 규칙입니다.
프로젝트 이해는 [CLAUDE.md](CLAUDE.md)와 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 먼저 읽어주세요.

> 규칙 강도는 "소규모 팀 표준"으로 설정했습니다. 팀 합의로 언제든 강화(엄격)/완화(가볍게) 가능합니다.

---

## 1. 처음 셋업 (한 번만)
```bash
git clone https://github.com/dongyeonyug/ainativehackton.git
cd ainativehackton
npm install
cp .env.local.example .env.local   # 값은 팀 리더에게 받기 (실제 키는 공유 채널로만, git 금지)
npm run dev
```
- Supabase DB가 처음이면 `supabase/SETUP_ALL.sql`을 Supabase SQL Editor에 실행.
- 각자 개인 Supabase를 쓰지 말고 **팀 공용 Supabase 프로젝트**를 공유하세요(데이터 일관성).

## 2. Git 워크플로우
- **`main`은 보호 브랜치** — 직접 push 금지. 항상 브랜치 → PR → 리뷰 → merge.
- 브랜치 이름:
  - `feat/<간단설명>` 새 기능 (예: `feat/routine-tracker`)
  - `fix/<간단설명>` 버그 수정
  - `docs/…`, `refactor/…`, `design/…`, `test/…`
- 하나의 브랜치 = 하나의 작업(작게 유지, 리뷰 쉬움).
```bash
git checkout main && git pull
git checkout -b feat/my-feature
# ...작업...
git add -A && git commit -m "feat: 루틴 트래커 추가"
git push -u origin feat/my-feature
# GitHub에서 PR 생성
```

## 3. 커밋 메시지 (Conventional Commits)
`<type>: <설명>` 형식. type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `design`.
예) `feat: 대화 감정 그래프 추가`, `fix: 추천 정렬 오류 수정`, `design: 온보딩 화면 개선`.

## 4. Pull Request 규칙
- **리뷰어 최소 1명** 승인 후 merge.
- PR 설명에: 무엇을·왜·어떻게 테스트했는지.
- **머지 전 체크리스트** (PR에 복붙):
  ```
  - [ ] npm run typecheck 통과
  - [ ] npm test 통과 (유닛)
  - [ ] npm run build 통과
  - [ ] CLAUDE.md의 안전·컴플라이언스 불변식을 훼손하지 않음
  - [ ] (안전/동의/RLS/추출 관련 변경이면) 리뷰어에게 명시적으로 알림
  ```
- **작게, 자주** 올리세요. 거대한 PR은 리뷰가 어렵습니다.

## 5. ⚠️ 특별 주의 영역 (반드시 리뷰 강화)
아래를 건드리는 PR은 리뷰어가 불변식 유지 여부를 꼭 확인:
- 위기 감지 (`lib/safety/*`, `app/api/chat/route.ts`) — fail-open 금지
- 동의/온보딩 (`app/onboarding`, `app/consent`, `lib/consent.ts`, `proxy.ts`) — 국외이전 동의 게이트 유지
- DB 스키마/RLS (`supabase/migrations/*`) — 마이그레이션은 새 파일로 추가(기존 수정 금지), down 스크립트 포함
- 관리자 (`app/admin`, `lib/metrics/admin-auth.ts`) — 집계 전용·allowlist 유지
자세한 규칙: [CLAUDE.md](CLAUDE.md) "절대 훼손 금지" 섹션.

## 6. 작업 분담 (GitHub Issues)
- 할 일은 **Issue**로 만들고 담당자를 지정(assign)하세요. 중복 작업 방지.
- 라벨 예: `feature`, `bug`, `design`, `docs`, `safety`, `good-first-issue`.
- 작업 시작 시 Issue를 "In Progress"로, PR에 `Closes #<번호>` 연결.

## 7. Claude Code 사용 팁 (이 팀의 방식)
- 각자 Claude Code가 `CLAUDE.md`를 자동으로 읽으므로 **같은 규칙**으로 작업됩니다.
- 새 기능/디자인 작업 시: Claude에게 "CLAUDE.md와 docs/ARCHITECTURE.md를 참고해서 …"라고 하면 맥락을 정확히 잡습니다.
- 큰 작업은 `/plan`(계획)으로 먼저 설계, 작은 수정은 바로 구현.
- **커밋/푸시는 사람이 확인 후** 진행(Claude가 자동 푸시하지 않도록).

## 8. Definition of Done (완료 기준)
- [ ] 기능이 실제로 동작(로컬에서 확인)
- [ ] typecheck + 유닛테스트 + build 통과
- [ ] 관련 순수 로직에 테스트 추가(해당 시)
- [ ] 안전·컴플라이언스 불변식 유지
- [ ] PR 리뷰 승인 → main merge
- [ ] (배포 대상이면) Vercel 배포 확인

## 9. 코드 스타일
- TypeScript strict, Tailwind 유틸리티(모바일 퍼스트), 서버 컴포넌트 기본.
- 순수 로직은 I/O와 분리해 `lib/**`에 + 테스트.
- 자세한 컨벤션: [CLAUDE.md](CLAUDE.md).

문의/충돌은 팀 채널에서 논의하고, 규칙 자체를 바꾸고 싶으면 `docs/` PR로 제안하세요.

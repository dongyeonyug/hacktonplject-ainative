## Handoff: team-plan → team-exec

- **Decided**: Build MVP per `.omc/plans/plan-jobseeker-mental-care.md` (v2.2, consensus-approved). Stack: Next.js App Router + TS + Tailwind + PWA, Supabase (Postgres/Auth/RLS). Foundation (scaffold + DB migration with RLS/triggers) gates all feature work. 4 executor workers, dependency-ordered task graph.
- **Rejected**: Parallelizing feature work before schema exists (would race on missing tables). Real Supabase provisioning by workers (not possible — use `.env.local.example` placeholders; user provisions later).
- **Risks**: (1) Safety-critical crisis path (T4) and PII/consent (T2,T3) must follow plan AD-2/AD-3/AD-4 exactly — route to opus. (2) No live Supabase/API keys → build-only verification (tsc/lint/build), not runtime. (3) Edge Function (T5) can be scaffolded but not deployed here. (4) Heavy interdependency on T2 serializes early start.
- **Files**: `.omc/plans/plan-jobseeker-mental-care.md` (source of truth), `.omc/handoffs/team-plan.md`.
- **Remaining (task graph)**:
  - T1 [worker-1, no deps]: git+Next.js(App Router,TS)+Tailwind+PWA scaffold, Supabase client/server/admin libs, `.env.local.example`.
  - T2 [worker-1, blockedBy T1]: `supabase/migrations/0001_init.sql` — all tables + per-table RLS (AD-5) + SECURITY DEFINER realname trigger (AD-4) + `extraction_status` + append-only `consent_events`+`current_consents` view + `crisis_events` + down script.
  - T3 [worker-2, blockedBy T2]: Auth + pseudonym onboarding + **age gate ≥19 (AD-8)** + **ai_processing cross-border consent gate before chat (AC-13)** + consent ledger write/withdraw UI.
  - T4 [worker-3, blockedBy T2, OPUS]: Streaming chat UI + AI route (claude-opus-4-8) + **input-side crisis classifier (claude-haiku-4-5)+keyword fallback + KR hotlines 109/1577-0199 + crisis_events + fail-safe no-fail-open (AD-2)** + "not professional counseling" notice.
  - T5 [worker-4, blockedBy T2]: Async extraction spine — Supabase Edge Function worker on messages insert, taxonomy (AD-7) extraction → `difficulty_data`+`extraction_status`, idempotent(source_message_id)/retry/dead-letter, non-blocking.
  - T6 [worker-3, blockedBy T2,T5]: institutions seed + rule-based curation (AD-7 rules) + `/recommendations` UI + `recommendation_events` + institution_sharing consent gate UI.
  - T7 [worker-2, blockedBy T5]: aggregate-only admin metrics (service-role + admin authz) + quality-score computation (AD-7 sub-metrics).
  - T8 [worker-4, blockedBy T3,T4,T5,T6]: PWA finish + responsive QA + seed data + tests (RLS join, crisis paraphrase, consent withdrawal+cascade/anonymize, realname negative, extraction retry/idempotency) + E2E smoke.

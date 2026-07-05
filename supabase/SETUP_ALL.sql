-- 마음곁 MVP: 전체 DB 설정 (Supabase SQL Editor에 붙여넣고 Run)

-- =============================================================================
-- 0001_init.sql — 취준생 멘탈케어 MVP initial schema
-- Implements plan AD-3 (consent ledger), AD-4 (real_name write guard),
-- AD-5 (per-table RLS), AD-6 (disk-level at-rest encryption is managed by
-- Supabase; no column encryption so North-star analytics stay queryable).
--
-- Apply order: extensions -> enums -> tables -> view -> RLS -> triggers -> seed.
-- Down script: supabase/migrations/0001_init.down.sql (reverse dependency order).
-- =============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- Enumerated types
-- -----------------------------------------------------------------------------

-- AD-3: three separable consent scopes.
create type consent_scope as enum (
  'ai_processing',        -- cross-border processing by Claude (Anthropic/US)
  'data_storage',         -- persistence of sensitive difficulty data
  'institution_sharing'   -- de-pseudonymization + sharing with institutions
);

-- AD-3: append-only ledger records grant/revoke transitions.
create type consent_action as enum ('grant', 'revoke');

create type message_role as enum ('user', 'assistant', 'system');

-- AD-7 v1 difficulty taxonomy (enumerated for testability).
create type difficulty_category as enum (
  'career_anxiety',
  'financial_stress',
  'social_isolation',
  'self_worth',
  'sleep_health',
  'family_pressure',
  'burnout',
  'uncertainty_future',
  'other'
);

-- AD-1: async extraction spine lifecycle states.
create type extraction_state as enum ('queued', 'running', 'done', 'failed');

-- AC-10: recommendation acceptance signals.
create type recommendation_action as enum ('viewed', 'saved', 'dismissed');

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

-- profiles: 1:1 with auth.users. Pseudonymous by default; real_name stays NULL
-- until an active institution_sharing consent exists (enforced by AD-4 trigger).
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  pseudonym    text,
  real_name    text default null,          -- AD-4 guarded write
  age_verified boolean not null default false, -- AD-8 adult-only age gate (self-attested)
  created_at   timestamptz not null default now()
);

-- conversations: owned by a user. Deleting the account hard-deletes these (AC-14).
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- messages: NO user_id column by design (AD-5). Ownership is derived through the
-- parent conversation, so RLS uses an EXISTS join on conversations.
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role            message_role not null,
  content         text not null,
  created_at      timestamptz not null default now()
);
create index idx_messages_conversation on messages (conversation_id);

-- difficulty_data: structured extraction output. source_message_id is the AD-1
-- idempotency key (UNIQUE) so the worker never double-inserts for one message.
create table difficulty_data (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  category          difficulty_category not null,
  intensity         int not null check (intensity between 1 and 5), -- AD-7: 1=경미 5=심각
  context           text,
  source_message_id uuid unique references messages (id) on delete cascade,
  created_at        timestamptz not null default now()
);
create index idx_difficulty_user on difficulty_data (user_id);

-- emotional_states: lightweight time series of inferred affect.
create table emotional_states (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  anxiety_level   smallint,
  isolation_level smallint,
  at              timestamptz not null default now()
);
create index idx_emotional_user on emotional_states (user_id);

-- routines: simple habit/streak tracking.
create table routines (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  activity    text not null,
  streak_days int not null default 0
);
create index idx_routines_user on routines (user_id);

-- consent_events (AD-3): APPEND-ONLY ledger. No updates/deletes in normal flow.
-- On account deletion user_id is SET NULL (anonymized, RC-2) — never hard-deleted,
-- to preserve legal proof of consent.
create table consent_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete set null,
  scope          consent_scope not null,
  action         consent_action not null,
  policy_version text not null,
  occurred_at    timestamptz not null default now(),
  source         text -- e.g. 'onboarding', 'settings', 'withdrawal'
);
create index idx_consent_user_scope on consent_events (user_id, scope, occurred_at desc);

-- crisis_events (AD-2): safety logging. On account deletion, user_id + message_id
-- are SET NULL (anonymized, RC-2) — preserved for duty-of-care, never hard-deleted.
create table crisis_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  message_id  uuid references messages (id) on delete set null,
  severity    text not null, -- classifier output, e.g. low|medium|high
  detected_at timestamptz not null default now()
);
create index idx_crisis_user on crisis_events (user_id);

-- institutions: public seed data (public read, no user scope).
create table institutions (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  name        text not null,
  public_info jsonb not null default '{}'::jsonb
);

-- curated_matches: rule-based curation output per user.
create table curated_matches (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  institution_id uuid not null references institutions (id) on delete cascade,
  score          real,
  rationale      text,
  created_at     timestamptz not null default now()
);
create index idx_curated_user on curated_matches (user_id);

-- recommendation_events (AC-10): acceptance/interaction logging.
create table recommendation_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  institution_id uuid not null references institutions (id) on delete cascade,
  action         recommendation_action not null,
  at             timestamptz not null default now()
);
create index idx_recevent_user on recommendation_events (user_id);

-- extraction_status (AD-1): one row per message; service-role only (no user RLS).
create table extraction_status (
  message_id uuid primary key references messages (id) on delete cascade,
  state      extraction_state not null default 'queued',
  attempts   int not null default 0,
  error      text,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- current_consents view (AD-3): derive latest state per (user_id, scope) from the
-- append-only ledger. security_invoker=on so app queries respect consent_events
-- RLS; the AD-4 trigger (SECURITY DEFINER) reads it as owner regardless.
-- action = 'grant' on the latest row means the consent is currently ACTIVE.
-- -----------------------------------------------------------------------------
create view current_consents
with (security_invoker = on) as
select distinct on (user_id, scope)
  user_id,
  scope,
  action,
  policy_version,
  occurred_at
from consent_events
where user_id is not null
order by user_id, scope, occurred_at desc, id desc;

-- =============================================================================
-- Row Level Security (AD-5)
-- =============================================================================
alter table profiles              enable row level security;
alter table conversations         enable row level security;
alter table messages              enable row level security;
alter table difficulty_data       enable row level security;
alter table emotional_states      enable row level security;
alter table routines              enable row level security;
alter table consent_events        enable row level security;
alter table crisis_events         enable row level security;
alter table institutions          enable row level security;
alter table curated_matches       enable row level security;
alter table recommendation_events enable row level security;
alter table extraction_status     enable row level security;

-- profiles: owner is the row id itself (= auth.uid()).
create policy profiles_self on profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Straightforward user_id = auth.uid() ownership tables.
create policy conversations_self on conversations
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy difficulty_self on difficulty_data
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy emotional_self on emotional_states
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy routines_self on routines
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy consent_self on consent_events
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy crisis_self on crisis_events
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy curated_self on curated_matches
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy recevent_self on recommendation_events
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages: no user_id — derive ownership via the parent conversation (AD-5).
create policy messages_via_conversation on messages
  for all to authenticated
  using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- institutions: public read; writes reserved for service-role (seed/admin).
create policy institutions_public_read on institutions
  for select to anon, authenticated
  using (true);

-- extraction_status: RLS enabled with NO user policy => default deny for all
-- normal roles. Only the service_role (which bypasses RLS) may touch it (AD-5).

-- =============================================================================
-- AD-4: real_name write guard
-- CHECK constraints cannot cross-reference other tables, so a BEFORE trigger
-- with SECURITY DEFINER validates against current_consents. Blocks writing a
-- non-null real_name unless an active institution_sharing grant exists.
-- =============================================================================
create or replace function guard_realname()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.real_name is not null then
    if not exists (
      select 1
      from current_consents cc
      where cc.user_id = new.id
        and cc.scope = 'institution_sharing'
        and cc.action = 'grant'
    ) then
      raise exception
        'real_name write blocked: active institution_sharing consent required (AD-4)'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_guard_realname
  before insert or update on profiles
  for each row
  execute function guard_realname();

-- =============================================================================
-- Seed: public institutions (crisis hotlines + public services). Safe to expose.
-- =============================================================================
insert into institutions (type, name, public_info) values
  ('hotline', '자살예방상담전화', '{"phone":"109","hours":"24h","desc":"자살·정신건강 위기 상담"}'::jsonb),
  ('hotline', '정신건강위기상담전화', '{"phone":"1577-0199","hours":"24h","desc":"정신건강 위기 상담"}'::jsonb),
  ('public_service', '청년센터 (온통청년)', '{"url":"https://www.youthcenter.go.kr","desc":"청년 정책·일자리·복지 통합 정보"}'::jsonb),
  ('public_service', '워크넷 (고용노동부)', '{"url":"https://www.work.go.kr","desc":"채용정보·직업상담·취업지원"}'::jsonb);

-- ===== 0002 추출 트리거 =====
-- =============================================================================
-- 0002_extraction_trigger.sql — AD-1 async extraction spine: trigger side.
--
-- Mechanism chosen: pg trigger + pg_net (NOT a Database Webhook configured via
-- dashboard) so the whole spine is expressible as SQL and reviewable in-repo.
-- `net.http_post` queues an async HTTP request via a background worker and
-- returns immediately — the calling `INSERT INTO messages` is never blocked
-- waiting on the Edge Function (Principle 1 / AD-1 "never block the stream").
--
-- Flow: messages INSERT (role='user')
--         -> trg_enqueue_extraction (AFTER INSERT trigger)
--              -> extraction_status row seeded state='queued' (idempotent)
--              -> call_extraction_worker(): fire-and-forget net.http_post to
--                 the extract-difficulty Edge Function, wrapped so ANY error
--                 (bad config, network) is swallowed and never propagates
--                 back to the INSERT.
--
-- Retry/backoff + dead-letter (AD-1 idempotency requirement):
--   The Edge Function itself does in-process retry with backoff for a single
--   invocation (transient Claude API errors). For failures that survive that
--   (or a crashed invocation), `reenqueue_stale_extractions()` re-fires stale
--   'queued' rows with exponential backoff based on `attempts`, up to
--   `p_max_attempts` (default 5) — after which the Edge Function marks the row
--   state='failed' (dead-letter) and stops retrying. Wire this sweep to a
--   pg_cron schedule post-deploy (see commented example at the bottom) — not
--   enabled here because pg_cron availability/scheduling is an ops decision
--   and the Edge Function is not deployed in this environment.
--
-- Apply order: extension -> config table -> shared caller fn -> trigger fn ->
-- trigger -> retry-sweep fn.
-- Down script: supabase/migrations/0002_extraction_trigger.down.sql
-- =============================================================================

create extension if not exists pg_net;

-- -----------------------------------------------------------------------------
-- extraction_config: holds the deployed Edge Function URL + a bearer secret
-- used to authorize the pg_net call. RLS enabled with NO policies -> default
-- deny for anon/authenticated; only service_role (bypasses RLS) or the
-- SECURITY DEFINER functions below (owned by the migration role) can read it.
--
-- ASSUMPTION: values start NULL. The Edge Function is not deployed in this
-- environment (per task scope), so ops must populate these two rows after
-- `supabase functions deploy extract-difficulty`:
--   update extraction_config set value = 'https://<project-ref>.functions.supabase.co/extract-difficulty' where key = 'edge_function_url';
--   update extraction_config set value = '<service_role_or_function_secret>' where key = 'service_role_key';
-- Until then, call_extraction_worker() is a documented no-op (see below) so
-- chat inserts are unaffected either way.
-- -----------------------------------------------------------------------------
create table extraction_config (
  key   text primary key,
  value text
);
alter table extraction_config enable row level security;

insert into extraction_config (key, value) values
  ('edge_function_url', null),
  ('service_role_key', null)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- call_extraction_worker: shared fire-and-forget caller used by both the
-- insert trigger and the retry sweep. Never raises — any failure (missing
-- config, network) is swallowed so it can never block a chat write.
-- -----------------------------------------------------------------------------
create or replace function call_extraction_worker(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  select value into v_url from extraction_config where key = 'edge_function_url';
  select value into v_key from extraction_config where key = 'service_role_key';

  if v_url is null or v_url = '' then
    -- Not configured yet (e.g. Edge Function not deployed). No-op by design.
    return;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_key, '')
    ),
    body := jsonb_build_object('source_message_id', p_message_id)
  );
exception when others then
  -- Swallow: enqueue must never block the chat insert/stream (Principle 1).
  null;
end;
$$;

-- -----------------------------------------------------------------------------
-- trg_enqueue_extraction: AFTER INSERT trigger body. Seeds extraction_status
-- idempotently (message_id is the primary key / idempotency key, AD-1) then
-- asynchronously kicks the worker.
-- -----------------------------------------------------------------------------
create or replace function trg_enqueue_extraction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into extraction_status (message_id, state)
  values (new.id, 'queued')
  on conflict (message_id) do nothing;

  perform call_extraction_worker(new.id);

  return new;
end;
$$;

-- Only fires for user messages — assistant/system messages are never mined.
create trigger trg_messages_enqueue_extraction
  after insert on messages
  for each row
  when (new.role = 'user')
  execute function trg_enqueue_extraction();

-- -----------------------------------------------------------------------------
-- reenqueue_stale_extractions: cross-invocation retry with exponential
-- backoff. Picks up rows the Edge Function put back to 'queued' after a
-- failed attempt (attempts>0, i.e. not the initial enqueue) once enough time
-- (2^attempts minutes) has passed, and re-fires the worker. Rows that hit
-- p_max_attempts are moved to state='failed' (dead-letter) by the Edge
-- Function itself, not here, so this function only ever touches retryable
-- rows.
-- -----------------------------------------------------------------------------
create or replace function reenqueue_stale_extractions(p_max_attempts int default 5)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count int := 0;
begin
  for r in
    select message_id
    from extraction_status
    where state = 'queued'
      and attempts > 0
      and attempts < p_max_attempts
      and updated_at < now() - (power(2, attempts) * interval '1 minute')
  loop
    perform call_extraction_worker(r.message_id);
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Optional ops step (not run here — pg_cron enablement/scheduling is an infra
-- decision, and the Edge Function is not deployed in this environment):
--   create extension if not exists pg_cron;
--   select cron.schedule(
--     'extraction-retry-sweep',
--     '*/5 * * * *',
--     $$select reenqueue_stale_extractions();$$
--   );

-- ===== 0003 기관 시드 =====
-- =============================================================================
-- 0003_institutions_seed.sql — AD-7 category-mapped public institution catalog
-- for rule-based curation (Phase 4 / AC-9).
--
-- Adds `institutions.categories` (difficulty_category[]) so lib/match/curate.ts
-- can rank public institutions/policy info against a user's accumulated
-- difficulty_data without any additional join table. All rows here are public
-- information only (hotline numbers, public agency URLs/descriptions) — no
-- institution partnership, no real-name/identity data (AD-4 unaffected).
--
-- Apply order: alter table -> backfill existing 0001 seed rows -> insert new
-- rows covering the remaining AD-7 categories.
-- Down script: supabase/migrations/0003_institutions_seed.down.sql
-- =============================================================================

alter table institutions
  add column if not exists categories difficulty_category[] not null default '{}';

-- Index to support category-overlap lookups if curation ever moves server-side
-- (current MVP curates client/server-side in TS after a full-table read).
create index if not exists idx_institutions_categories on institutions using gin (categories);

-- -----------------------------------------------------------------------------
-- Backfill categories for the 4 rows seeded in 0001_init.sql.
-- Hotlines are crisis-oriented and broadly relevant across acute-distress
-- categories; public_service rows map to their actual policy domain.
-- -----------------------------------------------------------------------------
update institutions set categories = array[
  'self_worth', 'burnout', 'social_isolation', 'sleep_health', 'other'
]::difficulty_category[]
where name = '자살예방상담전화';

update institutions set categories = array[
  'self_worth', 'burnout', 'social_isolation', 'sleep_health', 'other'
]::difficulty_category[]
where name = '정신건강위기상담전화';

update institutions set categories = array[
  'career_anxiety', 'financial_stress', 'uncertainty_future', 'social_isolation'
]::difficulty_category[]
where name = '청년센터 (온통청년)';

update institutions set categories = array[
  'career_anxiety', 'financial_stress', 'uncertainty_future'
]::difficulty_category[]
where name = '워크넷 (고용노동부)';

-- -----------------------------------------------------------------------------
-- New public/curated rows covering the remaining AD-7 categories
-- (social_isolation, self_worth, sleep_health, family_pressure, burnout are
-- already partially covered above; these add dedicated coverage + career).
-- Public info only: agency name, official URL/phone, short description.
-- -----------------------------------------------------------------------------
insert into institutions (type, name, public_info, categories) values
  (
    'public_service',
    '국가정신건강정보포털 (보건복지부)',
    '{"url":"https://www.mentalhealth.go.kr","desc":"정신건강 정보, 지역 정신건강복지센터 안내, 자가검진"}'::jsonb,
    array['self_worth', 'burnout', 'sleep_health', 'social_isolation', 'other']::difficulty_category[]
  ),
  (
    'public_service',
    '복지로 (보건복지부)',
    '{"url":"https://www.bokjiro.go.kr","desc":"복지서비스 통합 안내·모의계산·신청"}'::jsonb,
    array['financial_stress', 'family_pressure']::difficulty_category[]
  ),
  (
    'public_service',
    '커리어넷 (한국직업능력연구원)',
    '{"url":"https://www.career.go.kr","desc":"진로·직업 정보, 심리검사, 진로상담"}'::jsonb,
    array['career_anxiety', 'uncertainty_future']::difficulty_category[]
  ),
  (
    'public_service',
    '가족센터 (여성가족부)',
    '{"url":"https://www.familynet.or.kr","desc":"가족관계 상담, 가족교육 프로그램 안내"}'::jsonb,
    array['family_pressure']::difficulty_category[]
  ),
  (
    'public_service',
    '근로복지넷 (근로복지공단)',
    '{"url":"https://www.workdream.net","desc":"근로자 마음건강·EAP 지원사업 안내"}'::jsonb,
    array['burnout', 'financial_stress']::difficulty_category[]
  );

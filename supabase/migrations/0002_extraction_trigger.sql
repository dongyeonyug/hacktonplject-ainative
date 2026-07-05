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

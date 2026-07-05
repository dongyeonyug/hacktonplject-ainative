-- =============================================================================
-- 001_rls_isolation.test.sql — AD-5 RLS: user A cannot read user B's rows,
-- including `messages` (which has no user_id column and is scoped via the
-- parent `conversations` row, plan Verification Step 2).
--
-- Requires pgTAP (`create extension pgtap;`) and a full local Supabase stack
-- (auth schema + 0001/0002/0003 migrations applied). See supabase/tests/README.md.
-- =============================================================================
begin;
select plan(9);

-- ---------------------------------------------------------------------------
-- Fixtures: two users, one conversation + message each.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-a@test.local', 'x', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-b@test.local', 'x', now(), now(), now());

insert into public.profiles (id, pseudonym, age_verified) values
  ('11111111-1111-1111-1111-111111111111', 'user-a', true),
  ('22222222-2222-2222-2222-222222222222', 'user-b', true);

insert into public.conversations (id, user_id) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222');

insert into public.messages (id, conversation_id, role, content) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user', 'hello from A'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user', 'hello from B');

insert into public.difficulty_data (id, user_id, category, intensity, context, source_message_id) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'career_anxiety', 3, 'A context', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', 'burnout', 4, 'B context', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- ---------------------------------------------------------------------------
-- As user A: can see own rows only.
-- ---------------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select results_eq(
  $$ select count(*)::int from public.conversations $$,
  $$ values (1) $$,
  'user A sees exactly 1 conversation (their own)'
);

select results_eq(
  $$ select id::text from public.conversations $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'user A''s visible conversation is their own row'
);

-- messages has NO user_id column: ownership derives via the conversations join
-- (AD-5). This is the critical path the plan calls out by name.
select results_eq(
  $$ select count(*)::int from public.messages $$,
  $$ values (1) $$,
  'user A sees exactly 1 message via the conversations join, not user B''s'
);

select is_empty(
  $$ select 1 from public.messages where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' $$,
  'user A cannot read user B''s message by id (messages-via-conversation RLS)'
);

select is_empty(
  $$ select 1 from public.difficulty_data where user_id = '22222222-2222-2222-2222-222222222222' $$,
  'user A cannot read user B''s difficulty_data rows'
);

-- Cross-user UPDATE must not affect user B's row (USING clause filters it out
-- of the UPDATE's row set entirely; RLS does not raise, it just matches zero
-- rows). Attempt it as user A, then verify — as user B, who can actually see
-- the row — that its content is unchanged (a same-user re-select would be
-- vacuously empty either way since A can't see B's row regardless).
update public.messages set content = 'tampered' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

-- ---------------------------------------------------------------------------
-- As user B: symmetric isolation.
-- ---------------------------------------------------------------------------
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select results_eq(
  $$ select count(*)::int from public.messages $$,
  $$ values (1) $$,
  'user B sees exactly 1 message via the conversations join, not user A''s'
);

select is_empty(
  $$ select 1 from public.messages where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'user B cannot read user A''s message by id'
);

select is(
  (select content from public.messages where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'hello from B',
  'user A''s cross-user UPDATE attempt did not tamper with user B''s message content'
);

-- ---------------------------------------------------------------------------
-- anon (no jwt claims at all): default deny across the board.
-- ---------------------------------------------------------------------------
reset request.jwt.claims;
set local role anon;

select results_eq(
  $$ select count(*)::int from public.conversations $$,
  $$ values (0) $$,
  'anon role sees zero conversations (no policy grants anon access)'
);

select finish();
rollback;

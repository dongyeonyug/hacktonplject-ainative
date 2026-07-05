-- =============================================================================
-- 003_consent_withdrawal_and_deletion.test.sql — AD-3/AC-14 (plan Verification
-- Step 4): consent withdrawal updates `current_consents`, and account deletion
-- hard-deletes ordinary sensitive tables via `on delete cascade` from
-- auth.users, EXCEPT `consent_events`/`crisis_events` which are anonymized via
-- `on delete set null` (RC-2 exception — legal retention of consent proof and
-- duty-of-care crisis logs, not a hard delete / not the "right to be
-- forgotten" cascade).
-- =============================================================================
begin;
select plan(12);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-d@test.local', 'x', now(), now(), now());

insert into public.profiles (id, pseudonym, age_verified)
values ('44444444-4444-4444-4444-444444444444', 'user-d', true);

insert into public.conversations (id, user_id)
values ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444');

insert into public.messages (id, conversation_id, role, content)
values ('66666666-6666-6666-6666-666666666666', '55555555-5555-5555-5555-555555555555', 'user', 'i feel hopeless sometimes');

insert into public.difficulty_data (id, user_id, category, intensity, context, source_message_id)
values ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'burnout', 4, 'context', '66666666-6666-6666-6666-666666666666');

insert into public.routines (id, user_id, activity, streak_days)
values ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 'morning walk', 3);

insert into public.recommendation_events (id, user_id, institution_id, action)
values (
  '99999999-9999-9999-9999-999999999999',
  '44444444-4444-4444-4444-444444444444',
  (select id from public.institutions limit 1),
  'viewed'
);

insert into public.consent_events (id, user_id, scope, action, policy_version, source)
values ('aaaaaaaa-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'ai_processing', 'grant', 'v1', 'onboarding');

insert into public.crisis_events (id, user_id, message_id, severity)
values ('bbbbbbbb-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', 'low');

-- ---------------------------------------------------------------------------
-- Consent withdrawal: append a revoke event; current_consents (latest-wins
-- derived view) must reflect it immediately, without mutating the ledger.
-- ---------------------------------------------------------------------------
insert into public.consent_events (user_id, scope, action, policy_version, source)
values ('44444444-4444-4444-4444-444444444444', 'ai_processing', 'revoke', 'v1', 'settings');

select is(
  (select action::text from public.current_consents where user_id = '44444444-4444-4444-4444-444444444444' and scope = 'ai_processing'),
  'revoke',
  'current_consents reflects the latest revoke action after withdrawal (append-only ledger)'
);

select results_eq(
  $$ select count(*)::int from public.consent_events where user_id = '44444444-4444-4444-4444-444444444444' and scope = 'ai_processing' $$,
  $$ values (2) $$,
  'withdrawal appends a new ledger row rather than mutating the original grant (append-only, AD-3)'
);

-- ---------------------------------------------------------------------------
-- Account deletion: delete the auth.users row and let FK actions cascade.
-- ---------------------------------------------------------------------------
delete from auth.users where id = '44444444-4444-4444-4444-444444444444';

-- Hard-deleted (on delete cascade), per AC-14 main rule.
select is_empty(
  $$ select 1 from public.conversations where user_id = '44444444-4444-4444-4444-444444444444' $$,
  'conversations are hard-deleted (cascade) on account deletion'
);

select is_empty(
  $$ select 1 from public.messages where id = '66666666-6666-6666-6666-666666666666' $$,
  'messages are hard-deleted (cascade via parent conversation) on account deletion'
);

select is_empty(
  $$ select 1 from public.difficulty_data where user_id = '44444444-4444-4444-4444-444444444444' $$,
  'difficulty_data is hard-deleted (cascade) on account deletion'
);

select is_empty(
  $$ select 1 from public.routines where user_id = '44444444-4444-4444-4444-444444444444' $$,
  'routines are hard-deleted (cascade) on account deletion'
);

select is_empty(
  $$ select 1 from public.recommendation_events where user_id = '44444444-4444-4444-4444-444444444444' $$,
  'recommendation_events are hard-deleted (cascade) on account deletion'
);

-- RC-2 exception: consent_events / crisis_events are PRESERVED (not deleted)
-- but anonymized — user_id (and crisis_events.message_id) set to NULL.
select isnt_empty(
  $$ select 1 from public.consent_events where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'consent_events row is preserved (NOT hard-deleted) after account deletion — legal retention (RC-2)'
);

select is(
  (select user_id from public.consent_events where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  null,
  'consent_events.user_id is anonymized (SET NULL) after account deletion'
);

select isnt_empty(
  $$ select 1 from public.crisis_events where id = 'bbbbbbbb-0000-0000-0000-000000000002' $$,
  'crisis_events row is preserved (NOT hard-deleted) after account deletion — duty-of-care retention (RC-2)'
);

select is(
  (select user_id from public.crisis_events where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  null,
  'crisis_events.user_id is anonymized (SET NULL) after account deletion'
);

select is(
  (select message_id from public.crisis_events where id = 'bbbbbbbb-0000-0000-0000-000000000002'),
  null,
  'crisis_events.message_id is anonymized (SET NULL) after account deletion (its message was hard-deleted)'
);

select finish();
rollback;

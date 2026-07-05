-- =============================================================================
-- 002_realname_guard.test.sql — AD-4 real_name write guard (SECURITY DEFINER
-- trigger `guard_realname`). NEGATIVE test (plan Verification Step 5): writing
-- `profiles.real_name` without an active `institution_sharing` grant must be
-- rejected, then succeed once that consent is granted.
--
-- Runs as a privileged role (postgres/service_role) since the trigger itself
-- is what enforces the business rule here, independent of RLS — the guard
-- must hold even for direct/service-role writes, not just RLS-scoped ones.
-- =============================================================================
begin;
select plan(6);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user-c@test.local', 'x', now(), now(), now());

insert into public.profiles (id, pseudonym, age_verified)
values ('33333333-3333-3333-3333-333333333333', 'user-c', true);

-- Sanity: real_name defaults to NULL (AC-1 pseudonymous-by-default).
select is(
  (select real_name from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  null,
  'profiles.real_name is NULL by default (no consent yet)'
);

-- NEGATIVE: no active institution_sharing grant exists yet -> blocked.
select throws_ok(
  $$ update public.profiles set real_name = '홍길동' where id = '33333333-3333-3333-3333-333333333333' $$,
  '23514',
  'real_name write blocked: active institution_sharing consent required (AD-4)',
  'writing real_name without an active institution_sharing consent is rejected by guard_realname'
);

select is(
  (select real_name from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  null,
  'real_name remains NULL after the rejected write (trigger raised before commit of that statement)'
);

-- A revoked (not active) grant must still block the write.
insert into public.consent_events (user_id, scope, action, policy_version, source)
values ('33333333-3333-3333-3333-333333333333', 'institution_sharing', 'grant', 'v1', 'test');
insert into public.consent_events (user_id, scope, action, policy_version, source)
values ('33333333-3333-3333-3333-333333333333', 'institution_sharing', 'revoke', 'v1', 'test');

select throws_ok(
  $$ update public.profiles set real_name = '홍길동' where id = '33333333-3333-3333-3333-333333333333' $$,
  '23514',
  'real_name write blocked: active institution_sharing consent required (AD-4)',
  'a REVOKED institution_sharing consent (not currently active) still blocks the real_name write'
);

-- Grant an active institution_sharing consent -> write must now succeed.
insert into public.consent_events (user_id, scope, action, policy_version, source)
values ('33333333-3333-3333-3333-333333333333', 'institution_sharing', 'grant', 'v1', 'test');

select lives_ok(
  $$ update public.profiles set real_name = '홍길동' where id = '33333333-3333-3333-3333-333333333333' $$,
  'real_name write succeeds once an active institution_sharing grant exists'
);

select is(
  (select real_name from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  '홍길동',
  'profiles.real_name reflects the guarded write after consent grant'
);

select finish();
rollback;

# Database tests (pgTAP)

These are **SQL-level tests that require a real Postgres instance with the
Supabase `auth` schema and this project's migrations applied**. They cannot
run in this sandbox (no live Supabase project / no `psql` reachable here), so
they are written to run standalone once a database is provisioned, and are
intentionally **not** part of `npm test` (which only runs the pure-function
Vitest unit tests in `lib/**/__tests__`).

## What's covered

| File | Plan requirement (from the work plan) | Covers |
|---|---|---|
| `database/001_rls_isolation.test.sql` | Verification Step 2 | `messages`, `conversations`, `difficulty_data` RLS: user A cannot read/tamper with user B's rows, including the `messages` table's conversation-join policy (AD-5). Also checks `anon` default-deny. |
| `database/002_realname_guard.test.sql` | Verification Step 5 (voice/negative test) | AD-4 `guard_realname` trigger: writing `profiles.real_name` is rejected without an **active** `institution_sharing` grant (including the "revoked, so not active" case), and succeeds once granted. |
| `database/003_consent_withdrawal_and_deletion.test.sql` | Verification Step 4 | AD-3 consent withdrawal (`current_consents` reflects the latest ledger row); account deletion hard-deletes `conversations/messages/difficulty_data/routines/recommendation_events` via cascade, but **anonymizes** (`user_id`/`message_id` → NULL) rather than hard-deletes `consent_events`/`crisis_events` (RC-2 legal-retention exception). |

Each file is a self-contained pgTAP script (`begin; select plan(N); ... select
finish(); rollback;`) — the `rollback` at the end means running them leaves no
residue in your local dev database.

## Prerequisites

1. [Supabase CLI](https://supabase.com/docs/guides/cli) installed.
2. Local stack running: `supabase start` (spins up Postgres + the `auth`
   schema + GoTrue, etc., in Docker).
3. Migrations applied: `supabase db reset` (applies
   `supabase/migrations/0001_init.sql`, `0002_extraction_trigger.sql`,
   `0003_institutions_seed.sql` in order against a fresh local database).
4. The `pgtap` extension available. Either:
   - add `create extension if not exists pgtap;` to a throwaway
     `supabase/seed.sql` / run it once via `psql`, or
   - run via the Supabase CLI's built-in test runner, which enables it for you
     (see below).

## Running

**Option A — Supabase CLI (recommended):**

```bash
supabase test db
```

This resets the DB, applies all migrations, enables `pgtap`, and runs every
`*.sql` file under `supabase/tests/database/` as a pgTAP suite, printing a TAP
report per file.

**Option B — `pg_prove` directly against a running local stack:**

```bash
supabase start
supabase db reset
psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" -c "create extension if not exists pgtap;"
pg_prove -d "$(supabase status -o env | grep DB_URL | cut -d= -f2)" supabase/tests/database/*.sql
```

**Option C — plain `psql` (no TAP formatting, just pass/fail per assertion):**

```bash
psql "$DB_URL" -f supabase/tests/database/001_rls_isolation.test.sql
psql "$DB_URL" -f supabase/tests/database/002_realname_guard.test.sql
psql "$DB_URL" -f supabase/tests/database/003_consent_withdrawal_and_deletion.test.sql
```

## Notes / assumptions

- Tests insert directly into `auth.users` with the minimal column set needed
  for RLS's `auth.uid()` (which reads `request.jwt.claims->>sub`) to resolve;
  they don't exercise the GoTrue signup flow itself.
- RLS tests simulate an authenticated request by `set local role authenticated;
  set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';`
  inside the same transaction — the standard pgTAP/Supabase pattern for RLS
  testing without a real JWT.
- All fixture UUIDs are hardcoded (not `gen_random_uuid()`) so later
  assertions can reference them directly without capturing generated ids.
- Not covered here (out of T8 scope per the work plan's DB-test list, but
  worth flagging as a gap): AD-1 extraction-pipeline retry/idempotency
  (`reenqueue_stale_extractions`, `extraction_status` dead-lettering) has no
  automated test yet — plan Verification Step 6 remains open.

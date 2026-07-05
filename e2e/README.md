# E2E smoke tests (Playwright)

`smoke.spec.ts` drives the full help-first funnel end to end (plan
Verification Step 8 / Expanded Test Plan "E2E" row):

```
sign up (pseudonymous) -> age gate (AC-15) -> ai_processing consent (AC-13)
  -> chat (AC-2/AC-4/AC-12) -> recommendations (AC-9)
```

plus two guard-rail specs: the minor self-attestation block, and confirming
the consent gate isn't bypassable by direct navigation.

## Why this can't run in CI/this sandbox as-is

This app has **no test doubles for Supabase or Anthropic** — the chat step
calls the real `/api/chat` route, which calls the real Claude API, and every
step reads/writes real Supabase tables. Per T8 scope, this suite intentionally
does **not** mock those out to force a green run; doing so would hide real
integration bugs behind a fake pass. Instead:

- The whole suite `test.skip()`s with a clear reason when
  `NEXT_PUBLIC_SUPABASE_URL` (and `E2E_BASE_URL`, for a hosted target) aren't
  set, so CI reports "skipped", not a fabricated pass.
- There is no live Supabase project or `ANTHROPIC_API_KEY` available in this
  development sandbox, so it has not been run here.

## Prerequisites to actually run it

1. A **dedicated test** Supabase project (do not point this at production
   data) with:
   - Migrations applied: `supabase db reset` (or push `0001`–`0003` to a
     hosted project).
   - **Email confirmations disabled** for Auth (Authentication → Providers →
     Email → "Confirm email" off), so `signUp()` returns a live session
     immediately instead of requiring a real inbox — `smoke.spec.ts` creates
     a fresh randomly-emailed user per run and expects to land straight on
     `/onboarding`.
2. `.env.local` populated (see `.env.local.example`) with that project's
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
   `SUPABASE_SERVICE_ROLE_KEY`, plus a real `ANTHROPIC_API_KEY` (the chat step
   needs a real completion to re-enable the send button).
3. Playwright browsers installed once: `npx playwright install --with-deps
   chromium`.

## Running

```bash
# Against a local `next dev` (playwright.config.ts starts it automatically):
npm run test:e2e

# Against an already-running/deployed instance:
E2E_BASE_URL=https://your-staging-url npm run test:e2e
```

Two projects run by default: `chromium` (desktop) and `mobile-375` (375px
viewport, iPhone SE preset) — the latter doubles as part of the AC-5
responsive pass since the same funnel must work at that width.

## Known gaps (documented, not silently skipped)

- No automated assertion on the AC-2 latency budget (first token < 1.5s, p95
  < 4s) — that requires a dedicated load-testing tool (e.g. k6/Artillery)
  hitting `/api/chat` directly, not a browser-driven functional spec. Plan
  Verification Step 7 remains open.
- The recommendations assertion accepts either populated cards or the empty
  state, since AD-1 extraction is asynchronous and a single fresh test user
  may not have accumulated `difficulty_data` yet within one run.
- PWA installability (manifest + service worker) is checked via Lighthouse,
  not Playwright — see the root `README.md` PWA section.

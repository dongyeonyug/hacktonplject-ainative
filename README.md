# 마음곁 · 취준생 멘탈케어 AI 동반자 (MVP)

A 24/7 AI companion (chatbot) for jobseekers' chronic anxiety and isolation.
Conversations are mined **entirely in the background** into structured
"difficulty" signals, which drive rule-based curation of public
institutions/policy info. See `.omc/plans/plan-jobseeker-mental-care.md` for
the full spec, architecture decisions (AD-1…AD-8), and acceptance criteria
(AC-1…AC-15) this codebase implements.

**MVP scope**: pseudonymous accounts, streaming AI chat, input-side crisis
detection + Korean hotline escalation, background difficulty extraction,
rule-based public-institution curation, consent ledger, PWA. Real
institution partnerships, live hand-off/de-pseudonymization, and job-matching
features are explicitly deferred to a second phase.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind v4 · Supabase (Postgres, Auth,
RLS, Edge Functions) · Anthropic Claude (chat + crisis classifier + background
extraction) · Vitest (unit) · Playwright (E2E) · pgTAP (DB-level tests).

## Setup

### 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-safe; protected by RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only**, bypasses RLS. Used by `lib/supabase/admin.ts` (admin metrics) and the extraction worker. Never expose to the client. |
| `ANTHROPIC_API_KEY` | Server-only. Used by `/api/chat` (companion + crisis classifier) and the `extract-difficulty` Edge Function. |
| `ADMIN_EMAILS` | Comma-separated, case-insensitive allowlist for the aggregate-only `/admin/metrics` dashboard (`lib/metrics/admin-auth.ts`) — an app-level check, not an `auth.uid()` RLS policy. |

### 2. Provision Supabase

```bash
supabase login
supabase link --project-ref <your-project-ref>   # or `supabase start` for local dev

# Apply migrations in order (schema + RLS + AD-1 spine + AD-3 consent ledger
# + AD-4 real_name guard trigger + AD-7 institution seed data):
supabase db push        # hosted project
# or, for local dev:
supabase db reset        # applies 0001_init.sql -> 0002_extraction_trigger.sql -> 0003_institutions_seed.sql
```

Each migration has a matching `*.down.sql` rollback script.

In your Auth provider settings, enable email/password (and optionally Google
OAuth — `signInWithOAuthAction` already wires a `google` provider).

### 3. Deploy the background extraction worker (AD-1)

The `messages` insert trigger (`0002_extraction_trigger.sql`) fire-and-forgets
an HTTP call to an Edge Function — it is a **documented no-op** until you:

```bash
supabase functions deploy extract-difficulty
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
```

then populate the DB-side config the trigger reads from:

```sql
update extraction_config set value = 'https://<project-ref>.functions.supabase.co/extract-difficulty'
  where key = 'edge_function_url';
update extraction_config set value = '<function-invoke-secret>'
  where key = 'service_role_key';
```

Optionally schedule the retry sweep (commented out at the bottom of
`0002_extraction_trigger.sql`):

```sql
create extension if not exists pg_cron;
select cron.schedule('extraction-retry-sweep', '*/5 * * * *',
  $$select reenqueue_stale_extractions();$$);
```

Until deployed, chat still works end-to-end — extraction/curation will simply
have no data to work with (`/recommendations` falls back to showing all
public institutions unscored, per `lib/match/curate.ts`).

## Running

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint
```

## Testing

Three tiers, matching the plan's Expanded Test Plan:

### Unit tests (Vitest) — pure logic, run in CI, no external services

```bash
npm test              # vitest run
npm run test:watch
npm run test:coverage
```

Covers the pure, framework-free modules that back the safety-critical and
North-star logic:

- `lib/safety/crisis-core.ts` — keyword paraphrase/euphemism matching,
  whitespace-insensitivity, and the fail-safe crisis-decision precedence
  (classifier failure never fails open to a normal response).
- `lib/extract/parse.ts` + `lib/extract/taxonomy.ts` — model-JSON → validated
  `difficulty_data` row mapping, including the "no difficulty" null case and
  taxonomy/intensity boundary validation.
- `lib/match/curate.ts` — curation ranking, the zero-signal fallback (show
  everything unscored), and category-overlap exclusion.
- `lib/metrics/quality.ts` — the AD-7 `quality = 0.4*coverage + 0.3*richness +
  0.3*consistency` formula, its sub-metrics, and the `QUALITY_TARGET` (0.6)
  boundary.

### Database tests (pgTAP) — require a provisioned Supabase instance

Located in `supabase/tests/database/*.sql`; **not** run by `npm test`. Cover
RLS isolation (including the `messages`-via-`conversations` join path), the
AD-4 real-name-write negative test, and AD-3/AC-14 consent
withdrawal + account-deletion cascade/anonymize semantics. See
`supabase/tests/README.md` for exact `supabase test db` / `pg_prove` commands
— they need `supabase start` + `supabase db reset` first.

### E2E smoke (Playwright) — require a configured Supabase project + Anthropic key

```bash
npm run test:e2e
```

`e2e/smoke.spec.ts` drives age gate → `ai_processing` consent → chat →
recommendations, plus the minor-block and consent-gate guard rails. It
`test.skip()`s cleanly (not a fake pass) when the target isn't configured —
see `e2e/README.md` for setup (a dedicated test Supabase project with email
confirmation disabled, plus a real `ANTHROPIC_API_KEY`).

### Not yet automated (documented gaps, not silently skipped)

- AC-2 latency budget (first token < 1.5s, p95 < 4s) needs a dedicated load
  test (k6/Artillery) against `/api/chat`, not a unit or browser test.
- AD-1 extraction retry/idempotency (`reenqueue_stale_extractions`,
  dead-lettering) has no automated test.

## PWA (AC-5)

- `public/manifest.json` — name, icons (192/512, `any maskable`), standalone
  display, theme/background color.
- `public/icons/icon-192.png` / `icon-512.png` — generated via
  `node scripts/generate-pwa-icons.mjs` (a dependency-free PNG encoder; solid
  brand-indigo background + centered white circle, safely inside the
  maskable-icon safe zone). Re-run that script if the design changes.
- `public/sw.js` — app-shell offline fallback. Deliberately never caches
  `/api/*` (chat/auth/sensitive responses always hit the network).
- `app/layout.tsx` sets the manifest link + viewport + `appleWebApp` metadata;
  `app/service-worker-register.tsx` registers `/sw.js` client-side.
- Verify installability with Lighthouse (Chrome DevTools → Lighthouse → PWA)
  against a `next build && next start` production server (service workers
  need HTTPS or `localhost`).

### Responsive pass

Reviewed every route (`/`, `/sign-in`, `/sign-up`, `/onboarding`, `/consent`,
`/chat`, `/recommendations`, `/admin/metrics`) at ≤375px (iPhone SE width) and
desktop. All pages already use mobile-first Tailwind (`max-w-*` + `mx-auto`
containers, `px-*` padding, `flex-col sm:flex-row` / `grid-cols-1 sm:grid-cols-*`
breakpoints, `min-h-dvh`/`h-dvh`); no fixed pixel widths or horizontal-overflow
patterns were found (`playwright.config.ts` includes a dedicated 375px
project for the E2E smoke spec so this stays checked going forward).

## Safety & compliance notes (non-negotiable, do not weaken without updating the plan)

- **Crisis detection (AD-2 / AC-12)**: every user message is checked by a fast
  classifier + a keyword fallback (`lib/safety/crisis-core.ts`) *before* the
  companion responds. If the classifier errors/times out, the code **fails
  safe** — it shows the hotline card rather than silently returning a normal
  response. There is no human crisis responder in the MVP; hotlines are the
  terminal escalation, and the UI says so explicitly.
- **Cross-border transfer consent (AC-13)**: chat is blocked in
  `app/onboarding` until the user explicitly grants `ai_processing` consent,
  which discloses that messages are sent to Anthropic (US) — required before
  message #1 is ever sent.
- **Consent ledger (AD-3)**: `consent_events` is append-only; current state is
  derived via the `current_consents` view. Withdrawal appends a `revoke` row,
  it never mutates history.
- **Real-name guard (AD-4)**: `profiles.real_name` can only be written when an
  *active* `institution_sharing` grant exists, enforced by a
  `SECURITY DEFINER` Postgres trigger (`guard_realname`) — not just app-layer
  logic, so it holds even for direct/service-role writes.
- **Deletion vs. retention (AC-14 / RC-2)**: account deletion hard-deletes
  `conversations/messages/difficulty_data/emotional_states/routines/
  recommendation_events`. `consent_events` and `crisis_events` are the
  deliberate exception — anonymized (`user_id`/`message_id` → `NULL`) rather
  than hard-deleted, to preserve legal proof of consent and duty-of-care
  crisis logs.
- **Adults only (AD-8 / AC-15)**: onboarding age-gates on self-attestation
  (no ID verification in MVP — an accepted residual risk documented in the
  plan). A "no" answer never sets `age_verified` and routes to a block screen
  with hotline info, never to chat.
- **RLS (AD-5)**: every user-scoped table enforces `user_id = auth.uid()`;
  `messages` (no `user_id` column) is scoped via an `EXISTS` join through its
  parent `conversations` row; `extraction_status` has RLS enabled with **no**
  user policy (service-role only, default deny).
- **Encryption (AD-6)**: relies on Supabase's disk/volume-level at-rest
  encryption. Column-level encryption was deliberately not used, since it
  would break the aggregate quality/quantity queries that are this product's
  North-star metric.
- **Admin dashboard (AD-5)**: `/admin/metrics` is aggregate-only — no
  per-user drill-down, no raw context/message text — gated by an app-level
  `ADMIN_EMAILS` allowlist (`lib/metrics/admin-auth.ts`), not RLS.

## Known issues found during T8 (reported, not silently rewritten)

- `app/page.tsx` links to `/journal` (`내 기록 보기`), but no `app/journal`
  route exists in this codebase — AC-3 ("대화/루틴이 저장되고 `/journal`
  시간순 조회") is referenced by the landing page but its page was not built
  by T1–T7. This is a dead link today; worth a follow-up ticket rather than a
  T8-scope fix (T8 is tests/QA/PWA only, not new feature pages).

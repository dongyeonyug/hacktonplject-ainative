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

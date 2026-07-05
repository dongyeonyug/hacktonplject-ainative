-- =============================================================================
-- 0003_institutions_seed.down.sql — reverse of 0003_institutions_seed.sql
-- (AD-10 rollback). Removes the newly inserted rows and the categories column
-- (existing 0001 seed rows are left in place, matching pre-migration state).
-- =============================================================================

delete from institutions
where name in (
  '국가정신건강정보포털 (보건복지부)',
  '복지로 (보건복지부)',
  '커리어넷 (한국직업능력연구원)',
  '가족센터 (여성가족부)',
  '근로복지넷 (근로복지공단)'
);

drop index if exists idx_institutions_categories;

alter table institutions drop column if exists categories;

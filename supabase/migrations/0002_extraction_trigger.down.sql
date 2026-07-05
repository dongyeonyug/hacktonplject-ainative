-- =============================================================================
-- 0002_extraction_trigger.down.sql — reverse of 0002_extraction_trigger.sql
-- (AD-10 rollback). Drops in reverse dependency order: trigger -> functions ->
-- config table. pg_net extension left in place (may be shared by other
-- features / Supabase-managed).
-- =============================================================================

drop trigger if exists trg_messages_enqueue_extraction on messages;
drop function if exists trg_enqueue_extraction();
drop function if exists reenqueue_stale_extractions(int);
drop function if exists call_extraction_worker(uuid);
drop table if exists extraction_config;

-- Note: `pg_net` extension intentionally NOT dropped (may be shared/managed).

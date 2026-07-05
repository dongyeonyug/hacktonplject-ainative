-- =============================================================================
-- 0001_init.down.sql — reverse of 0001_init.sql (AD-10 rollback).
-- Drops in reverse dependency order: trigger -> function -> view ->
-- tables (children first) -> enum types. Extension left in place (shared).
-- =============================================================================

-- Trigger + guard function (AD-4)
drop trigger if exists trg_guard_realname on profiles;
drop function if exists guard_realname();

-- Derived view (AD-3)
drop view if exists current_consents;

-- RLS policies are dropped automatically with their tables.

-- Tables — children / dependents first, then parents.
drop table if exists extraction_status;
drop table if exists recommendation_events;
drop table if exists curated_matches;
drop table if exists crisis_events;
drop table if exists difficulty_data;
drop table if exists emotional_states;
drop table if exists routines;
drop table if exists consent_events;
drop table if exists messages;
drop table if exists conversations;
drop table if exists institutions;
drop table if exists profiles;

-- Enum types (after all tables referencing them are gone).
drop type if exists recommendation_action;
drop type if exists extraction_state;
drop type if exists difficulty_category;
drop type if exists message_role;
drop type if exists consent_action;
drop type if exists consent_scope;

-- Note: `pgcrypto` extension intentionally NOT dropped (may be shared).

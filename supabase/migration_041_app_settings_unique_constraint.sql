-- Migration 041: Fix app_settings constraints for multi-organizer architecture
--
-- 1. Drop the old "single_row" check constraint that blocked any INSERT
--    beyond the original single global row.
-- 2. Replace the partial unique index on user_id with a full UNIQUE CONSTRAINT
--    so that upsert with onConflict: 'user_id' works correctly in PostgreSQL.
--    A full UNIQUE CONSTRAINT allows multiple NULLs (NULL ≠ NULL per SQL standard).

-- Drop legacy single-row guard
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS single_row;

-- Replace partial index with proper UNIQUE CONSTRAINT
DROP INDEX IF EXISTS app_settings_user_id_unique;
ALTER TABLE app_settings ADD CONSTRAINT app_settings_user_id_unique UNIQUE (user_id);

-- Migration 041: Replace partial unique index on app_settings.user_id
-- with a full UNIQUE CONSTRAINT so that upsert with onConflict works correctly.
--
-- The partial index (WHERE user_id IS NOT NULL) is not recognised by PostgreSQL
-- for ON CONFLICT (user_id) DO UPDATE, causing every upsert to fail silently.
-- A full UNIQUE CONSTRAINT allows multiple NULLs (NULL ≠ NULL per SQL standard),
-- so existing rows with user_id = NULL are unaffected.

DROP INDEX IF EXISTS app_settings_user_id_unique;
ALTER TABLE app_settings ADD CONSTRAINT app_settings_user_id_unique UNIQUE (user_id);

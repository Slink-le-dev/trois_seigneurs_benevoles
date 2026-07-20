-- Migration 038: Per-organizer profile settings
--
-- Each admin now has their own row in app_settings (linked via user_id).
-- Events reference their primary organizer via evenements.organisateur_id.
-- Public views (bénévole, participant) read settings through the
-- get_event_settings() SECURITY DEFINER function so anon users never
-- need direct access to app_settings.

-- ----------------------------------------------------------------
-- 1. Allow multiple rows in app_settings (was hard-coded DEFAULT 1)
-- ----------------------------------------------------------------
ALTER TABLE app_settings ALTER COLUMN id DROP DEFAULT;
CREATE SEQUENCE IF NOT EXISTS app_settings_id_seq;
SELECT setval('app_settings_id_seq', COALESCE((SELECT MAX(id) FROM app_settings), 0));
ALTER TABLE app_settings ALTER COLUMN id SET DEFAULT nextval('app_settings_id_seq');
ALTER SEQUENCE app_settings_id_seq OWNED BY app_settings.id;

-- ----------------------------------------------------------------
-- 2. Add user_id column (nullable during migration)
-- ----------------------------------------------------------------
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Unique index (partial: skips null rows so migration doesn't break)
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_user_id_unique
  ON app_settings(user_id) WHERE user_id IS NOT NULL;

-- ----------------------------------------------------------------
-- 3. Add organisateur_id to evenements
-- ----------------------------------------------------------------
ALTER TABLE evenements
  ADD COLUMN IF NOT EXISTS organisateur_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- 4. SECURITY DEFINER function — lets anon read organizer settings
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_event_settings(p_evenement_id uuid)
RETURNS SETOF app_settings
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT s.*
  FROM app_settings s
  INNER JOIN evenements e ON e.organisateur_id = s.user_id
  WHERE e.id = p_evenement_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_event_settings(uuid) TO anon, authenticated;

-- ----------------------------------------------------------------
-- 5. Replace app_settings RLS with per-user policies
-- ----------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'app_settings' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON app_settings', pol.policyname);
  END LOOP;
END $$;

-- Each authenticated user can only read/write their own settings row.
-- Anon users must go through get_event_settings() — no direct access.
CREATE POLICY "app_settings_own" ON app_settings
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ================================================================
-- MANUAL STEPS — run these separately in the Supabase SQL Editor
-- (personal emails must not be committed to the public repo)
-- ================================================================
--
-- Step A — assign user_id to the existing settings row:
--   UPDATE app_settings
--   SET user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL')
--   WHERE id = 1;
--
-- Step B — set organisateur_id for all existing events (super admin initially):
--   UPDATE evenements
--   SET organisateur_id = (SELECT id FROM auth.users WHERE email = 'YOUR_SUPER_ADMIN_EMAIL');
--
-- Step C (optional) — for events managed by another organizer, update per event:
--   UPDATE evenements
--   SET organisateur_id = (SELECT id FROM auth.users WHERE email = 'OTHER_ADMIN_EMAIL')
--   WHERE id = 'EVENEMENT_UUID_HERE';
-- ================================================================

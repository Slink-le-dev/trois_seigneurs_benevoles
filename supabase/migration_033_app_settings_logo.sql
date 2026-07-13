-- Migration 033 : ajout de l'URL du logo organisateur dans les paramètres globaux

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- NOTE : créer manuellement un bucket Storage public nommé "logos"
-- dans le dashboard Supabase → Storage → New bucket → nom : "logos" → cocher "Public bucket"

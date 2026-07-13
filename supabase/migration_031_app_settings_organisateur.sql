-- Migration 031 : ajout du nom de l'organisateur dans les paramètres globaux

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS organisateur_nom TEXT NOT NULL DEFAULT '';

-- Renseigne le nom de l'organisateur pour l'installation existante
UPDATE app_settings
SET organisateur_nom = 'VO2 max Tarascon-sur-Ariège'
WHERE id = 1;

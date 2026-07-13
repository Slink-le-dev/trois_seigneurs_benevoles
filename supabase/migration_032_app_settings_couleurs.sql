-- Migration 032 : ajout des couleurs organisateur dans les paramètres globaux

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS couleur_principale TEXT NOT NULL DEFAULT '#00C389',
  ADD COLUMN IF NOT EXISTS couleur_secondaire TEXT NOT NULL DEFAULT '#F3EA5D';

UPDATE app_settings
SET couleur_principale = '#00C389',
    couleur_secondaire = '#F3EA5D'
WHERE id = 1;

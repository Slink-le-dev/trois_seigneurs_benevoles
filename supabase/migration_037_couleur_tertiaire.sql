-- Migration 037 : ajout de la couleur tertiaire dans les paramètres globaux
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS couleur_tertiaire TEXT NOT NULL DEFAULT '#374151';

UPDATE app_settings
SET couleur_tertiaire = '#374151'
WHERE id = 1 AND couleur_tertiaire = '#374151';

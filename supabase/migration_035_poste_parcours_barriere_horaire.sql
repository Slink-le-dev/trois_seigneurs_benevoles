-- Migration 035 : ajout de la barrière horaire sur la liaison poste–parcours

ALTER TABLE poste_parcours
  ADD COLUMN IF NOT EXISTS barriere_horaire TEXT;

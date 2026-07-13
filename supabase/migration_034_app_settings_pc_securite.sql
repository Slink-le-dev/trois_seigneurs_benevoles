-- Migration 034 : ajout du numéro de téléphone du PC sécurité

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS telephone_pc_securite TEXT NOT NULL DEFAULT '';

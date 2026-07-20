-- Migration 040: Main courante par évènement
--
-- Chaque entrée de main courante est désormais rattachée à un évènement.
-- L'application filtre les données par evenement_id côté client (useAppData).

ALTER TABLE main_courante
  ADD COLUMN IF NOT EXISTS evenement_id uuid REFERENCES evenements(id) ON DELETE CASCADE;

-- Index pour accélérer les requêtes filtrées par évènement
CREATE INDEX IF NOT EXISTS main_courante_evenement_idx ON main_courante(evenement_id);

-- ================================================================
-- ÉTAPE MANUELLE — à exécuter dans le Supabase SQL Editor
-- ================================================================
-- Les entrées existantes n'ont pas d'evenement_id : elles disparaîtront
-- des vues jusqu'à ce que vous les rattachiez à leur évènement.
--
-- Remplacez EVENT_UUID par l'UUID de l'évènement concerné
-- (visible dans l'URL de la vue admin de l'évènement) :
--
--   UPDATE main_courante
--   SET evenement_id = 'EVENT_UUID'
--   WHERE evenement_id IS NULL;
--
-- Si vous avez plusieurs évènements avec des entrées existantes,
-- faites un UPDATE par évènement avec une clause WHERE sur la date
-- ou le poste_origine_id pour cibler les bonnes lignes.
-- ================================================================

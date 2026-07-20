-- Passage au statut "Désactivé" des 49 postes de "Las Quatras Cabanas 2026"
-- À exécuter dans le SQL Editor de Supabase

UPDATE postes
SET statut = 'desactive',
    statut_updated_at = now()
WHERE evenement_id = (
  SELECT id FROM evenements WHERE nom = 'Las Quatras Cabanas 2026' LIMIT 1
)
AND numero BETWEEN 1 AND 49;

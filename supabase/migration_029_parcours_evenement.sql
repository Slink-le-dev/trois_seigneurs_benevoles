-- Rattache chaque parcours à son évènement
ALTER TABLE parcours ADD COLUMN IF NOT EXISTS evenement_id uuid REFERENCES evenements(id) ON DELETE CASCADE;

-- Backfill : associe les parcours existants à l'évènement Trail des Trois Seigneurs
UPDATE parcours
SET evenement_id = (SELECT id FROM evenements WHERE slug = 'trail-pic-trois-seigneurs')
WHERE evenement_id IS NULL;

-- Index pour accélérer les requêtes filtrées par évènement
CREATE INDEX IF NOT EXISTS parcours_evenement_id_idx ON parcours(evenement_id);

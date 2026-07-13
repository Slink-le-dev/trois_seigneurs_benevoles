-- Rattache postes, points_extraction et abris_temporaires à leur évènement

ALTER TABLE postes ADD COLUMN IF NOT EXISTS evenement_id uuid REFERENCES evenements(id) ON DELETE CASCADE;
UPDATE postes SET evenement_id = (SELECT id FROM evenements WHERE slug = 'trail-pic-trois-seigneurs') WHERE evenement_id IS NULL;
CREATE INDEX IF NOT EXISTS postes_evenement_id_idx ON postes(evenement_id);

ALTER TABLE points_extraction ADD COLUMN IF NOT EXISTS evenement_id uuid REFERENCES evenements(id) ON DELETE CASCADE;
UPDATE points_extraction SET evenement_id = (SELECT id FROM evenements WHERE slug = 'trail-pic-trois-seigneurs') WHERE evenement_id IS NULL;
CREATE INDEX IF NOT EXISTS points_extraction_evenement_id_idx ON points_extraction(evenement_id);

ALTER TABLE abris_temporaires ADD COLUMN IF NOT EXISTS evenement_id uuid REFERENCES evenements(id) ON DELETE CASCADE;
UPDATE abris_temporaires SET evenement_id = (SELECT id FROM evenements WHERE slug = 'trail-pic-trois-seigneurs') WHERE evenement_id IS NULL;
CREATE INDEX IF NOT EXISTS abris_temporaires_evenement_id_idx ON abris_temporaires(evenement_id);

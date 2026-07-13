-- Création de la table des évènements
CREATE TABLE IF NOT EXISTS evenements (
  id        uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nom       text    NOT NULL,
  date_debut date   NOT NULL,
  date_fin  date,
  slug      text    NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE evenements ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs authentifiés peuvent tout faire
CREATE POLICY "evenements_authenticated"
  ON evenements FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Les anonymes peuvent lire (pour les vues bénévole / participant)
CREATE POLICY "evenements_anon_read"
  ON evenements FOR SELECT TO anon
  USING (true);

-- Insertion de l'évènement existant
INSERT INTO evenements (nom, date_debut, slug)
VALUES ('Trail du pic des Trois seigneurs', '2026-07-04', 'trail-pic-trois-seigneurs')
ON CONFLICT (slug) DO NOTHING;

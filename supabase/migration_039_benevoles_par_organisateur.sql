-- Migration 039: Bénévoles par organisateur
--
-- Chaque organisateur possède sa propre liste de bénévoles.
-- Les admins authentifiés ne voient que leurs propres bénévoles (RLS).
-- Les vues publiques (bénévole/participant) lisent via benevoles_public,
-- vue owned by postgres (BYPASSRLS) ; le filtre organisateur_id est appliqué
-- côté application.

-- ----------------------------------------------------------------
-- 1. Ajout de la colonne organisateur_id à benevoles
-- ----------------------------------------------------------------
ALTER TABLE benevoles
  ADD COLUMN IF NOT EXISTS organisateur_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ----------------------------------------------------------------
-- 2. Mise à jour du RLS sur benevoles
-- ----------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'benevoles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON benevoles', pol.policyname);
  END LOOP;
END $$;

-- Chaque admin ne voit et ne modifie que ses propres bénévoles.
CREATE POLICY "benevoles_own" ON benevoles
  FOR ALL TO authenticated
  USING  (organisateur_id = auth.uid())
  WITH CHECK (organisateur_id = auth.uid());

-- Les anonymes n'ont pas d'accès direct à la table benevoles.
-- Ils passent par la vue benevoles_public (owned by postgres → BYPASSRLS).

-- ----------------------------------------------------------------
-- 3. Recréation de benevoles_public avec organisateur_id
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW benevoles_public AS
  SELECT id, nom, created_at, formation, organisateur_id
  FROM benevoles;

-- S'assurer que anon peut lire la vue
GRANT SELECT ON benevoles_public TO anon;

-- ================================================================
-- ÉTAPES MANUELLES — à exécuter dans le Supabase SQL Editor
-- ================================================================
--
-- Étape A : rattacher les bénévoles existants à l'organisateur principal
--   UPDATE benevoles
--   SET organisateur_id = (SELECT id FROM auth.users WHERE email = 'ORGANISATEUR_EMAIL');
--
-- Étape B : si seed_benevoles.sql est utilisé, ajouter organisateur_id
--   dans chaque INSERT, par exemple :
--   INSERT INTO benevoles (nom, telephone, formation, organisateur_id)
--   VALUES ('Nom Prenom', '06 00 00 00 00', 'aucune',
--           (SELECT id FROM auth.users WHERE email = 'ORGANISATEUR_EMAIL'));
-- ================================================================

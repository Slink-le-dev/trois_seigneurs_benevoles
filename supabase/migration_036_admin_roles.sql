-- =====================================================================
-- Migration 036 — Rôles Super Admin / Simple Admin
-- =====================================================================
-- À exécuter dans le SQL Editor de Supabase.
--
-- Après exécution :
--   • a.passosmaciel@protonmail.com est automatiquement marqué Super Admin.
--   • Les autres comptes admin sont "Simple Admin" par défaut.
--   • Le Super Admin peut assigner des événements aux Simple Admins
--     depuis la page "Mes évènements" de l'application.
-- =====================================================================

-- 1. Table admin_roles : marque les Super Admins
CREATE TABLE IF NOT EXISTS admin_roles (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_super_admin boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- 2. Table evenement_admins : associe les Simple Admins à leurs événements
CREATE TABLE IF NOT EXISTS evenement_admins (
  evenement_id uuid        NOT NULL REFERENCES evenements(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evenement_id, user_id)
);

ALTER TABLE evenement_admins ENABLE ROW LEVEL SECURITY;

-- 3. Fonction SECURITY DEFINER : vérifie si l'utilisateur courant est Super Admin
--    (évite la récursion infinie dans les policies RLS d'admin_roles)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM admin_roles WHERE user_id = auth.uid()),
    false
  );
$$;

-- 4. Fonction SECURITY DEFINER : résout un email → user_id
--    (permet d'assigner un admin par email sans exposer auth.users côté client)
CREATE OR REPLACE FUNCTION get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT id FROM auth.users WHERE email = lower(trim(p_email)) LIMIT 1;
$$;

-- 5. Fonction SECURITY DEFINER : liste les admins d'un événement avec leur email
CREATE OR REPLACE FUNCTION get_event_admins(p_evenement_id uuid)
RETURNS TABLE (user_id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ea.user_id, au.email::text
  FROM evenement_admins ea
  JOIN auth.users au ON au.id = ea.user_id
  WHERE ea.evenement_id = p_evenement_id;
$$;

-- 6. Policies RLS sur admin_roles
--    Lecture : chacun voit son propre rôle ; le Super Admin voit tous les rôles
CREATE POLICY "admin_roles_select" ON admin_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin());

--    Écriture : Super Admin uniquement
CREATE POLICY "admin_roles_write" ON admin_roles
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 7. Policies RLS sur evenement_admins
--    Lecture : chacun voit ses propres accès ; le Super Admin voit tout
CREATE POLICY "evenement_admins_select" ON evenement_admins
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin());

--    Écriture : Super Admin uniquement
CREATE POLICY "evenement_admins_write" ON evenement_admins
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 8. Mise à jour des policies RLS sur evenements
--    La policy permissive "FOR ALL TO authenticated USING (true)" est remplacée
--    par des policies ciblées par rôle.
DROP POLICY IF EXISTS "evenements_authenticated" ON evenements;

--    Lecture authentifiée :
--      • Super Admin → tous les événements
--      • Simple Admin → seulement les événements qui lui sont assignés
CREATE POLICY "evenements_select_authenticated" ON evenements
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM evenement_admins ea
      WHERE ea.evenement_id = id AND ea.user_id = auth.uid()
    )
  );

--    Création : Super Admin uniquement
CREATE POLICY "evenements_insert_authenticated" ON evenements
  FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());

--    Modification : Super Admin uniquement
CREATE POLICY "evenements_update_authenticated" ON evenements
  FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

--    Suppression : Super Admin uniquement
CREATE POLICY "evenements_delete_authenticated" ON evenements
  FOR DELETE TO authenticated
  USING (is_super_admin());

-- 9. Marquer a.passosmaciel@protonmail.com comme Super Admin
INSERT INTO admin_roles (user_id, is_super_admin)
SELECT id, true
FROM auth.users
WHERE email = 'a.passosmaciel@protonmail.com'
ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true;

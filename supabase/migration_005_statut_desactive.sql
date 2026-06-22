-- Migration : ajoute le statut "desactive" aux postes.
-- A executer dans le SQL Editor du dashboard Supabase.

alter table postes drop constraint postes_statut_check;

alter table postes add constraint postes_statut_check
  check (statut in ('desactive', 'non_active', 'en_place', 'alerte', 'ferme'));

-- Migration 021 : ajoute le statut "Libéré" aux postes (intermédiaire entre "En place" et "Fermé").

alter table postes drop constraint postes_statut_check;

alter table postes add constraint postes_statut_check
  check (statut in ('desactive', 'non_active', 'en_place', 'libere', 'alerte', 'ferme'));

-- Migration 014 : ajoute "Ostéopathe" aux formations possibles.

alter table benevoles drop constraint benevoles_formation_check;

alter table benevoles add constraint benevoles_formation_check
  check (formation in ('medecin', 'infirmier', 'pompier', 'psc1', 'kinesitherapeute', 'pharmacien', 'osteopathe', 'aucune'));

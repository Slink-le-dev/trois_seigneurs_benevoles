-- Migration 017 : ajoute "Sauveteur Secouriste du Travail" aux formations possibles.

alter table benevoles drop constraint benevoles_formation_check;

alter table benevoles add constraint benevoles_formation_check
  check (formation in ('medecin', 'infirmier', 'pompier', 'psc1', 'kinesitherapeute', 'pharmacien', 'osteopathe', 'sst', 'aucune'));

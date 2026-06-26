-- Migration 013 : ajoute "Kinésithérapeute" et "Pharmacien" aux formations possibles.

alter table benevoles drop constraint benevoles_formation_check;

alter table benevoles add constraint benevoles_formation_check
  check (formation in ('medecin', 'infirmier', 'pompier', 'psc1', 'kinesitherapeute', 'pharmacien', 'aucune'));

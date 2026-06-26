-- Migration 012 : formation des bénévoles (médecin, infirmier, pompier, PSC1, aucune).

alter table benevoles add column formation text not null default 'aucune'
  check (formation in ('medecin', 'infirmier', 'pompier', 'psc1', 'aucune'));

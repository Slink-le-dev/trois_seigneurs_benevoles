-- Migration 016 : matériel disponible sur chaque poste.

alter table postes add column materiel text[] not null default '{}';

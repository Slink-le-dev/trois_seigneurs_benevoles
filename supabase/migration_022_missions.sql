-- Migration 022 : ajoute le champ missions aux postes (tableau de codes de mission).
alter table postes add column if not exists missions text[] not null default '{}';

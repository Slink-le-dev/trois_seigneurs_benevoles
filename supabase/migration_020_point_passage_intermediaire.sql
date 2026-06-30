-- Migration 020 : caractéristique "Point de passage intermédiaire" sur les postes.

alter table postes add column point_passage_intermediaire boolean not null default false;

update postes set point_passage_intermediaire = true where numero in (0, 16, 21, 23);

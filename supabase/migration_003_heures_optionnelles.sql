-- Migration : rend l'heure de début/fin d'une affectation optionnelle.
-- A executer dans le SQL Editor du dashboard Supabase.

alter table affectations alter column heure_debut drop not null;
alter table affectations alter column heure_fin drop not null;

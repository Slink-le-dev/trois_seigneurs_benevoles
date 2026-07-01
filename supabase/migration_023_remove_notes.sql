-- Supprime la colonne notes et toutes les données qu'elle contenait
alter table postes drop column if exists notes;

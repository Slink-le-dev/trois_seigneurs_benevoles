-- Migration 010 : lien de suivi GPS pour les évènements "abandon" de la main courante.

alter table main_courante add column lien_suivi_gps text;

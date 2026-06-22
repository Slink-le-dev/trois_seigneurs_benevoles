-- Migration 008 : renomme le statut "en cours" en "prise en charge en cours"
-- et ajoute le statut "pris en charge" pour la main courante.

alter table main_courante drop constraint main_courante_statut_check;

update main_courante set statut = 'prise en charge en cours' where statut = 'en cours';

alter table main_courante alter column statut set default 'prise en charge en cours';

alter table main_courante add constraint main_courante_statut_check
  check (statut in ('prise en charge en cours', 'pris en charge', 'terminé', 'abandonné'));

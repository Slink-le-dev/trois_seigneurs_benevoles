-- Migration 015 : expose la formation des bénévoles dans la vue publique (pas une donnée
-- sensible comme le téléphone), pour qu'elle s'affiche aussi sur la vue Consultation.

create or replace view benevoles_public as
  select id, nom, created_at, formation from benevoles;

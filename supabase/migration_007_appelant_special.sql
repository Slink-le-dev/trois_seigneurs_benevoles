-- Migration 007 : l'appelant de la main courante peut être un bénévole,
-- ou une catégorie générique (coureur, Croix-Rouge, autre) sans bénévole associé.

alter table main_courante alter column benevole_appelant_id drop not null;

alter table main_courante add column appelant_special text
  check (appelant_special in ('coureur', 'croix_rouge', 'autre'));

alter table main_courante add constraint main_courante_appelant_xor
  check ((benevole_appelant_id is not null) <> (appelant_special is not null));

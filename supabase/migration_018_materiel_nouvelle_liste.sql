-- Migration 018 : nouvelle liste de matériel disponible sur les postes
-- (radio, défibrillateur, lot A, lot C, trousse de soin).
-- Retire des données existantes les anciens codes qui n'existent plus
-- (couverture_survie, pansements_compressifs, pansements, antiseptique,
-- poche_froid, attelle, talkie_walkie) ; conserve defibrillateur/lot_a/lot_c.

update postes
set materiel = (
  select coalesce(array_agg(elem), '{}')
  from unnest(materiel) as elem
  where elem in ('radio', 'defibrillateur', 'lot_a', 'lot_c', 'trousse_soin')
)
where materiel is not null;

-- Création des postes pour l'évènement "Las Quatras Cabanas 2026"
-- À exécuter dans le SQL Editor de Supabase
--
-- Prérequis :
--   - L'évènement "Las Quatras Cabanas 2026" existe dans la table evenements
--   - Les 6 parcours existent et contiennent "Las Quatras", "Virada", "Caminada",
--     "U18", "U16", "U14" dans leur nom (recherche ILIKE)
--
-- Corrections GPS appliquées (typos dans le tableau source) :
--   Ligne 4  : lat 2.879799  → 42.879799
--   Ligne 6  : lat 2.879863  → 42.879863
--   Ligne 13 : lat 2.891518  → 42.891518
--
-- Ravitaillements détectés automatiquement (types = eau + nourriture) :
--   #8  13H Ravitaillement Loumet
--   #44 AD Ravitaillement Siech

DO $$
DECLARE
  evt_id     uuid;
  p_lqc      uuid;   -- Las Quatras Cabanas
  p_virada   uuid;   -- Virada
  p_caminada uuid;   -- Caminada
  p_u18      uuid;   -- Ados U18
  p_u16      uuid;   -- Ados U16
  p_u14      uuid;   -- Ados U14
BEGIN

  -- ── Résolution de l'évènement ──────────────────────────────────────────────
  SELECT id INTO evt_id
  FROM evenements
  WHERE nom = 'Las Quatras Cabanas 2026'
  LIMIT 1;

  IF evt_id IS NULL THEN
    RAISE EXCEPTION 'Évènement "Las Quatras Cabanas 2026" introuvable dans la table evenements.';
  END IF;

  -- ── Résolution des parcours ─────────────────────────────────────────────────
  SELECT id INTO p_lqc      FROM parcours WHERE evenement_id = evt_id AND nom ILIKE '%Las Quatras%'  LIMIT 1;
  SELECT id INTO p_virada   FROM parcours WHERE evenement_id = evt_id AND nom ILIKE '%Virada%'       LIMIT 1;
  SELECT id INTO p_caminada FROM parcours WHERE evenement_id = evt_id AND nom ILIKE '%Caminada%'     LIMIT 1;
  SELECT id INTO p_u18      FROM parcours WHERE evenement_id = evt_id AND nom ILIKE '%U18%'          LIMIT 1;
  SELECT id INTO p_u16      FROM parcours WHERE evenement_id = evt_id AND nom ILIKE '%U16%'          LIMIT 1;
  SELECT id INTO p_u14      FROM parcours WHERE evenement_id = evt_id AND nom ILIKE '%U14%'          LIMIT 1;

  -- ── Insertion des 49 postes ─────────────────────────────────────────────────
  -- Légende parcours : LQC = Las Quatras Cabanas · V = Virada · C = Caminada
  --                    U18 = Ados U18 · U16 = Ados U16 · U14 = Ados U14
  INSERT INTO postes (numero, nom, lat, lng, types, materiel, missions, point_passage_intermediaire, statut, evenement_id)
  VALUES
    ( 1, '13A Route pont de Pomiès',                              42.876812, 1.526669, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 2, '13B Bernicau',                                           42.877202, 1.515425, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 3, '13C Goueytes',                                           42.879816, 1.511898, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 4, '13D Goueytes',                                           42.879799, 1.509797, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 5, '13E Goueytes Haut – Ruzole',                            42.880258, 1.501018, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 6, '13F Sarraute',                                           42.879863, 1.493089, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 7, '13G Virage D618',                                        42.883531, 1.495653, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 8, '13H Ravitaillement Loumet',                             42.883754, 1.493914, '{eau,nourriture}', '{}', '{}', false, 'desactive', evt_id), -- V, C
    ( 9, '13I Route D618 pont de prat',                           42.886405, 1.494933, '{}',               '{}', '{}', false, 'desactive', evt_id), -- C
    (10, '13J Fin chemin des Tausses',                             42.886540, 1.496371, '{}',               '{}', '{}', false, 'desactive', evt_id), -- C
    (11, '13K Tausses',                                            42.886657, 1.500527, '{}',               '{}', '{}', false, 'desactive', evt_id), -- C
    (12, '13L Planals',                                            42.889278, 1.499107, '{}',               '{}', '{}', false, 'desactive', evt_id), -- C
    (13, '13M Sept founts',                                        42.891518, 1.501155, '{}',               '{}', '{}', false, 'desactive', evt_id), -- C
    (14, '13N Stables',                                            42.888439, 1.506760, '{}',               '{}', '{}', false, 'desactive', evt_id), -- C
    (15, '13O Roucatel',                                           42.888209, 1.521613, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC, V, C
    (16, '13P Croisement D vers Goute de Bès',                    42.888789, 1.530050, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC, V, C
    (17, '13Q Goute de bès – chemin des vignes',                  42.884823, 1.537522, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC, V, C
    (18, '34A Pisciculture',                                       42.875528, 1.540928, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (19, '34B Col d''Ijou',                                        42.867450, 1.554127, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (20, '34C Col de la roche ronde',                             42.862408, 1.542694, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (21, '34D Coupe feu',                                          42.859810, 1.535205, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (22, '34E Sommet du mount',                                   42.857194, 1.531921, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (23, '34F Col planet',                                         42.862160, 1.522029, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (24, '34G Hameau Carlong',                                    42.863803, 1.520110, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (25, '34H Col de carlong',                                    42.860593, 1.516484, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (26, '34I Embranchement coucougnac',                          42.868056, 1.496111, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (27, '34J Cougougnac',                                         42.868244, 1.491629, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (28, '34K Escalot',                                            42.863939, 1.476921, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (29, '34L Doule',                                              42.869929, 1.458864, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (30, '34M Piste ONF',                                          42.876598, 1.465639, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (31, '34N Estibat cabane',                                    42.888603, 1.459244, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (32, '34O Griets estibat',                                    42.887671, 1.445697, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (33, '34P Col de port',                                       42.899051, 1.453039, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (34, '34Q Labère',                                             42.900920, 1.466743, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (35, '34R Pourrasse',                                          42.906259, 1.466666, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (36, '34S Sarrat de la pelade',                               42.905863, 1.486759, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (37, '34T Col de Batail',                                      42.906202, 1.497708, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC
    (38, 'Village',                                                42.878556, 1.539347, '{}',               '{}', '{}', false, 'desactive', evt_id), -- LQC, V, C
    (39, '25A Départ vers le chemin des cloches',                 42.886186, 1.494802, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V
    (40, '25B Croisement piste ONF vers maison forestière',       42.884577, 1.478089, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V
    (41, '25C Maison forestière (croisement 34 et 25 km)',        42.885453, 1.468656, '{}',               '{}', '{}', false, 'desactive', evt_id), -- V
    (42, 'AA Départ vers le chemin de Siech',                     42.881845, 1.545189, '{}',               '{}', '{}', false, 'desactive', evt_id), -- U18, U16, U14
    (43, 'AC Au début du chemin de Siech',                        42.882726, 1.546348, '{}',               '{}', '{}', false, 'desactive', evt_id), -- U18, U16, U14
    (44, 'AD Ravitaillement Siech',                               42.888621, 1.545636, '{eau,nourriture}', '{}', '{}', false, 'desactive', evt_id), -- U18, U16, U14
    (45, 'AE Vers route de l''Estagnou',                          42.888621, 1.545636, '{}',               '{}', '{}', false, 'desactive', evt_id), -- U18, U16, U14
    (46, 'AF Départ vers Artigues',                               42.888621, 1.545636, '{}',               '{}', '{}', false, 'desactive', evt_id), -- U18, U16, U14
    (47, 'AG Bout de la route de l''Estagnou',                    42.889082, 1.554706, '{}',               '{}', '{}', false, 'desactive', evt_id), -- U18, U16, U14
    (48, 'AH Sous la tour de Montorgueil',                       42.882121, 1.556916, '{}',               '{}', '{}', false, 'desactive', evt_id), -- U18, U16, U14
    (49, 'AI Après Montorgueil à la route (Pradarigoul)',         42.884489, 1.555760, '{}',               '{}', '{}', false, 'desactive', evt_id); -- U18, U16, U14

  -- ── Liens poste_parcours ────────────────────────────────────────────────────
  --
  -- Las Quatras Cabanas : postes 15–38
  IF p_lqc IS NOT NULL THEN
    INSERT INTO poste_parcours (poste_id, parcours_id)
    SELECT p.id, p_lqc FROM postes p
    WHERE p.evenement_id = evt_id
      AND p.numero IN (15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38);
  ELSE
    RAISE WARNING 'Parcours "Las Quatras Cabanas" introuvable — liens non créés.';
  END IF;

  -- Virada : postes 1–8, 15–17, 38–41
  IF p_virada IS NOT NULL THEN
    INSERT INTO poste_parcours (poste_id, parcours_id)
    SELECT p.id, p_virada FROM postes p
    WHERE p.evenement_id = evt_id
      AND p.numero IN (1,2,3,4,5,6,7,8,15,16,17,38,39,40,41);
  ELSE
    RAISE WARNING 'Parcours "Virada" introuvable — liens non créés.';
  END IF;

  -- Caminada : postes 1–17, 38
  IF p_caminada IS NOT NULL THEN
    INSERT INTO poste_parcours (poste_id, parcours_id)
    SELECT p.id, p_caminada FROM postes p
    WHERE p.evenement_id = evt_id
      AND p.numero IN (1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,38);
  ELSE
    RAISE WARNING 'Parcours "Caminada" introuvable — liens non créés.';
  END IF;

  -- Ados U18 : postes 42–49
  IF p_u18 IS NOT NULL THEN
    INSERT INTO poste_parcours (poste_id, parcours_id)
    SELECT p.id, p_u18 FROM postes p
    WHERE p.evenement_id = evt_id
      AND p.numero IN (42,43,44,45,46,47,48,49);
  ELSE
    RAISE WARNING 'Parcours "Ados U18" introuvable — liens non créés.';
  END IF;

  -- Ados U16 : postes 42–49
  IF p_u16 IS NOT NULL THEN
    INSERT INTO poste_parcours (poste_id, parcours_id)
    SELECT p.id, p_u16 FROM postes p
    WHERE p.evenement_id = evt_id
      AND p.numero IN (42,43,44,45,46,47,48,49);
  ELSE
    RAISE WARNING 'Parcours "Ados U16" introuvable — liens non créés.';
  END IF;

  -- Ados U14 : postes 42–49
  IF p_u14 IS NOT NULL THEN
    INSERT INTO poste_parcours (poste_id, parcours_id)
    SELECT p.id, p_u14 FROM postes p
    WHERE p.evenement_id = evt_id
      AND p.numero IN (42,43,44,45,46,47,48,49);
  ELSE
    RAISE WARNING 'Parcours "Ados U14" introuvable — liens non créés.';
  END IF;

  RAISE NOTICE 'Import terminé : 49 postes créés pour l''évènement "Las Quatras Cabanas 2026".';

END $$;

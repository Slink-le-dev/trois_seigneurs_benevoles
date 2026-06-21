-- Import des postes officiels (document "Emplacements bénévoles 3S - Base poste pour app").
-- A executer dans le SQL Editor du dashboard Supabase.
-- Supprime les 2 postes de test (Mairie Gourbit n.1, Test Andre n.2) puis importe les 43
-- postes du document avec leur numero d'origine (0 a 49, certains numeros n'existent pas
-- dans le document source). Les notes contiennent le texte de la colonne "Missions a assurer".

delete from postes where id in (
  '4f5cc2f7-59f4-49cf-b6ed-4b120b480d56',
  'c370338d-2d7c-4ecc-9df5-6144211371d0'
);

insert into postes (numero, nom, lat, lng, types, notes, statut) values
(0, $$Parc de la Préhistoire$$, 42.85480, 1.57480, ARRAY['signaleur','eau','nourriture','medical'], $$-Ravitailler les coureurs
-Gérer les blessés$$, 'non_active'),
(1, $$Rond-point du parc de la Préhistoire$$, 42.85423, 1.57474, ARRAY['signaleur'], $$Gérer la circulation des véhicules$$, 'non_active'),
(2, $$Route / Sentier des arts$$, 42.85407, 1.57345, ARRAY['signaleur'], $$Gérer la circulation des véhicules$$, 'non_active'),
(3, $$Croisement du Sentier des arts$$, 42.85160, 1.57246, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(4, $$Château d'eau de Banat$$, 42.85289, 1.56955, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(5, $$Croix de Banat$$, 42.85175, 1.56779, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(6, $$Croisement Les Fountaneillos / Piste forestière Banat$$, 42.84462, 1.56465, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(7, $$Barriere cabanne des gardes$$, 42.84496, 1.56732, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(8, $$Cap de Lauzac$$, 42.84058, 1.57375, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(9, $$Sommet de la Vente farine$$, 42.84112, 1.56283, ARRAY['signaleur'], $$S'assurer de la bonne condition physique des coureurs$$, 'non_active'),
(10, $$Descente après Vente farine / Piste forestière Banat$$, 42.84067, 1.55537, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(11, $$Croisement piste forestière 24 et 42km$$, 42.84174, 1.55518, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon parcours$$, 'non_active'),
(12, $$Ravitaillement après le Tourol$$, 42.83132, 1.54789, ARRAY['signaleur','eau'], $$-Aiguiller les coureurs vers le bon parcours
-Ravitailler les coureurs$$, 'non_active'),
(13, $$Col de Lastris$$, 42.81830, 1.54297, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon parcours$$, 'non_active'),
(14, $$Roc de Querquéou$$, 42.80917, 1.52559, ARRAY['signaleur'], $$S'assurer de la bonne condition physique des coureurs$$, 'non_active'),
(15, $$Descente vers l'étang d'Artax$$, 42.81402, 1.51043, ARRAY['signaleur'], $$Alerter sur l'état du chemin en descente$$, 'non_active'),
(16, $$Cabanne de l'étang d'Artax$$, 42.81757, 1.50798, ARRAY['signaleur','eau','nourriture'], $$-Aiguiller les coureurs vers le bon parcours
-Ravitailler les coureurs$$, 'non_active'),
(17, $$Surplomb de l'étang d'Artax$$, 42.81777, 1.50353, ARRAY['signaleur'], $$S'assurer qu'aucun coureur n'a coupé$$, 'non_active'),
(18, $$Montée vers le pic de Bassibié$$, 42.81834, 1.49887, ARRAY['signaleur'], $$S'assurer qu'aucun coureur n'a coupé$$, 'non_active'),
(19, $$Pic de Bassibié$$, 42.81483, 1.49374, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon parcours$$, 'non_active'),
(20, $$Pic de Pioulou$$, 42.82073, 1.47859, ARRAY['signaleur'], $$S'assurer qu'aucun coureur n'a coupé$$, 'non_active'),
(21, $$Col de la Couillate$$, 42.81652, 1.46147, ARRAY['signaleur','eau','nourriture','medical'], $$-Ravitailler les coureurs
-S'assurer de la bonne condition physique des coureurs, éventuellement sur le parcours 3S bis
-Informer le PC sécurité sur l'évolution de la météo
-Aiguiller les coureurs vers le bon parcours$$, 'non_active'),
(22, $$Pic de Peyroutet$$, 42.82258, 1.45311, ARRAY['signaleur'], $$-S'assurer de la bonne condition physique des coureurs, éventuellement sur le parcours 3S bis
-Informer le PC sécurité sur l'évolution de la météo$$, 'non_active'),
(23, $$Pic des Trois Seigneurs$$, 42.83048, 1.44000, ARRAY['signaleur','medical'], $$-S'assurer de la bonne condition physique des coureurs, éventuellement sur le parcours 3S bis
-Informer le PC sécurité sur l'évolution de la météo$$, 'non_active'),
(31, $$Etang bleu$$, 42.82267, 1.46059, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(32, $$Croisement piste Loumet$$, 42.83778, 1.47913, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(33, $$Terminus Roc Blanc (Piste forestière Ressec-Gourbit)$$, 42.83978, 1.49738, ARRAY['signaleur','eau','nourriture'], $$Ravitailler les coureurs$$, 'non_active'),
(34, $$Fin de la descente de l'étang d'Artax / Piste forestière$$, 42.82590, 1.52343, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(35, $$Carrefour des parcours Artax & 3S$$, 42.83189, 1.51217, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(36, $$Descente vers Gourbit$$, 42.83614, 1.51735, ARRAY['signaleur'], $$Alerter sur l'état du chemin (le ruisseau se mèle au chemin entre le poste 36 et 37)$$, 'non_active'),
(37, $$Château d'eau de Gourbit$$, 42.84211, 1.52723, ARRAY['signaleur'], $$S'assurer de la bonne condition physique des coureurs (le ruisseau se mèle au chemin)$$, 'non_active'),
(38, $$Croisement église de Gourbit / route La Plaço$$, 42.84311, 1.53181, ARRAY['signaleur'], $$Gérer la circulation des véhicules$$, 'non_active'),
(39, $$Place de Gourbit$$, 42.84373, 1.53317, ARRAY['signaleur'], $$Gérer la circulation des véhicules$$, 'non_active'),
(40, $$Mairie de Gourbit$$, 42.84526, 1.53495, ARRAY['signaleur','eau','nourriture'], $$-Gérer la circulation des véhicules
-Ravitailler les coureurs$$, 'non_active'),
(41, $$Moulin de Gourbit$$, 42.84580, 1.53530, ARRAY['signaleur'], $$Gérer la circulation des véhicules$$, 'non_active'),
(42, $$Sous Pla d'Abal - croisement route de Gourbit$$, 42.84868, 1.54797, ARRAY['signaleur'], $$Gérer la circulation des véhicules$$, 'non_active'),
(43, $$Epingle route de Gourbit$$, 42.84960, 1.55151, ARRAY['signaleur'], $$Gérer la circulation des véhicules$$, 'non_active'),
(44, $$Retour piste Gourbit-Banat$$, 42.84352, 1.55247, ARRAY['signaleur','eau','nourriture','medical'], $$Ravitailler les coureurs$$, 'non_active'),
(45, $$Redescente de la piste forestière Gourbit-Banat$$, 42.84352, 1.55537, ARRAY['signaleur'], null, 'non_active'),
(46, $$Descente vers l'ancienne mine$$, 42.84483, 1.55899, ARRAY['signaleur'], $$Alerter sur l'état du chemin$$, 'non_active'),
(47, $$Ancienne mine$$, 42.84650, 1.55926, ARRAY['signaleur'], $$S'assurer qu'il n'y a pas de blessures$$, 'non_active'),
(48, $$Carrefour retour de tous les parcours$$, 42.84978, 1.55645, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active'),
(49, $$Piste Cuminetti$$, 42.85067, 1.55575, ARRAY['signaleur'], $$Aiguiller les coureurs vers le bon chemin$$, 'non_active');

-- Liaisons postes <-> parcours, par numero de poste

insert into poste_parcours (poste_id, parcours_id)
select id, 'c90b7ed2-c88c-4904-a384-b71eefb599b3' from postes
where numero in (0,1,2,3,4,5,6,7,8,9,10,11,44,45,46,47,48,49);

insert into poste_parcours (poste_id, parcours_id)
select id, '0621966c-53cc-4209-95f2-1fbf4a25cd89' from postes
where numero in (0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,34,35,36,37,38,39,40,41,42,43,48,49);

insert into poste_parcours (poste_id, parcours_id)
select id, 'af797764-ef4c-427a-9ba2-eeb5cdd30dc8' from postes
where numero in (0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,21,22,23,31,32,33,35,36,37,38,39,40,41,42,43,48,49);

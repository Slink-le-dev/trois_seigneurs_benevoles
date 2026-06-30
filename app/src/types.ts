export type PosteTypeCode = 'signaleur' | 'medical' | 'eau' | 'nourriture';
export type PosteStatut = 'desactive' | 'non_active' | 'en_place' | 'libere' | 'alerte' | 'ferme';
export type PosteMaterielCode = 'radio' | 'defibrillateur' | 'lot_a' | 'lot_c' | 'trousse_soin';

export const POSTE_MATERIELS: { code: PosteMaterielCode; label: string }[] = [
  { code: 'radio', label: 'Radio' },
  { code: 'defibrillateur', label: 'Défibrillateur' },
  { code: 'lot_a', label: 'Lot A' },
  { code: 'lot_c', label: 'Lot C' },
  { code: 'trousse_soin', label: 'Trousse de soin' },
];

export const POSTE_TYPES: { code: PosteTypeCode; label: string; couleur: string; emoji: string }[] = [
  { code: 'signaleur', label: 'Signaleur', couleur: '#eab308', emoji: '🚩' },
  { code: 'medical', label: 'Médical', couleur: '#dc2626', emoji: '➕' },
  { code: 'eau', label: 'Ravitaillement eau', couleur: '#2563eb', emoji: '💧' },
  { code: 'nourriture', label: 'Ravitaillement nourriture', couleur: '#f97316', emoji: '🍴' },
];

export const POSTE_STATUTS: { code: PosteStatut; label: string; couleur: string }[] = [
  { code: 'desactive', label: 'Désactivé', couleur: '#9ca3af' },
  { code: 'non_active', label: "En cours d'activation", couleur: '#f97316' },
  { code: 'en_place', label: 'En place', couleur: '#16a34a' },
  { code: 'libere', label: 'Libéré', couleur: '#4ade80' },
  { code: 'alerte', label: 'Alerte', couleur: '#dc2626' },
  { code: 'ferme', label: 'Fermé', couleur: '#1f2937' },
];

export interface Parcours {
  id: string;
  nom: string;
  couleur: string;
  distance_km: number | null;
  denivele_m: number | null;
  gpx_geojson: GeoJSON.FeatureCollection | null;
  created_at: string;
}

export interface Poste {
  id: string;
  numero: number;
  nom: string;
  lat: number;
  lng: number;
  types: PosteTypeCode[];
  materiel: PosteMaterielCode[];
  point_passage_intermediaire: boolean;
  notes: string | null;
  statut: PosteStatut;
  statut_updated_at: string;
  created_at: string;
}

export interface PosteParcours {
  poste_id: string;
  parcours_id: string;
}

export type BenevoleFormation =
  | 'medecin'
  | 'infirmier'
  | 'pompier'
  | 'psc1'
  | 'kinesitherapeute'
  | 'pharmacien'
  | 'osteopathe'
  | 'sst'
  | 'aucune';

export const BENEVOLE_FORMATIONS: { code: BenevoleFormation; label: string }[] = [
  { code: 'medecin', label: 'Médecin' },
  { code: 'infirmier', label: 'Infirmier/Infirmière' },
  { code: 'pompier', label: 'Pompier' },
  { code: 'psc1', label: 'PSC1' },
  { code: 'kinesitherapeute', label: 'Kinésithérapeute' },
  { code: 'pharmacien', label: 'Pharmacien' },
  { code: 'osteopathe', label: 'Ostéopathe' },
  { code: 'sst', label: 'Sauveteur Secouriste du Travail' },
  { code: 'aucune', label: 'Pas de formation' },
];

export interface Benevole {
  id: string;
  nom: string;
  telephone: string | null;
  formation: BenevoleFormation;
  created_at: string;
}

export interface Affectation {
  id: string;
  benevole_id: string;
  poste_id: string;
  heure_debut: string | null;
  heure_fin: string | null;
  created_at: string;
}

export interface PointExtraction {
  id: string;
  lettre: string;
  libelle: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface AbriTemporaire {
  id: string;
  numero: number;
  nom: string;
  capacite: number;
  lat: number;
  lng: number;
  created_at: string;
}

export type MainCouranteStatus = 'prise en charge en cours' | 'pris en charge' | 'terminé' | 'abandonné';
export type AppelantSpecial = 'coureur' | 'croix_rouge' | 'autre';

export interface MainCouranteEvent {
  id: string;
  numero: number;
  date_evenement: string;
  created_at: string;
  created_by: string;
  updated_at: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  poste_origine_id: string;
  benevole_appelant_id: string | null;
  appelant_special: AppelantSpecial | null;
  benevole_recepteur_id: string;
  course: string;
  objet: string;
  dossard: string | null;
  commentaire: string | null;
  abandon: boolean;
  date_depart: string | null;
  lieu_depart: string | null;
  lieu_arrivee_attendue: string | null;
  heure_arrivee_estimee: string | null;
  heure_arrivee_effective: string | null;
  lien_suivi_gps: string | null;
  statut: MainCouranteStatus;
}

export interface MainCouranteJournalEntry {
  id: string;
  event_id: string;
  created_at: string;
  created_by: string;
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
}

export interface MainCouranteCommentaire {
  id: string;
  event_id: string;
  created_at: string;
  created_by: string;
  contenu: string;
}

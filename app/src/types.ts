export type PosteTypeCode = 'signaleur' | 'medical' | 'eau' | 'nourriture';
export type PosteStatut = 'desactive' | 'non_active' | 'en_place' | 'alerte' | 'ferme';

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
  notes: string | null;
  statut: PosteStatut;
  statut_updated_at: string;
  created_at: string;
}

export interface PosteParcours {
  poste_id: string;
  parcours_id: string;
}

export interface Benevole {
  id: string;
  nom: string;
  telephone: string | null;
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

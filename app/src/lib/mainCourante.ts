import { AppelantSpecial, Benevole, MainCouranteEvent, Poste } from '../types';

export const APPELANT_SPECIAL_LABELS: Record<AppelantSpecial, string> = {
  coureur: 'Coureur',
  croix_rouge: 'Croix-Rouge',
  autre: 'Autre',
};

export const JOURNAL_FIELD_LABELS: Record<string, string> = {
  date_evenement: 'Date',
  poste_origine_id: 'Poste',
  benevole_appelant_id: 'Appelant',
  appelant_special: 'Appelant (catégorie)',
  benevole_recepteur_id: 'Récepteur',
  course: 'Parcours',
  objet: 'Objet',
  dossard: 'Dossard',
  commentaire: 'Description',
  abandon: 'Abandon',
  date_depart: 'Date départ',
  lieu_depart: 'Lieu de départ',
  lieu_arrivee_attendue: "Lieu d'arrivée",
  heure_arrivee_estimee: "Heure estimée d'arrivée",
  lien_suivi_gps: 'Lien de suivi GPS',
  heure_arrivee_effective: "Heure d'arrivée effective",
  statut: 'Statut',
};

export function findName<T extends { id: string; nom: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id)?.nom ?? '(inconnu)';
}

export function formatPosteName(postes: Poste[], id: string) {
  const poste = postes.find((p) => p.id === id);
  return poste ? `N°${poste.numero} — ${poste.nom}` : '(poste supprimé)';
}

export function formatAppelant(
  benevoles: Benevole[],
  event: Pick<MainCouranteEvent, 'benevole_appelant_id' | 'appelant_special'>
) {
  if (event.appelant_special) return APPELANT_SPECIAL_LABELS[event.appelant_special];
  if (!event.benevole_appelant_id) return '—';
  return findName(benevoles, event.benevole_appelant_id);
}

export function formatJournalValue(champ: string, value: string | null, postes: Poste[], benevoles: Benevole[]): string {
  if (value == null) return '—';
  if (champ === 'poste_origine_id') return formatPosteName(postes, value);
  if (champ === 'benevole_appelant_id' || champ === 'benevole_recepteur_id') return findName(benevoles, value);
  if (champ === 'appelant_special') return APPELANT_SPECIAL_LABELS[value as AppelantSpecial] ?? value;
  if (champ === 'abandon') return value === 'true' ? 'Oui' : 'Non';
  return value;
}

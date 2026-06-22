import { useMemo, useState } from 'react';
import {
  Affectation,
  AppelantSpecial,
  Benevole,
  MainCouranteCommentaire,
  MainCouranteEvent,
  MainCouranteJournalEntry,
  MainCouranteStatus,
  Parcours,
  Poste,
} from '../types';
import { printMainCourante } from '../lib/print';

const POSTE_NUMERO_PC_SECURITE = 100;

const STATUTS: MainCouranteStatus[] = ['prise en charge en cours', 'pris en charge', 'terminé', 'abandonné'];

const STATUT_COLORS: Record<MainCouranteStatus, { header: string; accent: string }> = {
  'prise en charge en cours': { header: 'bg-orange-100 text-orange-800', accent: 'border-orange-400' },
  'pris en charge': { header: 'bg-blue-100 text-blue-800', accent: 'border-blue-400' },
  'terminé': { header: 'bg-green-100 text-green-800', accent: 'border-green-400' },
  'abandonné': { header: 'bg-gray-200 text-gray-700', accent: 'border-gray-400' },
};

const APPELANT_SPECIAL_OPTIONS: { value: AppelantSpecial; label: string }[] = [
  { value: 'coureur', label: 'Coureur' },
  { value: 'croix_rouge', label: 'Croix-Rouge' },
  { value: 'autre', label: 'Autre' },
];

const APPELANT_SPECIAL_LABELS: Record<AppelantSpecial, string> = {
  coureur: 'Coureur',
  croix_rouge: 'Croix-Rouge',
  autre: 'Autre',
};

function formatAppelant(benevoles: Benevole[], event: Pick<MainCouranteEvent, 'benevole_appelant_id' | 'appelant_special'>) {
  if (event.appelant_special) return APPELANT_SPECIAL_LABELS[event.appelant_special];
  if (!event.benevole_appelant_id) return '—';
  return findName(benevoles, event.benevole_appelant_id);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return value.slice(0, 10).split('-').reverse().join('/');
}

function formatTime(value?: string | null) {
  if (!value) return '—';
  return value.slice(0, 5);
}

function formatDatetime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function findName<T extends { id: string; nom: string }>(items: T[], id: string) {
  return items.find((item) => item.id === id)?.nom ?? '(inconnu)';
}

function formatPosteName(postes: Poste[], id: string) {
  const poste = postes.find((p) => p.id === id);
  return poste ? `N°${poste.numero} — ${poste.nom}` : '(poste supprimé)';
}

const JOURNAL_FIELD_LABELS: Record<string, string> = {
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
  lieu_depart: 'Lieu départ',
  lieu_arrivee_attendue: 'Lieu arrivée attendue',
  heure_arrivee_estimee: 'Heure arrivée estimée',
  heure_arrivee_effective: 'Heure arrivée effective',
  statut: 'Statut',
};

function formatJournalValue(champ: string, value: string | null, postes: Poste[], benevoles: Benevole[]): string {
  if (value == null) return '—';
  if (champ === 'poste_origine_id') return formatPosteName(postes, value);
  if (champ === 'benevole_appelant_id' || champ === 'benevole_recepteur_id') return findName(benevoles, value);
  if (champ === 'appelant_special') return APPELANT_SPECIAL_LABELS[value as AppelantSpecial] ?? value;
  if (champ === 'abandon') return value === 'true' ? 'Oui' : 'Non';
  return value;
}

interface MainCouranteTabProps {
  events: MainCouranteEvent[];
  postes: Poste[];
  benevoles: Benevole[];
  parcours: Parcours[];
  affectations: Affectation[];
  journal: MainCouranteJournalEntry[];
  commentaires: MainCouranteCommentaire[];
  onCreate: (data: Partial<MainCouranteEvent>) => Promise<MainCouranteEvent>;
  onUpdate: (id: string, data: Partial<MainCouranteEvent>) => Promise<MainCouranteEvent>;
  onDelete: (id: string) => Promise<MainCouranteEvent>;
  onAddCommentaire: (eventId: string, contenu: string) => Promise<MainCouranteCommentaire>;
}

const emptyForm: Partial<MainCouranteEvent> = {
  date_evenement: new Date().toISOString().slice(0, 10),
  course: '',
  objet: '',
  dossard: '',
  commentaire: '',
  abandon: false,
  date_depart: '',
  lieu_depart: '',
  lieu_arrivee_attendue: '',
  heure_arrivee_estimee: '',
  heure_arrivee_effective: '',
  statut: 'prise en charge en cours',
};

export default function MainCouranteTab({
  events,
  postes,
  benevoles,
  parcours,
  affectations,
  journal,
  commentaires,
  onCreate,
  onUpdate,
  onDelete,
  onAddCommentaire,
}: MainCouranteTabProps) {
  const [editingEvent, setEditingEvent] = useState<MainCouranteEvent | null>(null);
  const [form, setForm] = useState<Partial<MainCouranteEvent>>(emptyForm);
  const [showFormModal, setShowFormModal] = useState(false);
  const [viewingEventId, setViewingEventId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPosteId, setFilterPosteId] = useState('');
  const [filterAppelantId, setFilterAppelantId] = useState('');
  const [filterRecepteurId, setFilterRecepteurId] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const activityFeed = useMemo(() => {
    if (!viewingEventId) return [];
    const j = journal.filter((entry) => entry.event_id === viewingEventId).map((entry) => ({ ...entry, kind: 'journal' as const }));
    const c = commentaires.filter((entry) => entry.event_id === viewingEventId).map((entry) => ({ ...entry, kind: 'comment' as const }));
    return [...j, ...c].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [viewingEventId, journal, commentaires]);

  async function handleAddComment() {
    if (!viewingEventId || !newComment.trim()) return;
    await onAddCommentaire(viewingEventId, newComment.trim());
    setNewComment('');
  }

  const benevolesRecepteurs = useMemo(() => {
    const posteSecurite = postes.find((p) => p.numero === POSTE_NUMERO_PC_SECURITE);
    if (!posteSecurite) return [];
    const ids = new Set(affectations.filter((a) => a.poste_id === posteSecurite.id).map((a) => a.benevole_id));
    return benevoles.filter((b) => ids.has(b.id));
  }, [postes, affectations, benevoles]);

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events.filter((event) => {
      if (filterStatus !== 'all' && event.statut !== filterStatus) return false;
      if (filterPosteId && event.poste_origine_id !== filterPosteId) return false;
      if (filterAppelantId && event.benevole_appelant_id !== filterAppelantId) return false;
      if (filterRecepteurId && event.benevole_recepteur_id !== filterRecepteurId) return false;
      if (filterDate && event.date_evenement !== filterDate) return false;

      if (!term) return true;
      const posteName = formatPosteName(postes, event.poste_origine_id).toLowerCase();
      const appelantName = formatAppelant(benevoles, event).toLowerCase();
      const recepteurName = findName(benevoles, event.benevole_recepteur_id).toLowerCase();
      return [
        event.course,
        event.objet,
        event.commentaire,
        event.dossard,
        event.lieu_depart,
        event.lieu_arrivee_attendue,
        posteName,
        appelantName,
        recepteurName,
        event.statut,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [events, search, filterStatus, filterPosteId, filterAppelantId, filterRecepteurId, filterDate, postes, benevoles]);

  function setField<K extends keyof MainCouranteEvent>(field: K, value: MainCouranteEvent[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setEditingEvent(null);
    setForm(emptyForm);
  }

  function handleEdit(event: MainCouranteEvent) {
    setEditingEvent(event);
    setShowFormModal(true);
    setForm({
      date_evenement: event.date_evenement,
      poste_origine_id: event.poste_origine_id,
      benevole_appelant_id: event.benevole_appelant_id,
      appelant_special: event.appelant_special,
      benevole_recepteur_id: event.benevole_recepteur_id,
      course: event.course,
      objet: event.objet,
      dossard: event.dossard ?? '',
      commentaire: event.commentaire ?? '',
      abandon: event.abandon,
      date_depart: event.date_depart ?? '',
      lieu_depart: event.lieu_depart ?? '',
      lieu_arrivee_attendue: event.lieu_arrivee_attendue ?? '',
      heure_arrivee_estimee: event.heure_arrivee_estimee ?? '',
      heure_arrivee_effective: event.heure_arrivee_effective ?? '',
      statut: event.statut,
    });
  }

  async function handleSubmit() {
    const hasAppelant = !!form.benevole_appelant_id || !!form.appelant_special;
    if (!form.date_evenement || !form.poste_origine_id || !hasAppelant || !form.benevole_recepteur_id || !form.course || !form.objet) {
      alert('Les champs date, poste, appelant, récepteur, course et objet sont obligatoires.');
      return;
    }

    const record: Partial<MainCouranteEvent> = {
      date_evenement: form.date_evenement,
      poste_origine_id: form.poste_origine_id,
      benevole_appelant_id: form.benevole_appelant_id || null,
      appelant_special: form.appelant_special || null,
      benevole_recepteur_id: form.benevole_recepteur_id,
      course: form.course,
      objet: form.objet,
      dossard: form.dossard || null,
      commentaire: form.commentaire || null,
      abandon: !!form.abandon,
      date_depart: form.date_depart || null,
      lieu_depart: form.lieu_depart || null,
      lieu_arrivee_attendue: form.lieu_arrivee_attendue || null,
      heure_arrivee_estimee: form.heure_arrivee_estimee || null,
      heure_arrivee_effective: form.heure_arrivee_effective || null,
      statut: form.statut ?? 'prise en charge en cours',
    };

    try {
      if (editingEvent) {
        await onUpdate(editingEvent.id, record);
      } else {
        await onCreate(record);
      }
      resetForm();
      setShowFormModal(false);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l’enregistrement de l’événement.');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Confirmer la suppression de cet événement ?')) return;
    try {
      await onDelete(id);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression de l’événement.');
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="font-semibold text-lg">Main courante</h2>
          <p className="text-sm text-gray-500">Enregistrez et suivez les événements en direct.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border px-4 py-2 text-sm bg-green-600 text-white hover:bg-green-700"
            onClick={() => {
              resetForm();
              setShowFormModal(true);
            }}
          >
            Ajouter un évènement
          </button>
          <button
            type="button"
            className="rounded border px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => printMainCourante(filteredEvents, postes, benevoles)}
          >
            Exporter en PDF
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              className="border rounded px-2 py-2 text-sm"
              placeholder="Recherche..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="border rounded px-2 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">Tous statuts</option>
              {STATUTS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <input
              type="date"
              className="border rounded px-2 py-2 text-sm"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <select className="border rounded px-2 py-2 text-sm" value={filterPosteId} onChange={(e) => setFilterPosteId(e.target.value)}>
              <option value="">Tous postes</option>
              {postes.map((poste) => (
                <option key={poste.id} value={poste.id}>{`N°${poste.numero} — ${poste.nom}`}</option>
              ))}
            </select>
            <select className="border rounded px-2 py-2 text-sm" value={filterAppelantId} onChange={(e) => setFilterAppelantId(e.target.value)}>
              <option value="">Tous appelants</option>
              {benevoles.map((benevole) => (
                <option key={benevole.id} value={benevole.id}>{benevole.nom}</option>
              ))}
            </select>
            <select className="border rounded px-2 py-2 text-sm" value={filterRecepteurId} onChange={(e) => setFilterRecepteurId(e.target.value)}>
              <option value="">Tous récepteurs</option>
              {benevolesRecepteurs.map((benevole) => (
                <option key={benevole.id} value={benevole.id}>{benevole.nom}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showFormModal && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4"
          onClick={() => setShowFormModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-sm">{editingEvent ? 'Modifier un événement' : 'Ajouter un événement'}</h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <label className="space-y-1 text-sm">
            Date de l'événement
            <input
              type="date"
              className="border rounded px-2 py-2 w-full"
              value={form.date_evenement ?? ''}
              onChange={(e) => setField('date_evenement', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Poste d'origine
            <select
              className="border rounded px-2 py-2 w-full"
              value={form.poste_origine_id ?? ''}
              onChange={(e) => setField('poste_origine_id', e.target.value)}
            >
              <option value="">— Choisir un poste —</option>
              {postes.map((poste) => (
                <option key={poste.id} value={poste.id}>{`N°${poste.numero} — ${poste.nom}`}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Bénévole appelant
            <select
              className="border rounded px-2 py-2 w-full"
              value={form.benevole_appelant_id ?? form.appelant_special ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                const special = APPELANT_SPECIAL_OPTIONS.find((o) => o.value === value);
                if (special) {
                  setForm((c) => ({ ...c, appelant_special: special.value, benevole_appelant_id: null }));
                } else {
                  setForm((c) => ({ ...c, benevole_appelant_id: value || null, appelant_special: null }));
                }
              }}
            >
              <option value="">— Choisir un appelant —</option>
              {benevoles.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
              {APPELANT_SPECIAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Bénévole récepteur
            <select
              className="border rounded px-2 py-2 w-full"
              value={form.benevole_recepteur_id ?? ''}
              onChange={(e) => setField('benevole_recepteur_id', e.target.value)}
            >
              <option value="">— Choisir un bénévole —</option>
              {benevolesRecepteurs.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Parcours
            <select
              className="border rounded px-2 py-2 w-full"
              value={form.course ?? ''}
              onChange={(e) => setField('course', e.target.value)}
            >
              <option value="">— Choisir —</option>
              {parcours.map((p) => (
                <option key={p.id} value={p.nom}>{p.nom}</option>
              ))}
              <option value="Tous">Tous</option>
              <option value="Autre">Autre</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Objet
            <input
              type="text"
              className="border rounded px-2 py-2 w-full"
              value={form.objet ?? ''}
              onChange={(e) => setField('objet', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Dossard
            <input
              type="text"
              className="border rounded px-2 py-2 w-full"
              value={form.dossard ?? ''}
              onChange={(e) => setField('dossard', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm lg:col-span-3">
            Description
            <textarea
              rows={3}
              className="border rounded px-2 py-2 w-full"
              value={form.commentaire ?? ''}
              onChange={(e) => setField('commentaire', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Date départ
            <input
              type="date"
              className="border rounded px-2 py-2 w-full"
              value={form.date_depart ?? ''}
              onChange={(e) => setField('date_depart', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Lieu départ
            <input
              type="text"
              className="border rounded px-2 py-2 w-full"
              value={form.lieu_depart ?? ''}
              onChange={(e) => setField('lieu_depart', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Lieu arrivée attendue
            <input
              type="text"
              className="border rounded px-2 py-2 w-full"
              value={form.lieu_arrivee_attendue ?? ''}
              onChange={(e) => setField('lieu_arrivee_attendue', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Heure arrivée estimée
            <input
              type="time"
              className="border rounded px-2 py-2 w-full"
              value={form.heure_arrivee_estimee ?? ''}
              onChange={(e) => setField('heure_arrivee_estimee', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Heure arrivée effective
            <input
              type="time"
              className="border rounded px-2 py-2 w-full"
              value={form.heure_arrivee_effective ?? ''}
              onChange={(e) => setField('heure_arrivee_effective', e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            Statut
            <select
              className="border rounded px-2 py-2 w-full"
              value={form.statut ?? 'prise en charge en cours'}
              onChange={(e) => setField('statut', e.target.value as MainCouranteStatus)}
            >
              {STATUTS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!form.abandon}
              onChange={(e) => setField('abandon', e.target.checked)}
            />
            Abandon
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button type="button" className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700" onClick={handleSubmit}>
            {editingEvent ? 'Mettre à jour' : 'Ajouter'}
          </button>
          <button type="button" className="rounded border px-4 py-2 text-sm" onClick={resetForm}>
            Réinitialiser
          </button>
        </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        {STATUTS.map((status) => {
          const colEvents = filteredEvents.filter((event) => event.statut === status);
          const colors = STATUT_COLORS[status];
          return (
            <div key={status} className="flex flex-col rounded border bg-gray-50 min-h-[200px]">
              <div className={`px-3 py-2 rounded-t font-semibold text-sm flex items-center justify-between ${colors.header}`}>
                <span>{status}</span>
                <span className="text-xs rounded-full bg-white/70 px-2 py-0.5">{colEvents.length}</span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {colEvents.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Aucun événement.</p>
                ) : (
                  colEvents.map((event) => (
                    <div key={event.id} className={`bg-white rounded shadow-sm border-l-4 ${colors.accent} p-3 text-sm space-y-1`}>
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold break-words">{event.objet}</span>
                        {event.dossard && (
                          <span className="text-xs rounded bg-gray-100 px-1.5 py-0.5 whitespace-nowrap">#{event.dossard}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(event.date_evenement)} · {formatDatetime(event.created_at)}</div>
                      <div className="text-xs text-gray-600">{formatPosteName(postes, event.poste_origine_id)}</div>
                      {event.course && <div className="text-xs text-gray-600">Parcours : {event.course}</div>}
                      <div className="text-xs text-gray-600">
                        {formatAppelant(benevoles, event)} → {findName(benevoles, event.benevole_recepteur_id)}
                      </div>
                      {event.abandon && (
                        <span className="inline-block text-xs rounded bg-red-100 text-red-700 px-1.5 py-0.5">Abandon</span>
                      )}
                      {(event.lieu_arrivee_attendue || event.heure_arrivee_estimee || event.heure_arrivee_effective) && (
                        <div className="text-xs text-gray-600">
                          Arrivée {event.lieu_arrivee_attendue ?? ''}
                          {event.heure_arrivee_effective
                            ? ` (effective ${formatTime(event.heure_arrivee_effective)})`
                            : event.heure_arrivee_estimee
                            ? ` (estimée ${formatTime(event.heure_arrivee_estimee)})`
                            : ''}
                        </div>
                      )}
                      {event.commentaire && <div className="text-xs text-gray-500 italic break-words">{event.commentaire}</div>}
                      <div className="flex gap-2 pt-1">
                        <button className="text-blue-600 text-xs" onClick={() => handleEdit(event)}>
                          Modifier
                        </button>
                        <button className="text-gray-600 text-xs" onClick={() => setViewingEventId(event.id)}>
                          Activité (
                          {journal.filter((j) => j.event_id === event.id).length +
                            commentaires.filter((c) => c.event_id === event.id).length}
                          )
                        </button>
                        <button className="text-red-600 text-xs" onClick={() => handleDelete(event.id)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {viewingEventId && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4"
          onClick={() => setViewingEventId(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full p-5 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-sm">Activité</h3>
              <button
                type="button"
                onClick={() => setViewingEventId(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 mb-3">
              {activityFeed.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune activité pour le moment.</p>
              ) : (
                activityFeed.map((item) =>
                  item.kind === 'comment' ? (
                    <div key={item.id} className="bg-blue-50 rounded p-2 text-sm">
                      <div className="text-xs text-gray-500 mb-0.5">{formatDatetime(item.created_at)} · {item.created_by}</div>
                      <div className="break-words">{item.contenu}</div>
                    </div>
                  ) : (
                    <div key={item.id} className="text-xs text-gray-500 border-l-2 border-gray-200 pl-2">
                      {formatDatetime(item.created_at)} · {item.created_by} — {JOURNAL_FIELD_LABELS[item.champ] ?? item.champ} :{' '}
                      {formatJournalValue(item.champ, item.ancienne_valeur, postes, benevoles)} →{' '}
                      {formatJournalValue(item.champ, item.nouvelle_valeur, postes, benevoles)}
                    </div>
                  )
                )
              )}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <textarea
                rows={2}
                className="border rounded px-2 py-1 w-full text-sm"
                placeholder="Ajouter un commentaire…"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                type="button"
                className="rounded bg-blue-600 text-white px-3 text-sm self-end py-1.5 hover:bg-blue-700"
                onClick={handleAddComment}
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

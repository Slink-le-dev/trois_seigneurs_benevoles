import { useMemo, useState } from 'react';
import { Affectation, MainCouranteEvent, MainCouranteStatus, Benevole, Poste } from '../types';
import { printMainCourante } from '../lib/print';

const POSTE_NUMERO_PC_SECURITE = 100;

const STATUTS: MainCouranteStatus[] = ['en cours', 'terminé', 'abandonné'];

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

interface MainCouranteTabProps {
  events: MainCouranteEvent[];
  postes: Poste[];
  benevoles: Benevole[];
  affectations: Affectation[];
  onCreate: (data: Partial<MainCouranteEvent>) => Promise<MainCouranteEvent>;
  onUpdate: (id: string, data: Partial<MainCouranteEvent>) => Promise<MainCouranteEvent>;
  onDelete: (id: string) => Promise<MainCouranteEvent>;
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
  statut: 'en cours',
};

export default function MainCouranteTab({ events, postes, benevoles, affectations, onCreate, onUpdate, onDelete }: MainCouranteTabProps) {
  const [editingEvent, setEditingEvent] = useState<MainCouranteEvent | null>(null);
  const [form, setForm] = useState<Partial<MainCouranteEvent>>(emptyForm);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPosteId, setFilterPosteId] = useState('');
  const [filterAppelantId, setFilterAppelantId] = useState('');
  const [filterRecepteurId, setFilterRecepteurId] = useState('');
  const [filterDate, setFilterDate] = useState('');

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
      const appelantName = findName(benevoles, event.benevole_appelant_id).toLowerCase();
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
    setForm({
      date_evenement: event.date_evenement,
      poste_origine_id: event.poste_origine_id,
      benevole_appelant_id: event.benevole_appelant_id,
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
    if (!form.date_evenement || !form.poste_origine_id || !form.benevole_appelant_id || !form.benevole_recepteur_id || !form.course || !form.objet) {
      alert('Les champs date, poste, appelant, récepteur, course et objet sont obligatoires.');
      return;
    }

    const record: Partial<MainCouranteEvent> = {
      date_evenement: form.date_evenement,
      poste_origine_id: form.poste_origine_id,
      benevole_appelant_id: form.benevole_appelant_id,
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
      statut: form.statut ?? 'en cours',
    };

    try {
      if (editingEvent) {
        await onUpdate(editingEvent.id, record);
      } else {
        await onCreate(record);
      }
      resetForm();
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
        <button
          type="button"
          className="rounded border px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => printMainCourante(filteredEvents, postes, benevoles)}
        >
          Exporter en PDF
        </button>
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

      <div className="border rounded p-4 bg-white shadow-sm">
        <h3 className="font-semibold mb-3 text-sm">{editingEvent ? 'Modifier un événement' : 'Ajouter un événement'}</h3>
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
              value={form.benevole_appelant_id ?? ''}
              onChange={(e) => setField('benevole_appelant_id', e.target.value)}
            >
              <option value="">— Choisir un bénévole —</option>
              {benevoles.map((b) => (
                <option key={b.id} value={b.id}>{b.nom}</option>
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
            Course
            <input
              type="text"
              className="border rounded px-2 py-2 w-full"
              value={form.course ?? ''}
              onChange={(e) => setField('course', e.target.value)}
            />
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
            Commentaire
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
              value={form.statut ?? 'en cours'}
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

      <div className="overflow-x-auto border rounded bg-white shadow-sm">
        <table className="min-w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="whitespace-nowrap px-2 py-2 border-b">Date</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Heure saisie</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Poste</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Appelant</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Récepteur</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Course</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Objet</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Dossard</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Abandon</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Départ</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Lieu départ</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Arrivée attendue</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Arrivée estimée</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Arrivée effective</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Statut</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Commentaire</th>
              <th className="whitespace-nowrap px-2 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={17} className="p-4 text-center text-gray-500">Aucun événement correspondant.</td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-2 py-2 align-top">{formatDate(event.date_evenement)}</td>
                  <td className="px-2 py-2 align-top">{formatDatetime(event.created_at)}</td>
                  <td className="px-2 py-2 align-top">{formatPosteName(postes, event.poste_origine_id)}</td>
                  <td className="px-2 py-2 align-top">{findName(benevoles, event.benevole_appelant_id)}</td>
                  <td className="px-2 py-2 align-top">{findName(benevoles, event.benevole_recepteur_id)}</td>
                  <td className="px-2 py-2 align-top">{event.course}</td>
                  <td className="px-2 py-2 align-top">{event.objet}</td>
                  <td className="px-2 py-2 align-top">{event.dossard ?? '—'}</td>
                  <td className="px-2 py-2 align-top">{event.abandon ? 'Oui' : 'Non'}</td>
                  <td className="px-2 py-2 align-top">{event.date_depart ? formatDate(event.date_depart) : '—'}</td>
                  <td className="px-2 py-2 align-top">{event.lieu_depart ?? '—'}</td>
                  <td className="px-2 py-2 align-top">{event.lieu_arrivee_attendue ?? '—'}</td>
                  <td className="px-2 py-2 align-top">{formatTime(event.heure_arrivee_estimee)}</td>
                  <td className="px-2 py-2 align-top">{formatTime(event.heure_arrivee_effective)}</td>
                  <td className="px-2 py-2 align-top">{event.statut}</td>
                  <td className="px-2 py-2 align-top break-words max-w-xs">{event.commentaire ?? '—'}</td>
                  <td className="px-2 py-2 align-top whitespace-nowrap">
                    <button className="text-blue-600 text-xs mr-2" onClick={() => handleEdit(event)}>
                      Modifier
                    </button>
                    <button className="text-red-600 text-xs" onClick={() => handleDelete(event.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

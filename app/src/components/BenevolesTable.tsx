import { useMemo, useState } from 'react';
import { formatCreneau } from '../lib/format';
import { Affectation, Benevole, Poste } from '../types';
import BenevoleModal from './BenevoleModal';

type SortColumn = 'nom' | 'telephone' | 'affectations';

interface BenevolesTableProps {
  benevoles: Benevole[];
  affectations: Affectation[];
  postes: Poste[];
  onCreateBenevole: (data: Partial<Benevole>) => Promise<Benevole>;
  onUpdateBenevole: (id: string, data: Partial<Benevole>) => Promise<void>;
  onDeleteBenevole: (id: string) => Promise<void>;
  onCreateAffectation: (data: Partial<Affectation>) => Promise<Affectation>;
  onDeleteAffectation: (id: string) => Promise<void>;
}

export default function BenevolesTable({
  benevoles,
  affectations,
  postes,
  onCreateBenevole,
  onUpdateBenevole,
  onDeleteBenevole,
  onCreateAffectation,
  onDeleteAffectation,
}: BenevolesTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [posteId, setPosteId] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');
  const [editingBenevole, setEditingBenevole] = useState<Benevole | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>('nom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const posteName = (id: string) => {
    const p = postes.find((p) => p.id === id);
    return p ? `N°${p.numero} — ${p.nom}` : '(poste supprimé)';
  };

  const affectationsLabel = (benevoleId: string) =>
    affectations
      .filter((a) => a.benevole_id === benevoleId)
      .map((a) => posteName(a.poste_id))
      .sort()
      .join(', ');

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  function sortIndicator(column: SortColumn) {
    if (sortColumn !== column) return null;
    return <span className="text-gray-400"> {sortDirection === 'asc' ? '▲' : '▼'}</span>;
  }

  const sortedBenevoles = useMemo(() => {
    const sortValue = (b: Benevole) => {
      if (sortColumn === 'nom') return b.nom;
      if (sortColumn === 'telephone') return b.telephone ?? '';
      return affectationsLabel(b.id);
    };
    const sorted = [...benevoles].sort((a, b) => sortValue(a).localeCompare(sortValue(b), 'fr', { sensitivity: 'base' }));
    if (sortDirection === 'desc') sorted.reverse();
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benevoles, affectations, postes, sortColumn, sortDirection]);

  async function handleAdd() {
    if (!nom.trim()) {
      alert('Le nom est obligatoire.');
      return;
    }
    const benevole = await onCreateBenevole({ nom: nom.trim(), telephone: telephone.trim() || null });
    if (posteId) {
      await onCreateAffectation({
        benevole_id: benevole.id,
        poste_id: posteId,
        heure_debut: heureDebut || null,
        heure_fin: heureFin || null,
      });
    }
    setNom('');
    setTelephone('');
    setPosteId('');
    setShowForm(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-sm uppercase text-gray-500">Bénévoles</h2>
        <button className="px-2 py-1 text-sm border rounded hover:bg-gray-50" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annuler' : '+ Ajouter un bénévole'}
        </button>
      </div>

      {showForm && (
        <div className="border rounded p-3 mb-3 space-y-2 text-sm">
          <input className="border rounded px-2 py-1 w-full" placeholder="Nom (obligatoire)" value={nom} onChange={(e) => setNom(e.target.value)} />
          <input
            className="border rounded px-2 py-1 w-full"
            placeholder="Téléphone (optionnel)"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
          />
          <select className="border rounded px-2 py-1 w-full" value={posteId} onChange={(e) => setPosteId(e.target.value)}>
            <option value="">— Poste affecté (optionnel) —</option>
            {postes.map((p) => (
              <option key={p.id} value={p.id}>
                N°{p.numero} — {p.nom}
              </option>
            ))}
          </select>
          {posteId && (
            <div className="flex gap-2">
              <label className="flex-1">
                Début (optionnel)
                <input type="time" className="border rounded px-2 py-1 w-full" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
              </label>
              <label className="flex-1">
                Fin (optionnel)
                <input type="time" className="border rounded px-2 py-1 w-full" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
              </label>
            </div>
          )}
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAdd}>
            Enregistrer
          </button>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-1 cursor-pointer select-none hover:text-blue-700" onClick={() => handleSort('nom')}>
              Nom{sortIndicator('nom')}
            </th>
            <th className="cursor-pointer select-none hover:text-blue-700" onClick={() => handleSort('telephone')}>
              Téléphone{sortIndicator('telephone')}
            </th>
            <th className="cursor-pointer select-none hover:text-blue-700" onClick={() => handleSort('affectations')}>
              Affectations{sortIndicator('affectations')}
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedBenevoles.map((b) => {
            const affs = affectations.filter((a) => a.benevole_id === b.id);
            return (
              <tr key={b.id} className="border-b align-top">
                <td className="py-1">{b.nom}</td>
                <td>{b.telephone ?? <span className="text-gray-400">—</span>}</td>
                <td>
                  {affs.length === 0 ? (
                    <span className="text-gray-400">aucune</span>
                  ) : (
                    <ul>
                      {affs.map((a) => {
                        const creneau = formatCreneau(a.heure_debut, a.heure_fin);
                        return (
                          <li key={a.id} className="flex items-center gap-2">
                            {posteName(a.poste_id)}
                            {creneau ? ` (${creneau})` : ''}
                            <button className="text-red-500 text-xs" onClick={() => onDeleteAffectation(a.id)}>
                              retirer
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  <button className="text-blue-600 text-xs mr-2" onClick={() => setEditingBenevole(b)}>
                    Modifier
                  </button>
                  <button className="text-red-600 text-xs" onClick={() => onDeleteBenevole(b.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editingBenevole && (
        <BenevoleModal
          benevole={editingBenevole}
          affectations={affectations}
          postes={postes}
          onClose={() => setEditingBenevole(null)}
          onUpdate={onUpdateBenevole}
          onCreateAffectation={onCreateAffectation}
          onDeleteAffectation={onDeleteAffectation}
        />
      )}
    </div>
  );
}

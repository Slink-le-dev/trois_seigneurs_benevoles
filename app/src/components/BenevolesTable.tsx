import { useState } from 'react';
import { Affectation, Benevole, Poste } from '../types';

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
  const [heureDebut, setHeureDebut] = useState('08:00');
  const [heureFin, setHeureFin] = useState('14:00');

  const posteName = (id: string) => {
    const p = postes.find((p) => p.id === id);
    return p ? `N°${p.numero} — ${p.nom}` : '(poste supprimé)';
  };

  async function handleAdd() {
    if (!nom.trim()) {
      alert('Le nom est obligatoire.');
      return;
    }
    const benevole = await onCreateBenevole({ nom: nom.trim(), telephone: telephone.trim() || null });
    if (posteId) {
      await onCreateAffectation({ benevole_id: benevole.id, poste_id: posteId, heure_debut: heureDebut, heure_fin: heureFin });
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
                Début
                <input type="time" className="border rounded px-2 py-1 w-full" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
              </label>
              <label className="flex-1">
                Fin
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
            <th className="py-1">Nom</th>
            <th>Téléphone</th>
            <th>Affectations</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {benevoles.map((b) => {
            const affs = affectations.filter((a) => a.benevole_id === b.id);
            return (
              <tr key={b.id} className="border-b align-top">
                <td className="py-1">
                  <input
                    className="border rounded px-1 py-0.5 w-28"
                    defaultValue={b.nom}
                    onBlur={(e) => e.target.value !== b.nom && onUpdateBenevole(b.id, { nom: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    className="border rounded px-1 py-0.5 w-28"
                    defaultValue={b.telephone ?? ''}
                    placeholder="—"
                    onBlur={(e) => e.target.value !== (b.telephone ?? '') && onUpdateBenevole(b.id, { telephone: e.target.value || null })}
                  />
                </td>
                <td>
                  {affs.length === 0 ? (
                    <span className="text-gray-400">aucune</span>
                  ) : (
                    <ul>
                      {affs.map((a) => (
                        <li key={a.id} className="flex items-center gap-2">
                          {posteName(a.poste_id)} ({a.heure_debut.slice(0, 5)}–{a.heure_fin.slice(0, 5)})
                          <button className="text-red-500 text-xs" onClick={() => onDeleteAffectation(a.id)}>
                            retirer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
                <td>
                  <button className="text-red-600 text-xs" onClick={() => onDeleteBenevole(b.id)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { useState } from 'react';
import { formatCreneau } from '../lib/format';
import { Affectation, BENEVOLE_FORMATIONS, Benevole, BenevoleFormation, Poste } from '../types';

interface BenevoleModalProps {
  benevole: Benevole;
  affectations: Affectation[];
  postes: Poste[];
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Benevole>) => Promise<void>;
  onCreateAffectation: (data: Partial<Affectation>) => Promise<Affectation>;
  onDeleteAffectation: (id: string) => Promise<void>;
}

export default function BenevoleModal({
  benevole,
  affectations,
  postes,
  onClose,
  onUpdate,
  onCreateAffectation,
  onDeleteAffectation,
}: BenevoleModalProps) {
  const [nom, setNom] = useState(benevole.nom);
  const [telephone, setTelephone] = useState(benevole.telephone ?? '');
  const [formation, setFormation] = useState<BenevoleFormation>(benevole.formation);
  const [saving, setSaving] = useState(false);
  const [showAddAffectation, setShowAddAffectation] = useState(false);
  const [posteId, setPosteId] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');

  const benevoleAffectations = affectations.filter((a) => a.benevole_id === benevole.id);

  const posteName = (id: string) => {
    const p = postes.find((p) => p.id === id);
    return p ? `N°${p.numero} — ${p.nom}` : '(poste supprimé)';
  };

  async function handleSave() {
    if (!nom.trim()) {
      alert('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      await onUpdate(benevole.id, { nom: nom.trim(), telephone: telephone.trim() || null, formation });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddAffectation() {
    if (!posteId) {
      alert('Choisissez un poste.');
      return;
    }
    await onCreateAffectation({
      benevole_id: benevole.id,
      poste_id: posteId,
      heure_debut: heureDebut || null,
      heure_fin: heureFin || null,
    });
    setPosteId('');
    setShowAddAffectation(false);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Modifier le bénévole</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <label className="block">
            Nom
            <input
              className="border rounded w-full px-2 py-1 mt-1"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            Téléphone
            <input
              className="border rounded w-full px-2 py-1 mt-1"
              placeholder="(optionnel)"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </label>
          <label className="block">
            Formation
            <select
              className="border rounded w-full px-2 py-1 mt-1"
              value={formation}
              onChange={(e) => setFormation(e.target.value as BenevoleFormation)}
            >
              {BENEVOLE_FORMATIONS.map((f) => (
                <option key={f.code} value={f.code}>{f.label}</option>
              ))}
            </select>
          </label>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Affectations :</span>
              <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={() => setShowAddAffectation((v) => !v)}>
                {showAddAffectation ? 'Annuler' : '+ Ajouter'}
              </button>
            </div>

            {showAddAffectation && (
              <div className="border rounded p-2 mt-2 space-y-2">
                <select className="border rounded px-2 py-1 w-full" value={posteId} onChange={(e) => setPosteId(e.target.value)}>
                  <option value="">— Poste —</option>
                  {postes.map((p) => (
                    <option key={p.id} value={p.id}>
                      N°{p.numero} — {p.nom}
                    </option>
                  ))}
                </select>
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
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAddAffectation}>
                  Ajouter
                </button>
              </div>
            )}

            {benevoleAffectations.length === 0 ? (
              <p className="text-gray-400 mt-1">Aucune affectation</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {benevoleAffectations.map((a) => {
                  const creneau = formatCreneau(a.heure_debut, a.heure_fin);
                  return (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>
                        {posteName(a.poste_id)}
                        {creneau ? ` (${creneau})` : ''}
                      </span>
                      <button className="text-red-500 text-xs" onClick={() => onDeleteAffectation(a.id)}>
                        retirer
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-3 border-t">
          <button className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" onClick={onClose}>
            Annuler
          </button>
          <button className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

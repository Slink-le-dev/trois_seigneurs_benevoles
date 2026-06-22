import { useState } from 'react';
import { formatCreneau } from '../lib/format';
import { printFeuilleDeRoute } from '../lib/print';
import { Affectation, Benevole, Parcours, POSTE_STATUTS, POSTE_TYPES, Poste, PosteStatut, PosteTypeCode } from '../types';
import NavButtons from './NavButtons';

interface PosteFormProps {
  poste: Poste;
  parcours: Parcours[];
  selectedParcoursIds: string[];
  affectations: Affectation[];
  benevoles: Benevole[];
  isAdmin: boolean;
  onClose: () => void;
  onUpdate?: (data: Partial<Poste>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSetParcoursIds?: (ids: string[]) => Promise<void>;
  onSetStatut?: (statut: PosteStatut) => Promise<void>;
  onCreateBenevole?: (data: Partial<Benevole>) => Promise<Benevole>;
  onCreateAffectation?: (data: Partial<Affectation>) => Promise<Affectation>;
  onDeleteAffectation?: (id: string) => Promise<void>;
}

export default function PosteForm({
  poste,
  parcours,
  selectedParcoursIds,
  affectations,
  benevoles,
  isAdmin,
  onClose,
  onUpdate,
  onDelete,
  onSetParcoursIds,
  onSetStatut,
  onCreateBenevole,
  onCreateAffectation,
  onDeleteAffectation,
}: PosteFormProps) {
  const [showAddBenevole, setShowAddBenevole] = useState(false);
  const [benevoleChoice, setBenevoleChoice] = useState('__new__');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');

  const posteAffectations = affectations.filter((a) => a.poste_id === poste.id);
  const statutInfo = POSTE_STATUTS.find((s) => s.code === poste.statut)!;

  async function handleAddBenevole() {
    let benevoleId = benevoleChoice;
    if (benevoleChoice === '__new__') {
      if (!nom.trim() || !telephone.trim()) {
        alert('Nom et téléphone obligatoires.');
        return;
      }
      const b = await onCreateBenevole!({ nom: nom.trim(), telephone: telephone.trim() });
      benevoleId = b.id;
    }
    await onCreateAffectation!({
      benevole_id: benevoleId,
      poste_id: poste.id,
      heure_debut: heureDebut || null,
      heure_fin: heureFin || null,
    });
    setShowAddBenevole(false);
    setNom('');
    setTelephone('');
    setBenevoleChoice('__new__');
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3 gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm text-gray-500 whitespace-nowrap">
                N°
                <input
                  type="number"
                  className="w-16 ml-1 border rounded px-2 py-1 text-sm"
                  defaultValue={poste.numero}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v !== poste.numero) onUpdate?.({ numero: v });
                  }}
                />
              </label>
              <input
                className="text-lg font-semibold border rounded px-2 py-1 flex-1"
                defaultValue={poste.nom}
                onBlur={(e) => e.target.value !== poste.nom && onUpdate?.({ nom: e.target.value })}
              />
            </div>
          ) : (
            <h2 className="text-lg font-semibold">
              N°{poste.numero} — {poste.nom}
            </h2>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="mb-3">
          <span
            className="inline-block px-2 py-1 rounded text-white text-sm font-medium"
            style={{ backgroundColor: statutInfo.couleur }}
          >
            {statutInfo.label}
          </span>
          {poste.statut_updated_at && (
            <span className="text-xs text-gray-400 ml-2">
              maj {new Date(poste.statut_updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {isAdmin && (
          <div className="mb-4 grid grid-cols-2 gap-2">
            {POSTE_STATUTS.map((s) => (
              <button
                key={s.code}
                onClick={() => onSetStatut?.(s.code)}
                className="py-3 rounded text-white text-sm font-medium active:scale-95"
                style={{ backgroundColor: s.couleur, opacity: poste.statut === s.code ? 1 : 0.55 }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Coordonnées GPS : </span>
            {isAdmin ? (
              <span className="inline-flex gap-1">
                <input
                  type="number"
                  step="0.00001"
                  className="border rounded px-1 w-28"
                  defaultValue={poste.lat}
                  onBlur={(e) => onUpdate?.({ lat: Number(e.target.value) })}
                />
                <input
                  type="number"
                  step="0.00001"
                  className="border rounded px-1 w-28"
                  defaultValue={poste.lng}
                  onBlur={(e) => onUpdate?.({ lng: Number(e.target.value) })}
                />
              </span>
            ) : (
              <span>
                {poste.lat.toFixed(5)}, {poste.lng.toFixed(5)}
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-500">Parcours : </span>
            {isAdmin ? (
              <span className="inline-flex gap-3 flex-wrap">
                {parcours.map((p) => (
                  <label key={p.id} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedParcoursIds.includes(p.id)}
                      onChange={() => {
                        const next = selectedParcoursIds.includes(p.id)
                          ? selectedParcoursIds.filter((id) => id !== p.id)
                          : [...selectedParcoursIds, p.id];
                        onSetParcoursIds?.(next);
                      }}
                    />
                    {p.nom}
                  </label>
                ))}
              </span>
            ) : (
              <span>{parcours.filter((p) => selectedParcoursIds.includes(p.id)).map((p) => p.nom).join(', ') || '—'}</span>
            )}
          </div>

          <div>
            <span className="text-gray-500">Type(s) : </span>
            {isAdmin ? (
              <span className="inline-flex gap-3 flex-wrap">
                {POSTE_TYPES.map((t) => (
                  <label key={t.code} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={poste.types.includes(t.code)}
                      onChange={() => {
                        const next: PosteTypeCode[] = poste.types.includes(t.code)
                          ? poste.types.filter((c) => c !== t.code)
                          : [...poste.types, t.code];
                        onUpdate?.({ types: next });
                      }}
                    />
                    {t.emoji} {t.label}
                  </label>
                ))}
              </span>
            ) : (
              <span>
                {poste.types
                  .map((c) => POSTE_TYPES.find((t) => t.code === c))
                  .filter(Boolean)
                  .map((t) => `${t!.emoji} ${t!.label}`)
                  .join(', ') || '—'}
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-500 block mb-1">Notes :</span>
            {isAdmin ? (
              <textarea
                className="border rounded w-full px-2 py-1"
                rows={2}
                defaultValue={poste.notes ?? ''}
                onBlur={(e) => e.target.value !== (poste.notes ?? '') && onUpdate?.({ notes: e.target.value })}
              />
            ) : (
              <p>{poste.notes || '—'}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Bénévoles affectés :</span>
              {isAdmin && (
                <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={() => setShowAddBenevole((v) => !v)}>
                  {showAddBenevole ? 'Annuler' : '+ Ajouter'}
                </button>
              )}
            </div>

            {showAddBenevole && (
              <div className="border rounded p-2 mt-2 space-y-2 text-sm">
                <select className="border rounded px-2 py-1 w-full" value={benevoleChoice} onChange={(e) => setBenevoleChoice(e.target.value)}>
                  <option value="__new__">— Nouveau bénévole —</option>
                  {benevoles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nom}
                    </option>
                  ))}
                </select>
                {benevoleChoice === '__new__' && (
                  <>
                    <input className="border rounded px-2 py-1 w-full" placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
                    <input
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Téléphone"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                    />
                  </>
                )}
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
                <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleAddBenevole}>
                  Enregistrer
                </button>
              </div>
            )}

            {posteAffectations.length === 0 ? (
              <p className="text-gray-400 mt-1">Aucun bénévole affecté</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {posteAffectations.map((a) => {
                  const b = benevoles.find((x) => x.id === a.benevole_id);
                  const creneau = formatCreneau(a.heure_debut, a.heure_fin);
                  return (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>
                        {b?.nom ?? '?'}
                        {isAdmin && b?.telephone ? ` — ${b.telephone}` : ''}
                        {creneau ? ` (${creneau})` : ''}
                      </span>
                      {isAdmin && (
                        <button className="text-red-500 text-xs" onClick={() => onDeleteAffectation?.(a.id)}>
                          retirer
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-between mt-5 pt-3 border-t flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <NavButtons lat={poste.lat} lng={poste.lng} />
            <button
              className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
              onClick={() =>
                printFeuilleDeRoute(
                  poste,
                  parcours.filter((p) => selectedParcoursIds.includes(p.id)).map((p) => p.nom),
                  posteAffectations,
                  benevoles
                )
              }
            >
              Imprimer la feuille de route
            </button>
          </div>
          {isAdmin && (
            <button
              className="text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (confirm('Supprimer ce poste ?')) {
                  await onDelete?.();
                  onClose();
                }
              }}
            >
              Supprimer le poste
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

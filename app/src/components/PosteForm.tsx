import * as turf from '@turf/turf';
import { useEffect, useState } from 'react';
import { formatCreneau } from '../lib/format';
import { ParcoursInfoPrint, printFeuilleDeRoute } from '../lib/print';
import CopyCoords from './CopyCoords';
import {
  AbriTemporaire,
  Affectation,
  PointExtraction,
  BENEVOLE_FORMATIONS,
  Benevole,
  Parcours,
  POSTE_MATERIELS,
  POSTE_MISSIONS,
  POSTE_STATUTS,
  POSTE_TYPES,
  Poste,
  PosteMaterielCode,
  PosteMissionCode,
  PosteStatut,
  PosteTypeCode,
} from '../types';
import NavButtons from './NavButtons';

interface ParcoursStats {
  kmCumules: number;
  kmRestants: number;
  deniveleCumule: number | null;
  deniveleRestant: number | null;
  deniveleDescendeCumule: number | null;
  deniveleDescendeRestant: number | null;
  kmProchainRavitaillement: number | null;
}

function flattenGpxCoords(fc: GeoJSON.FeatureCollection): number[][] {
  const all: number[][] = [];
  for (const f of fc.features) {
    if (f.geometry?.type === 'LineString') {
      all.push(...(f.geometry as GeoJSON.LineString).coordinates);
    } else if (f.geometry?.type === 'MultiLineString') {
      for (const seg of (f.geometry as GeoJSON.MultiLineString).coordinates) all.push(...seg);
    }
  }
  return all;
}

function computeParcoursStats(
  poste: Poste,
  parcours: Parcours,
  allPostes: Poste[],
  getParcoursIdsForPoste: (id: string) => string[],
): ParcoursStats | null {
  if (!parcours.gpx_geojson) return null;
  const allCoords = flattenGpxCoords(parcours.gpx_geojson);
  if (allCoords.length < 2) return null;

  const coords2d = allCoords.map((c) => [c[0], c[1]] as [number, number]);
  const line = turf.lineString(coords2d);
  const postePoint = turf.point([poste.lng, poste.lat]);

  const nearest = turf.nearestPointOnLine(line, postePoint, { units: 'kilometers' });
  const location = nearest.properties.location ?? 0;
  const totalKm = turf.length(line, { units: 'kilometers' });
  const splitIndex = nearest.properties.index ?? 0;

  const kmCumules = Math.round(location * 10) / 10;
  const kmRestants = Math.round((totalKm - location) * 10) / 10;

  const hasElevation = allCoords[0].length >= 3;
  let deniveleCumule: number | null = null;
  let deniveleRestant: number | null = null;
  let deniveleDescendeCumule: number | null = null;
  let deniveleDescendeRestant: number | null = null;
  if (hasElevation) {
    let cumGain = 0;
    let cumDescente = 0;
    for (let i = 1; i <= splitIndex; i++) {
      const diff = (allCoords[i][2] ?? 0) - (allCoords[i - 1][2] ?? 0);
      if (diff > 0) cumGain += diff;
      else cumDescente += Math.abs(diff);
    }
    deniveleCumule = Math.round(cumGain);
    deniveleDescendeCumule = Math.round(cumDescente);
    let remGain = 0;
    let remDescente = 0;
    for (let i = splitIndex + 1; i < allCoords.length; i++) {
      const diff = (allCoords[i][2] ?? 0) - (allCoords[i - 1][2] ?? 0);
      if (diff > 0) remGain += diff;
      else remDescente += Math.abs(diff);
    }
    deniveleRestant = Math.round(remGain);
    deniveleDescendeRestant = Math.round(remDescente);
  }

  let kmProchainRavitaillement: number | null = null;
  const ravPostes = allPostes.filter(
    (p) =>
      p.id !== poste.id &&
      (p.types.includes('eau') || p.types.includes('nourriture')) &&
      getParcoursIdsForPoste(p.id).includes(parcours.id),
  );
  let minDist = Infinity;
  for (const rp of ravPostes) {
    const rpNearest = turf.nearestPointOnLine(line, turf.point([rp.lng, rp.lat]), { units: 'kilometers' });
    const diff = (rpNearest.properties.location ?? 0) - location;
    if (diff > 0.05 && diff < minDist) {
      minDist = diff;
      kmProchainRavitaillement = Math.round(diff * 10) / 10;
    }
  }

  return { kmCumules, kmRestants, deniveleCumule, deniveleRestant, deniveleDescendeCumule, deniveleDescendeRestant, kmProchainRavitaillement };
}

interface PosteFormProps {
  poste: Poste;
  parcours: Parcours[];
  selectedParcoursIds: string[];
  abrisTemporaires: AbriTemporaire[];
  selectedAbriIds: string[];
  pointsExtraction: PointExtraction[];
  selectedExtractionIds: string[];
  affectations: Affectation[];
  benevoles: Benevole[];
  isAdmin: boolean;
  onClose: () => void;
  onUpdate?: (data: Partial<Poste>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSetParcoursIds?: (ids: string[]) => Promise<void>;
  onSetAbriIds?: (ids: string[]) => Promise<void>;
  onSetExtractionIds?: (ids: string[]) => Promise<void>;
  onSetStatut?: (statut: PosteStatut) => Promise<void>;
  onCreateBenevole?: (data: Partial<Benevole>) => Promise<Benevole>;
  onCreateAffectation?: (data: Partial<Affectation>) => Promise<Affectation>;
  onDeleteAffectation?: (id: string) => Promise<void>;
  allPostes?: Poste[];
  getParcoursIdsForPoste?: (id: string) => string[];
  getBarriereHoraireForPoste?: (parcoursId: string) => string | null;
  onSetBarriereHoraire?: (parcoursId: string, value: string | null) => Promise<void>;
  showDenivele?: boolean;
}

export default function PosteForm({
  poste,
  parcours,
  selectedParcoursIds,
  abrisTemporaires,
  selectedAbriIds,
  pointsExtraction,
  selectedExtractionIds,
  affectations,
  benevoles,
  isAdmin,
  onClose,
  onUpdate,
  onDelete,
  onSetParcoursIds,
  onSetAbriIds,
  onSetExtractionIds,
  onSetStatut,
  onCreateBenevole,
  onCreateAffectation,
  onDeleteAffectation,
  allPostes,
  getParcoursIdsForPoste,
  getBarriereHoraireForPoste,
  onSetBarriereHoraire,
  showDenivele = true,
}: PosteFormProps) {
  const [showAddBenevole, setShowAddBenevole] = useState(false);
  const [benevoleChoice, setBenevoleChoice] = useState('__new__');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [heureDebut, setHeureDebut] = useState('');
  const [heureFin, setHeureFin] = useState('');

  function parseBarriere(v: string | null): { jour: string; heure: string } {
    if (!v) return { jour: '', heure: '' };
    const [jour, heure] = v.split(' ');
    return { jour: jour ?? '', heure: heure ?? '' };
  }

  const [barrieresEdit, setBarrieresEdit] = useState<Record<string, { jour: string; heure: string }>>(() => {
    const init: Record<string, { jour: string; heure: string }> = {};
    for (const pid of selectedParcoursIds) {
      init[pid] = parseBarriere(getBarriereHoraireForPoste?.(pid) ?? null);
    }
    return init;
  });
  const [barriereSaving, setBarriereSaving] = useState<Record<string, boolean>>({});
  const [barriereSaved, setBarriereSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setBarrieresEdit((prev) => {
      const next = { ...prev };
      for (const pid of selectedParcoursIds) {
        if (!(pid in next)) {
          next[pid] = parseBarriere(getBarriereHoraireForPoste?.(pid) ?? null);
        }
      }
      return next;
    });
  }, [selectedParcoursIds]);

  async function handleSaveBarriere(parcoursId: string) {
    if (!onSetBarriereHoraire) return;
    const { jour, heure } = barrieresEdit[parcoursId] ?? { jour: '', heure: '' };
    const value = jour && heure ? `${jour} ${heure}` : null;
    setBarriereSaving((p) => ({ ...p, [parcoursId]: true }));
    try {
      await onSetBarriereHoraire(parcoursId, value);
      setBarriereSaved((p) => ({ ...p, [parcoursId]: true }));
      setTimeout(() => setBarriereSaved((p) => ({ ...p, [parcoursId]: false })), 2000);
    } finally {
      setBarriereSaving((p) => ({ ...p, [parcoursId]: false }));
    }
  }

  function formatBarriere(v: string): string {
    const { jour, heure } = parseBarriere(v);
    const jourLabel = jour === '0' ? 'J' : `J+${jour}`;
    return `${jourLabel} à ${heure}`;
  }

  const posteAffectations = affectations.filter((a) => a.poste_id === poste.id);
  const materiel = poste.materiel ?? [];
  const missions = poste.missions ?? [];
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
              <span className="inline-flex gap-1 items-center">
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
                <CopyCoords lat={poste.lat} lng={poste.lng} />
              </span>
            ) : (
              <span>
                {poste.lat.toFixed(5)}, {poste.lng.toFixed(5)}
                <CopyCoords lat={poste.lat} lng={poste.lng} />
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-500">Parcours :</span>
            {isAdmin && (
              <span className="inline-flex gap-3 flex-wrap mt-1 ml-1">
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
            )}
            {!isAdmin && selectedParcoursIds.length === 0 && <span className="text-gray-400"> —</span>}
            <div className="space-y-2 mt-2">
              {parcours
                .filter((p) => selectedParcoursIds.includes(p.id))
                .map((p) => {
                  const stats =
                    allPostes && getParcoursIdsForPoste
                      ? computeParcoursStats(poste, p, allPostes, getParcoursIdsForPoste)
                      : null;
                  return (
                    <div key={p.id} className="rounded border p-2 bg-gray-50 text-xs">
                      <div className="font-semibold mb-1.5" style={{ color: p.couleur ?? '#374151' }}>
                        ● {p.nom}
                      </div>
                      {stats ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-gray-600">
                          <div>
                            Km cumulés : <strong>{stats.kmCumules} km</strong>
                          </div>
                          {stats.deniveleCumule !== null && showDenivele ? (
                            <div>
                              D+ cumulé : <strong>{stats.deniveleCumule} m</strong>
                            </div>
                          ) : (
                            <div />
                          )}
                          <div>
                            Km restants : <strong>{stats.kmRestants} km</strong>
                          </div>
                          {stats.deniveleRestant !== null && showDenivele ? (
                            <div>
                              D+ restant : <strong>{stats.deniveleRestant} m</strong>
                            </div>
                          ) : (
                            <div />
                          )}
                          {stats.deniveleDescendeCumule !== null && showDenivele ? (
                            <div>
                              D- cumulé : <strong>{stats.deniveleDescendeCumule} m</strong>
                            </div>
                          ) : (
                            <div />
                          )}
                          {stats.deniveleDescendeRestant !== null && showDenivele ? (
                            <div>
                              D- restant : <strong>{stats.deniveleDescendeRestant} m</strong>
                            </div>
                          ) : (
                            <div />
                          )}
                          <div className="col-span-2">
                            Prochain ravitaillement :{' '}
                            {stats.kmProchainRavitaillement !== null ? (
                              <strong>{stats.kmProchainRavitaillement} km</strong>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Trace GPX non disponible</span>
                      )}
                      {isAdmin && onSetBarriereHoraire ? (
                        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2 flex-wrap">
                          <span className="text-gray-500 flex-shrink-0">Barrière horaire :</span>
                          <select
                            value={barrieresEdit[p.id]?.jour ?? ''}
                            onChange={(e) =>
                              setBarrieresEdit((prev) => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], jour: e.target.value },
                              }))
                            }
                            className="border rounded px-1 py-0.5 text-xs"
                          >
                            <option value="">— jour —</option>
                            <option value="0">J</option>
                            <option value="1">J+1</option>
                            <option value="2">J+2</option>
                            <option value="3">J+3</option>
                          </select>
                          <input
                            type="time"
                            value={barrieresEdit[p.id]?.heure ?? ''}
                            disabled={!barrieresEdit[p.id]?.jour}
                            onChange={(e) =>
                              setBarrieresEdit((prev) => ({
                                ...prev,
                                [p.id]: { ...prev[p.id], heure: e.target.value },
                              }))
                            }
                            className="border rounded px-1 py-0.5 text-xs disabled:opacity-40"
                          />
                          <button
                            type="button"
                            disabled={barriereSaving[p.id]}
                            onClick={() => handleSaveBarriere(p.id)}
                            className="px-2 py-0.5 rounded bg-gray-700 text-white text-xs hover:bg-gray-800 disabled:opacity-50"
                          >
                            {barriereSaved[p.id] ? '✓ Enregistré' : 'Enregistrer'}
                          </button>
                        </div>
                      ) : (() => {
                        const bv = getBarriereHoraireForPoste?.(p.id) ?? null;
                        return bv ? (
                          <div className="mt-1.5 text-gray-600">
                            Barrière horaire : <strong>{formatBarriere(bv)}</strong>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  );
                })}
            </div>
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
            <span className="text-gray-500">Matériel disponible : </span>
            {isAdmin ? (
              <span className="inline-flex gap-3 flex-wrap">
                {POSTE_MATERIELS.map((m) => (
                  <label key={m.code} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={materiel.includes(m.code)}
                      onChange={() => {
                        const next: PosteMaterielCode[] = materiel.includes(m.code)
                          ? materiel.filter((c) => c !== m.code)
                          : [...materiel, m.code];
                        onUpdate?.({ materiel: next });
                      }}
                    />
                    {m.label}
                  </label>
                ))}
              </span>
            ) : (
              <span>
                {materiel
                  .map((c) => POSTE_MATERIELS.find((m) => m.code === c))
                  .filter(Boolean)
                  .map((m) => m!.label)
                  .join(', ') || '—'}
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-500 block mb-1">Missions :</span>
            {isAdmin ? (
              <div className="flex flex-col gap-1">
                {POSTE_MISSIONS.map((m) => (
                  <label key={m.code} className="inline-flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={missions.includes(m.code)}
                      onChange={() => {
                        const next: PosteMissionCode[] = missions.includes(m.code)
                          ? missions.filter((c) => c !== m.code)
                          : [...missions, m.code];
                        onUpdate?.({ missions: next });
                      }}
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            ) : missions.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5">
                {missions.map((c) => {
                  const m = POSTE_MISSIONS.find((x) => x.code === c);
                  return m ? <li key={c}>{m.label}</li> : null;
                })}
              </ul>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </div>

          <div>
            {isAdmin ? (
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!poste.point_passage_intermediaire}
                  onChange={(e) => onUpdate?.({ point_passage_intermediaire: e.target.checked })}
                />
                <span className="text-gray-500">Point de passage intermédiaire</span>
              </label>
            ) : (
              poste.point_passage_intermediaire && (
                <span className="inline-block px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                  📍 Point de passage intermédiaire
                </span>
              )
            )}
          </div>

          <div>
            <span className="text-gray-500 block mb-1">Plan d'évacuation :</span>

            <span className="text-gray-400 text-xs block mb-1">🏠 Abri temporaire</span>
            {isAdmin ? (
              abrisTemporaires.length === 0 ? (
                <span className="text-gray-400 text-xs">Aucun abri temporaire créé.</span>
              ) : (
                <div className="flex flex-col gap-1 mb-2">
                  {abrisTemporaires.map((a) => (
                    <label key={a.id} className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedAbriIds.includes(a.id)}
                        onChange={() => {
                          const next = selectedAbriIds.includes(a.id)
                            ? selectedAbriIds.filter((id) => id !== a.id)
                            : [...selectedAbriIds, a.id];
                          onSetAbriIds?.(next);
                        }}
                      />
                      N°{a.numero} — {a.nom}
                    </label>
                  ))}
                </div>
              )
            ) : selectedAbriIds.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5 mb-2">
                {selectedAbriIds.map((id) => {
                  const a = abrisTemporaires.find((x) => x.id === id);
                  return a ? <li key={id}>N°{a.numero} — {a.nom}</li> : null;
                })}
              </ul>
            ) : (
              <span className="text-gray-400 block mb-2">—</span>
            )}

            <span className="text-gray-400 text-xs block mb-1">🚑 Point d'extraction</span>
            {isAdmin ? (
              pointsExtraction.length === 0 ? (
                <span className="text-gray-400 text-xs">Aucun point d'extraction créé.</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {pointsExtraction.map((e) => (
                    <label key={e.id} className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={selectedExtractionIds.includes(e.id)}
                        onChange={() => {
                          const next = selectedExtractionIds.includes(e.id)
                            ? selectedExtractionIds.filter((id) => id !== e.id)
                            : [...selectedExtractionIds, e.id];
                          onSetExtractionIds?.(next);
                        }}
                      />
                      {e.lettre} — {e.libelle}
                    </label>
                  ))}
                </div>
              )
            ) : selectedExtractionIds.length > 0 ? (
              <ul className="list-disc list-inside space-y-0.5">
                {selectedExtractionIds.map((id) => {
                  const e = pointsExtraction.find((x) => x.id === id);
                  return e ? <li key={id}>{e.lettre} — {e.libelle}</li> : null;
                })}
              </ul>
            ) : (
              <span className="text-gray-400">—</span>
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
                  const formationLabel =
                    b && b.formation !== 'aucune' ? BENEVOLE_FORMATIONS.find((f) => f.code === b.formation)?.label : null;
                  return (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>
                        {b?.nom ?? '?'}
                        {isAdmin && b?.telephone ? ` — ${b.telephone}` : ''}
                        {creneau ? ` (${creneau})` : ''}
                        {formationLabel ? ` — ${formationLabel}` : ''}
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
                  parcours
                    .filter((p) => selectedParcoursIds.includes(p.id))
                    .map((p): ParcoursInfoPrint => {
                      const s =
                        allPostes && getParcoursIdsForPoste
                          ? computeParcoursStats(poste, p, allPostes, getParcoursIdsForPoste)
                          : null;
                      return {
                        nom: p.nom,
                        stats: s
                          ? {
                              kmCumules: s.kmCumules,
                              kmRestants: s.kmRestants,
                              kmProchainRavitaillement: s.kmProchainRavitaillement,
                            }
                          : undefined,
                      };
                    }),
                  posteAffectations,
                  benevoles,
                  abrisTemporaires.filter((a) => selectedAbriIds.includes(a.id)),
                  pointsExtraction.filter((e) => selectedExtractionIds.includes(e.id)),
                )
              }
            >
              Télécharger la fiche de mission
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

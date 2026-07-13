import * as turf from '@turf/turf';
import { Parcours, Poste, POSTE_TYPES } from '../types';

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

interface ParcoursStats {
  kmCumules: number;
  kmRestants: number;
  deniveleCumule: number | null;
  deniveleRestant: number | null;
  deniveleDescendeCumule: number | null;
  deniveleDescendeRestant: number | null;
  barriere: string | null;
}

function computeStats(
  poste: Poste,
  parcours: Parcours,
  barriere: string | null,
): ParcoursStats | null {
  if (!parcours.gpx_geojson) return null;
  const allCoords = flattenGpxCoords(parcours.gpx_geojson);
  if (allCoords.length < 2) return null;

  const coords2d = allCoords.map((c) => [c[0], c[1]] as [number, number]);
  const line = turf.lineString(coords2d);
  const nearest = turf.nearestPointOnLine(line, turf.point([poste.lng, poste.lat]), { units: 'kilometers' });
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
    let cumGain = 0, cumDescente = 0;
    for (let i = 1; i <= splitIndex; i++) {
      const diff = (allCoords[i][2] ?? 0) - (allCoords[i - 1][2] ?? 0);
      if (diff > 0) cumGain += diff; else cumDescente += Math.abs(diff);
    }
    deniveleCumule = Math.round(cumGain);
    deniveleDescendeCumule = Math.round(cumDescente);
    let remGain = 0, remDescente = 0;
    for (let i = splitIndex + 1; i < allCoords.length; i++) {
      const diff = (allCoords[i][2] ?? 0) - (allCoords[i - 1][2] ?? 0);
      if (diff > 0) remGain += diff; else remDescente += Math.abs(diff);
    }
    deniveleRestant = Math.round(remGain);
    deniveleDescendeRestant = Math.round(remDescente);
  }

  return { kmCumules, kmRestants, deniveleCumule, deniveleRestant, deniveleDescendeCumule, deniveleDescendeRestant, barriere };
}

function formatBarriere(v: string): string {
  const [date, heure] = v.split(' ');
  if (!date || !heure) return v;
  const d = new Date(`${date}T${heure}`);
  if (isNaN(d.getTime())) return v;
  const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dateStr} à ${heure}`;
}

interface PosteFormParticipantProps {
  poste: Poste;
  parcours: Parcours[];
  selectedParcoursId: string | null;
  getParcoursIdsForPoste: (id: string) => string[];
  getBarriereHoraireForPoste: (parcoursId: string) => string | null;
  showDenivele: boolean;
  onClose: () => void;
}

export default function PosteFormParticipant({
  poste,
  parcours,
  selectedParcoursId,
  getParcoursIdsForPoste,
  getBarriereHoraireForPoste,
  showDenivele,
  onClose,
}: PosteFormParticipantProps) {
  const linkedParcoursIds = getParcoursIdsForPoste(poste.id);
  const linkedParcours = parcours.filter((p) => linkedParcoursIds.includes(p.id));
  const displayedParcours = selectedParcoursId
    ? linkedParcours.filter((p) => p.id === selectedParcoursId)
    : linkedParcours;

  const types = POSTE_TYPES.filter((t) => poste.types.includes(t.code));
  const mapsUrl = `https://www.google.com/maps?q=${poste.lat},${poste.lng}`;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4 gap-2">
          <h2 className="text-lg font-semibold">
            N°{poste.numero} — {poste.nom}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none flex-shrink-0">
            ×
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Types */}
          {types.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {types.map((t) => (
                <span
                  key={t.code}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-medium"
                  style={{ backgroundColor: t.couleur }}
                >
                  {t.emoji} {t.label}
                </span>
              ))}
            </div>
          )}

          {/* GPS + Google Maps */}
          <div>
            <div className="text-gray-500 mb-1">Coordonnées GPS</div>
            <div className="text-gray-800 font-mono text-xs mb-2">
              {poste.lat.toFixed(5)}, {poste.lng.toFixed(5)}
            </div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Accéder avec Google Maps
            </a>
          </div>

          {/* Parcours stats */}
          {displayedParcours.length > 0 && (
            <div>
              <div className="text-gray-500 mb-2">Parcours</div>
              <div className="space-y-3">
                {displayedParcours.map((p) => {
                  const stats = computeStats(poste, p, getBarriereHoraireForPoste(p.id));
                  return (
                    <div key={p.id} className="rounded border p-2.5 bg-gray-50 text-xs">
                      <div className="font-semibold mb-2" style={{ color: p.couleur ?? '#374151' }}>
                        ● {p.nom}
                      </div>
                      {stats ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
                          <div>Km cumulés : <strong>{stats.kmCumules} km</strong></div>
                          <div>Km restants : <strong>{stats.kmRestants} km</strong></div>
                          {showDenivele && stats.deniveleCumule !== null && (
                            <>
                              <div>D+ cumulé : <strong>{stats.deniveleCumule} m</strong></div>
                              <div>D+ restant : <strong>{stats.deniveleRestant} m</strong></div>
                            </>
                          )}
                          {showDenivele && stats.deniveleDescendeCumule !== null && (
                            <>
                              <div>D- cumulé : <strong>{stats.deniveleDescendeCumule} m</strong></div>
                              <div>D- restant : <strong>{stats.deniveleDescendeRestant} m</strong></div>
                            </>
                          )}
                          {stats.barriere && (
                            <div className="col-span-2 mt-1 pt-1 border-t border-gray-200">
                              Barrière horaire : <strong>{formatBarriere(stats.barriere)}</strong>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">Trace GPX non disponible</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import * as turf from '@turf/turf';
import { useEffect, useState } from 'react';
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

function segmentElevation(
  allCoords: number[][],
  fromIdx: number,
  toIdx: number,
): { gain: number; descente: number } | null {
  if ((allCoords[0]?.length ?? 0) < 3) return null;
  let gain = 0, descente = 0;
  for (let i = fromIdx + 1; i <= toIdx; i++) {
    const diff = (allCoords[i][2] ?? 0) - (allCoords[i - 1][2] ?? 0);
    if (diff > 0) gain += diff; else descente += Math.abs(diff);
  }
  return { gain: Math.round(gain), descente: Math.round(descente) };
}

function parseBarriereDate(v: string): Date | null {
  const [date, heure] = v.split(' ');
  if (!date || !heure) return null;
  const d = new Date(`${date}T${heure}`);
  return isNaN(d.getTime()) ? null : d;
}

function formatTimeRemaining(target: Date, now: Date): string {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'Barrière dépassée';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0
    ? `${hours}h${minutes.toString().padStart(2, '0')} restantes`
    : `${minutes} min restantes`;
}

interface SegmentStats {
  km: number;
  dPlus: number | null;
  dMoins: number | null;
}

interface ParcoursReport {
  nextRav: (SegmentStats & { nom: string }) | null;
  nextBarriere: (SegmentStats & { nom: string; date: Date }) | null;
  restants: SegmentStats;
}

function computeParcoursReport(
  poste: Poste,
  parcours: Parcours,
  allPostes: Poste[],
  getParcoursIdsForPoste: (id: string) => string[],
  getBarriereHoraire: (posteId: string, parcoursId: string) => string | null,
): ParcoursReport | null {
  if (!parcours.gpx_geojson) return null;
  const allCoords = flattenGpxCoords(parcours.gpx_geojson);
  if (allCoords.length < 2) return null;

  const coords2d = allCoords.map((c) => [c[0], c[1]] as [number, number]);
  const line = turf.lineString(coords2d);
  const totalKm = turf.length(line, { units: 'kilometers' });

  const curNearest = turf.nearestPointOnLine(line, turf.point([poste.lng, poste.lat]), { units: 'kilometers' });
  const curLocation = curNearest.properties.location ?? 0;
  const curIndex = curNearest.properties.index ?? 0;

  function segStats(toIdx: number, toLocation: number): SegmentStats {
    const km = Math.round((toLocation - curLocation) * 10) / 10;
    const elev = segmentElevation(allCoords, curIndex, toIdx);
    return { km, dPlus: elev?.gain ?? null, dMoins: elev?.descente ?? null };
  }

  const afterCurrent = allPostes
    .filter((p) => p.id !== poste.id && getParcoursIdsForPoste(p.id).includes(parcours.id))
    .map((p) => {
      const n = turf.nearestPointOnLine(line, turf.point([p.lng, p.lat]), { units: 'kilometers' });
      return { poste: p, location: n.properties.location ?? 0, index: n.properties.index ?? 0 };
    })
    .filter((p) => p.location > curLocation + 0.05)
    .sort((a, b) => a.location - b.location);

  const nextRavPoste = afterCurrent.find(
    (p) => p.poste.types.includes('eau') || p.poste.types.includes('nourriture') || p.poste.types.includes('medical'),
  );
  const nextRav = nextRavPoste
    ? { nom: nextRavPoste.poste.nom, ...segStats(nextRavPoste.index, nextRavPoste.location) }
    : null;

  const nextBarrierePoste = afterCurrent.find((p) => getBarriereHoraire(p.poste.id, parcours.id) !== null);
  let nextBarriere: ParcoursReport['nextBarriere'] = null;
  if (nextBarrierePoste) {
    const bStr = getBarriereHoraire(nextBarrierePoste.poste.id, parcours.id)!;
    const bDate = parseBarriereDate(bStr);
    if (bDate) {
      nextBarriere = {
        nom: nextBarrierePoste.poste.nom,
        date: bDate,
        ...segStats(nextBarrierePoste.index, nextBarrierePoste.location),
      };
    }
  }

  const endElev = segmentElevation(allCoords, curIndex, allCoords.length - 1);
  const restants: SegmentStats = {
    km: Math.round((totalKm - curLocation) * 10) / 10,
    dPlus: endElev?.gain ?? null,
    dMoins: endElev?.descente ?? null,
  };

  return { nextRav, nextBarriere, restants };
}

interface PosteFormParticipantProps {
  poste: Poste;
  parcours: Parcours[];
  allPostes: Poste[];
  selectedParcoursId: string | null;
  getParcoursIdsForPoste: (id: string) => string[];
  getBarriereHoraire: (posteId: string, parcoursId: string) => string | null;
  showDenivele: boolean;
  onClose: () => void;
}

export default function PosteFormParticipant({
  poste,
  parcours,
  allPostes,
  selectedParcoursId,
  getParcoursIdsForPoste,
  getBarriereHoraire,
  showDenivele,
  onClose,
}: PosteFormParticipantProps) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const linkedParcoursIds = getParcoursIdsForPoste(poste.id);
  const linkedParcours = parcours.filter((p) => linkedParcoursIds.includes(p.id));
  const displayedParcours = selectedParcoursId
    ? linkedParcours.filter((p) => p.id === selectedParcoursId)
    : linkedParcours;

  const types = POSTE_TYPES.filter((t) => poste.types.includes(t.code));

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4 gap-2">
          <h2 className="text-lg font-semibold">N°{poste.numero} — {poste.nom}</h2>
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

          {/* Parcours */}
          {displayedParcours.length > 0 && (
            <div className="space-y-3">
              {displayedParcours.map((p) => {
                const report = computeParcoursReport(poste, p, allPostes, getParcoursIdsForPoste, getBarriereHoraire);
                return (
                  <div key={p.id} className="rounded border overflow-hidden text-xs">
                    <div className="px-3 py-2 font-semibold text-white text-xs" style={{ backgroundColor: p.couleur ?? '#374151' }}>
                      ● {p.nom}
                    </div>
                    {report ? (
                      <div className="divide-y">

                        {/* 1 — Prochain ravitaillement */}
                        {report.nextRav ? (
                          <div className="px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1.5">
                              Prochain ravitaillement — {report.nextRav.nom}
                            </div>
                            <StatRow label="Km" value={`${report.nextRav.km} km`} />
                            {showDenivele && report.nextRav.dPlus !== null && (
                              <StatRow label="D+" value={`${report.nextRav.dPlus} m`} />
                            )}
                            {showDenivele && report.nextRav.dMoins !== null && (
                              <StatRow label="D−" value={`${report.nextRav.dMoins} m`} />
                            )}
                          </div>
                        ) : (
                          <div className="px-3 py-2.5 text-gray-400 text-[11px]">Pas de prochain ravitaillement</div>
                        )}

                        {/* 2 — Prochaine barrière */}
                        {report.nextBarriere && (
                          <div className="px-3 py-2.5">
                            <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1.5">
                              Barrière horaire — {report.nextBarriere.nom}
                            </div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-base">⏱</span>
                              <span className="font-semibold text-orange-600">
                                {formatTimeRemaining(report.nextBarriere.date, now)}
                              </span>
                            </div>
                            <StatRow label="Km" value={`${report.nextBarriere.km} km`} />
                            {showDenivele && report.nextBarriere.dPlus !== null && (
                              <StatRow label="D+" value={`${report.nextBarriere.dPlus} m`} />
                            )}
                            {showDenivele && report.nextBarriere.dMoins !== null && (
                              <StatRow label="D−" value={`${report.nextBarriere.dMoins} m`} />
                            )}
                          </div>
                        )}

                        {/* 3 — Jusqu'à l'arrivée */}
                        <div className="px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1.5">
                            Jusqu'à l'arrivée
                          </div>
                          <StatRow label="Km restants" value={`${report.restants.km} km`} />
                          {showDenivele && report.restants.dPlus !== null && (
                            <StatRow label="D+ restant" value={`${report.restants.dPlus} m`} />
                          )}
                          {showDenivele && report.restants.dMoins !== null && (
                            <StatRow label="D− restant" value={`${report.restants.dMoins} m`} />
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="px-3 py-2.5 text-gray-400">Trace GPX non disponible</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-700 leading-5">
      <span className="text-gray-500">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

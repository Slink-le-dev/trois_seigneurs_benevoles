import * as turf from '@turf/turf';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Parcours, Poste, POSTE_TYPES } from '../types';

interface ProfilePoint { dist: number; ele: number; lat: number; lng: number; }
interface PosteMarker { dist: number; types: Array<'eau' | 'nourriture' | 'medical'>; }

const RELEVANT_TYPES = ['eau', 'nourriture', 'medical'] as const;
type RelevantType = typeof RELEVANT_TYPES[number];

const EMOJI = Object.fromEntries(
  POSTE_TYPES.filter((t) => (RELEVANT_TYPES as readonly string[]).includes(t.code)).map((t) => [t.code, t.emoji]),
) as Record<RelevantType, string>;

const GPS_MAX_DIST_KM = 0.2; // 200 m

function buildCoords(fc: GeoJSON.FeatureCollection): number[][] {
  const coords: number[][] = [];
  for (const f of fc.features) {
    if (f.geometry?.type === 'LineString') coords.push(...(f.geometry as GeoJSON.LineString).coordinates);
    else if (f.geometry?.type === 'MultiLineString')
      for (const seg of (f.geometry as GeoJSON.MultiLineString).coordinates) coords.push(...seg);
  }
  return coords;
}

function getProfile(fc: GeoJSON.FeatureCollection): ProfilePoint[] {
  const coords = buildCoords(fc);
  const profile: ProfilePoint[] = [];
  let cumDist = 0;
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      cumDist += turf.distance(
        turf.point(coords[i - 1].slice(0, 2) as [number, number]),
        turf.point(coords[i].slice(0, 2) as [number, number]),
        { units: 'kilometers' },
      );
    }
    if (coords[i].length >= 3)
      profile.push({ dist: cumDist, ele: coords[i][2], lat: coords[i][1], lng: coords[i][0] });
  }
  return profile;
}

function downsample(arr: ProfilePoint[], max = 500): ProfilePoint[] {
  if (arr.length <= max) return arr;
  const step = (arr.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => arr[Math.min(arr.length - 1, Math.round(i * step))]);
}

function niceStep(range: number, ticks: number): number {
  const raw = range / Math.max(ticks, 1);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return mag * (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10);
}

function nearestProfilePoint(profile: ProfilePoint[], dist: number): ProfilePoint {
  let nearest = profile[0];
  let minDiff = Infinity;
  for (const p of profile) {
    const diff = Math.abs(p.dist - dist);
    if (diff < minDiff) { minDiff = diff; nearest = p; }
    else if (diff > minDiff + 0.5) break;
  }
  return nearest;
}

function fmt(n: number, dec = 1) { return n.toFixed(dec); }

function slopeColor(pct: number): string {
  if (pct <= 5)  return '#65a30d';
  if (pct <= 10) return '#eab308';
  if (pct <= 15) return '#ea580c';
  if (pct <= 20) return '#b91c1c';
  return '#582900';
}

export default function ElevationPanel({
  parcours,
  postes = [],
  getParcoursIdsForPoste,
  filterParcoursIds,
  userPosition,
  onHoverPosition,
  onClose,
}: {
  parcours: Parcours[];
  postes?: Poste[];
  getParcoursIdsForPoste?: (id: string) => string[];
  filterParcoursIds?: string[];
  userPosition?: [number, number] | null;
  onHoverPosition?: (pos: [number, number] | null) => void;
  onClose: () => void;
}) {
  const available = parcours.filter((p) => p.gpx_geojson);
  const defaultId =
    filterParcoursIds?.find((id) => available.some((p) => p.id === id)) ??
    available[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartPxW, setChartPxW] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; index: number; point: ProfilePoint } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setChartPxW(el.clientWidth);
    const ro = new ResizeObserver(() => { if (el) setChartPxW(el.clientWidth); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selected = available.find((p) => p.id === selectedId);
  const rawProfile = selected?.gpx_geojson ? getProfile(selected.gpx_geojson) : [];
  const profile = downsample(rawProfile);

  // Shared trace line (2D) — used by posteMarkers and gpsOnTrace
  const traceLine = useMemo(() => {
    if (!selected?.gpx_geojson) return null;
    const coords = buildCoords(selected.gpx_geojson).map((c) => c.slice(0, 2)) as [number, number][];
    return coords.length >= 2 ? turf.lineString(coords) : null;
  }, [selected]);

  // Suffix sums for D+/D- restants
  const suffixDeniv = useMemo(() => {
    if (profile.length < 2) return null;
    const dPlus = new Float64Array(profile.length);
    const dMinus = new Float64Array(profile.length);
    for (let i = profile.length - 2; i >= 0; i--) {
      const diff = profile[i + 1].ele - profile[i].ele;
      dPlus[i] = dPlus[i + 1] + Math.max(0, diff);
      dMinus[i] = dMinus[i + 1] + Math.max(0, -diff);
    }
    return { dPlus, dMinus };
  }, [profile]);

  // One marker per poste (grouped types) projected onto the trace
  const posteMarkers = useMemo((): PosteMarker[] => {
    if (!traceLine || !selected || !getParcoursIdsForPoste) return [];
    return postes
      .map((p) => {
        const types = RELEVANT_TYPES.filter((t) => p.types.includes(t));
        if (!types.length || !getParcoursIdsForPoste(p.id).includes(selected.id)) return null;
        const nearest = turf.nearestPointOnLine(traceLine, turf.point([p.lng, p.lat]), { units: 'kilometers' });
        return { dist: nearest.properties.location ?? 0, types };
      })
      .filter((m): m is PosteMarker => m !== null)
      .sort((a, b) => a.dist - b.dist);
  }, [traceLine, selected, postes, getParcoursIdsForPoste]);

  // GPS position projected onto the trace (null if > 200 m away)
  const gpsOnTrace = useMemo(() => {
    if (!traceLine || !userPosition || profile.length < 2) return null;
    const pt = turf.point([userPosition[1], userPosition[0]]);
    const nearest = turf.nearestPointOnLine(traceLine, pt, { units: 'kilometers' });
    if ((nearest.properties.dist ?? Infinity) > GPS_MAX_DIST_KM) return null;
    const dist = nearest.properties.location ?? 0;
    const ele = nearestProfilePoint(profile, dist).ele;
    return { dist, ele };
  }, [traceLine, userPosition, profile]);

  // Chart layout constants
  const SVG_H = 120;
  const padL = 44, padR = 12, padT = 8, padB = 30;
  const cW = Math.max(chartPxW - padL - padR, 1);
  const cH = SVG_H - padT - padB;

  const hasData = profile.length >= 2 && chartPxW > 0;
  const minEle = hasData ? Math.min(...profile.map((p) => p.ele)) : 0;
  const maxEle = hasData ? Math.max(...profile.map((p) => p.ele)) : 0;
  const totalDist = hasData ? profile[profile.length - 1].dist : 1;
  const eleRange = maxEle - minEle || 1;
  const toX = (d: number) => padL + (d / totalDist) * cW;
  const toY = (e: number) => padT + cH - ((e - minEle) / eleRange) * cH;

  // Refs so touch listeners always use latest values
  const seekRef = useRef<(clientX: number) => void>(() => {});
  const clearRef = useRef<() => void>(() => {});

  seekRef.current = (clientX: number) => {
    if (!hasData || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(padL, Math.min(padL + cW, clientX - rect.left));
    const dist = ((x - padL) / cW) * totalDist;
    let nearest = profile[0];
    let nearestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < profile.length; i++) {
      const diff = Math.abs(profile[i].dist - dist);
      if (diff < minDiff) { minDiff = diff; nearest = profile[i]; nearestIdx = i; }
      else if (diff > minDiff + 0.5) break;
    }
    setHoverInfo({ x, index: nearestIdx, point: nearest });
    onHoverPosition?.([nearest.lat, nearest.lng]);
  };

  clearRef.current = () => {
    setHoverInfo(null);
    onHoverPosition?.(null);
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => { if (e.touches.length > 0) seekRef.current(e.touches[0].clientX); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); if (e.touches.length > 0) seekRef.current(e.touches[0].clientX); };
    const onTouchEnd = () => clearRef.current();
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [hasData]);

  // Stats for current hover position
  const stats = useMemo(() => {
    if (!hoverInfo || !suffixDeniv) return null;
    const { index, point } = hoverInfo;
    const kmCumul = point.dist;
    const kmRestants = totalDist - point.dist;
    const wStart = Math.max(0, index - 10);
    const wEnd = Math.min(profile.length - 1, index + 10);
    const deltaEle = profile[wEnd].ele - profile[wStart].ele;
    const deltaDist = (profile[wEnd].dist - profile[wStart].dist) * 1000;
    const pente = deltaDist > 1 ? (deltaEle / deltaDist) * 100 : 0;
    const dPlusRestants = suffixDeniv.dPlus[index];
    const dMinusRestants = suffixDeniv.dMinus[index];
    const nextRavit = posteMarkers
      .filter((m) => m.types.includes('eau') || m.types.includes('nourriture'))
      .find((m) => m.dist > point.dist + 0.05);
    const kmRavit = nextRavit != null ? nextRavit.dist - point.dist : null;
    return { kmCumul, kmRestants, pente, dPlusRestants, dMinusRestants, kmRavit };
  }, [hoverInfo, suffixDeniv, profile, totalDist, posteMarkers]);

  const dash = '—';

  let chartEl: React.ReactNode = null;
  if (hasData) {
    const col = selected!.couleur;
    const pts = profile.map((p) => `${toX(p.dist).toFixed(1)},${toY(p.ele).toFixed(1)}`).join(' L ');
    const linePath = `M ${pts}`;
    const baseline = padT + cH;

    const yStep = niceStep(eleRange, 4);
    const yStart = Math.ceil(minEle / yStep) * yStep;
    const yGrids: Array<{ y: number; label: string }> = [];
    for (let e = yStart; e <= maxEle + 1; e += yStep)
      yGrids.push({ y: toY(e), label: `${Math.round(e)} m` });

    const xStep = niceStep(totalDist, Math.max(1, Math.floor(cW / 70)));
    const xTicks: Array<{ x: number; label: string }> = [];
    const xDecimals = xStep < 1 ? 1 : 0;
    for (let d = xStep; toX(d) < padL + cW - 20; d += xStep)
      xTicks.push({ x: toX(d), label: `${d.toFixed(xDecimals)} km` });

    const hx = hoverInfo?.x ?? 0;
    const tooltipRight = hx > padL + cW * 0.6;
    const EMOJI_SPACING = 13;

    chartEl = (
      <svg
        ref={svgRef}
        width={chartPxW}
        height={SVG_H}
        style={{ display: 'block', cursor: 'crosshair', touchAction: 'none' }}
        onMouseMove={(e) => seekRef.current(e.clientX)}
        onMouseLeave={() => clearRef.current()}
      >
        {/* Gridlines */}
        {yGrids.map(({ y, label }) => (
          <g key={label}>
            <line x1={padL} y1={y} x2={padL + cW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 4} y={y} dominantBaseline="middle" textAnchor="end" fontSize={9} fill="#9ca3af">{label}</text>
          </g>
        ))}

        {/* Slope-colored area segments — smoothed over ±5 points to reduce GPS elevation noise */}
        {profile.slice(0, -1).map((pt, i) => {
          const next = profile[i + 1];
          const x1 = toX(pt.dist), y1 = toY(pt.ele);
          const x2 = toX(next.dist), y2 = toY(next.ele);
          const wStart = Math.max(0, i - 5);
          const wEnd = Math.min(profile.length - 1, i + 6);
          const deltaEle = Math.abs(profile[wEnd].ele - profile[wStart].ele);
          const deltaDist = (profile[wEnd].dist - profile[wStart].dist) * 1000;
          const slope = deltaDist > 0 ? deltaEle / deltaDist * 100 : 0;
          return (
            <polygon
              key={i}
              points={`${x1},${y1} ${x2},${y2} ${x2},${baseline} ${x1},${baseline}`}
              style={{ fill: slopeColor(slope), fillOpacity: 0.5 }}
            />
          );
        })}

        {/* Elevation line (parcours colour) */}
        <path d={linePath} fill="none" stroke={col} strokeWidth={1.5} strokeLinejoin="round" />

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + cH} stroke="#d1d5db" strokeWidth={1} />
        <line x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} stroke="#d1d5db" strokeWidth={1} />

        {/* X tick labels */}
        {xTicks.map(({ x, label }) => (
          <text key={label} x={x} y={padT + cH + 22} textAnchor="middle" fontSize={9} fill="#c4c4c4">{label}</text>
        ))}

        {/* Poste markers */}
        {posteMarkers.map(({ dist, types }, i) => {
          const x = toX(dist);
          const totalW = (types.length - 1) * EMOJI_SPACING;
          const startX = x - totalW / 2;
          return (
            <g key={i}>
              <line x1={x} y1={padT} x2={x} y2={padT + cH} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5} />
              {types.map((type, j) => (
                <text key={type} x={startX + j * EMOJI_SPACING} y={padT + cH + 8} textAnchor="middle" dominantBaseline="hanging" fontSize={11}>
                  {EMOJI[type]}
                </text>
              ))}
            </g>
          );
        })}

        {/* GPS position on trace */}
        {gpsOnTrace && (() => {
          const gx = toX(gpsOnTrace.dist);
          const gy = toY(gpsOnTrace.ele);
          return (
            <g>
              <line x1={gx} y1={padT} x2={gx} y2={padT + cH} stroke="#3b82f6" strokeWidth={1.5} />
              <circle cx={gx} cy={gy} r={5} fill="#3b82f6" stroke="white" strokeWidth={2} />
            </g>
          );
        })()}

        {/* Hover indicator (on top of GPS) */}
        {hoverInfo && (() => {
          const hx = hoverInfo.x;
          const hy = toY(hoverInfo.point.ele);
          const label1 = `${hoverInfo.point.dist.toFixed(1)} km`;
          const label2 = `${Math.round(hoverInfo.point.ele)} m`;
          const ttW = 68, ttH = 28, ttPad = 6;
          const ttX = tooltipRight ? hx - ttW - ttPad : hx + ttPad;
          const ttY = Math.max(padT, Math.min(hy - ttH / 2, padT + cH - ttH));
          return (
            <g>
              <line x1={hx} y1={padT} x2={hx} y2={padT + cH} stroke="#6b7280" strokeWidth={1} strokeDasharray="3 2" />
              <circle cx={hx} cy={hy} r={4} fill="white" stroke={col} strokeWidth={2} />
              <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={3} fill="white" stroke="#e5e7eb" strokeWidth={1} />
              <text x={ttX + ttW / 2} y={ttY + 10} textAnchor="middle" fontSize={9} fill="#374151" fontWeight="600">{label1}</text>
              <text x={ttX + ttW / 2} y={ttY + 21} textAnchor="middle" fontSize={9} fill="#6b7280">{label2}</text>
            </g>
          );
        })()}
      </svg>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-[1000]">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">Profil d'élévation</span>
        <div className="flex gap-1.5 flex-1 overflow-x-auto">
          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className="flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors"
              style={
                selectedId === p.id
                  ? { background: p.couleur, color: '#fff', borderColor: p.couleur }
                  : { background: 'transparent', color: p.couleur, borderColor: p.couleur }
              }
            >
              {p.nom}
            </button>
          ))}
          {available.length === 0 && (
            <span className="text-xs text-gray-400">Aucun parcours avec trace GPX</span>
          )}
        </div>
        {/* Legend */}
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0 text-[10px] text-gray-400">
          {RELEVANT_TYPES.map((t) => (
            <span key={t} className="flex items-center gap-0.5">
              <span className="text-sm leading-none">{EMOJI[t]}</span>
              {t === 'eau' ? 'Eau' : t === 'nourriture' ? 'Nourrit.' : 'Médical'}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Stats row */}
      {hasData && (
        <div className="flex gap-x-4 px-3 py-1.5 bg-gray-50 border-b border-gray-100 overflow-x-auto flex-nowrap text-xs">
          <StatCell label="Km cumulés" value={stats ? `${fmt(stats.kmCumul)} km` : dash} />
          <StatCell label="Km restants" value={stats ? `${fmt(stats.kmRestants)} km` : dash} />
          <StatCell label="Prochain ravit." value={stats ? (stats.kmRavit != null ? `${fmt(stats.kmRavit)} km` : 'aucun') : dash} />
          <StatCell label="Pente" value={stats ? `${stats.pente >= 0 ? '+' : ''}${fmt(stats.pente, 1)} %` : dash} highlight={stats ? (stats.pente > 10 ? 'up' : stats.pente < -10 ? 'down' : null) : null} />
          <StatCell label="D+ restant" value={stats ? `${Math.round(stats.dPlusRestants)} m` : dash} />
          <StatCell label="D− restant" value={stats ? `${Math.round(stats.dMinusRestants)} m` : dash} />
        </div>
      )}

      {/* Chart */}
      <div ref={containerRef}>
        {hasData ? (
          chartEl
        ) : (
          <div className="flex items-center justify-center h-[120px] text-sm text-gray-400">
            {selected ? "Pas de données d'élévation sur cette trace." : 'Sélectionnez un parcours.'}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: 'up' | 'down' | null }) {
  const valueColor = highlight === 'up' ? 'text-red-600' : highlight === 'down' ? 'text-blue-600' : 'text-gray-800';
  return (
    <div className="flex-shrink-0 flex flex-col leading-tight">
      <span className="text-gray-400 text-[10px]">{label}</span>
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}

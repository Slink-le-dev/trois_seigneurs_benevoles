import * as turf from '@turf/turf';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Parcours, Poste, POSTE_TYPES } from '../types';

interface ProfilePoint { dist: number; ele: number; lat: number; lng: number; }
interface PosteMarker { dist: number; types: Array<'eau' | 'nourriture' | 'medical'>; nom: string; }

const RELEVANT_TYPES = ['eau', 'nourriture', 'medical'] as const;
type RelevantType = typeof RELEVANT_TYPES[number];

const EMOJI = Object.fromEntries(
  POSTE_TYPES.filter((t) => (RELEVANT_TYPES as readonly string[]).includes(t.code)).map((t) => [t.code, t.emoji]),
) as Record<RelevantType, string>;

const GPS_MAX_DIST_KM = 0.2;

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

const ZOOM_FACTOR = 1.25;
const MIN_SPAN_KM = 0.1;

export default function ElevationPanel({
  parcours,
  postes = [],
  getParcoursIdsForPoste,
  filterParcoursIds,
  userPosition,
  onHoverPosition,
  onParcoursChange,
  onNextRavitUpdate,
  onClose,
}: {
  parcours: Parcours[];
  postes?: Poste[];
  getParcoursIdsForPoste?: (id: string) => string[];
  filterParcoursIds?: string[];
  userPosition?: [number, number] | null;
  onHoverPosition?: (pos: [number, number] | null) => void;
  onParcoursChange?: (parcoursId: string) => void;
  onNextRavitUpdate?: (info: { km: number; nom: string } | null) => void;
  onClose: () => void;
}) {
  const available = parcours.filter((p) => p.gpx_geojson);
  const defaultId =
    filterParcoursIds?.find((id) => available.some((p) => p.id === id)) ??
    available[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!filterParcoursIds?.length) return;
    const matchId = filterParcoursIds.find((id) => available.some((p) => p.id === id));
    if (matchId && matchId !== selectedId) setSelectedId(matchId);
  }, [filterParcoursIds]);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [chartPxW, setChartPxW] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; index: number; point: ProfilePoint } | null>(null);

  useEffect(() => { setZoomRange(null); setHoverInfo(null); }, [selectedId]);

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

  const traceLine = useMemo(() => {
    if (!selected?.gpx_geojson) return null;
    const coords = buildCoords(selected.gpx_geojson).map((c) => c.slice(0, 2)) as [number, number][];
    return coords.length >= 2 ? turf.lineString(coords) : null;
  }, [selected]);

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

  const posteMarkers = useMemo((): PosteMarker[] => {
    if (!traceLine || !selected || !getParcoursIdsForPoste) return [];
    return postes
      .map((p) => {
        const types = RELEVANT_TYPES.filter((t) => p.types.includes(t));
        if (!types.length || !getParcoursIdsForPoste(p.id).includes(selected.id)) return null;
        const nearest = turf.nearestPointOnLine(traceLine, turf.point([p.lng, p.lat]), { units: 'kilometers' });
        return { dist: nearest.properties.location ?? 0, types, nom: p.nom };
      })
      .filter((m): m is PosteMarker => m !== null)
      .sort((a, b) => a.dist - b.dist);
  }, [traceLine, selected, postes, getParcoursIdsForPoste]);

  const gpsOnTrace = useMemo(() => {
    if (!traceLine || !userPosition || profile.length < 2) return null;
    const pt = turf.point([userPosition[1], userPosition[0]]);
    const nearest = turf.nearestPointOnLine(traceLine, pt, { units: 'kilometers' });
    if ((nearest.properties.dist ?? Infinity) > GPS_MAX_DIST_KM) return null;
    const dist = nearest.properties.location ?? 0;
    const ele = nearestProfilePoint(profile, dist).ele;
    return { dist, ele };
  }, [traceLine, userPosition, profile]);

  // Auto-position handle at GPS location when user is on the trace
  useEffect(() => {
    if (!gpsOnTrace || profile.length < 2) return;
    const nearest = nearestProfilePoint(profile, gpsOnTrace.dist);
    const nearestIdx = profile.indexOf(nearest);
    setHoverInfo({ x: 0, index: nearestIdx, point: nearest });
  // gpsOnTrace is the only trigger; profile is stable within the same parcours selection
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsOnTrace]);

  // Chart layout — padT enlarged to fit emoji + name above the chart
  const SVG_H = 150;
  const padL = 44, padR = 12, padT = 40, padB = 30;
  const cW = Math.max(chartPxW - padL - padR, 1);
  const cH = SVG_H - padT - padB;

  const hasData = profile.length >= 2 && chartPxW > 0;
  const minEle = hasData ? Math.min(...profile.map((p) => p.ele)) : 0;
  const maxEle = hasData ? Math.max(...profile.map((p) => p.ele)) : 0;
  const totalDist = hasData ? profile[profile.length - 1].dist : 1;
  const eleRange = maxEle - minEle || 1;

  // Visible range (zoom)
  const zoomStart = zoomRange?.[0] ?? 0;
  const zoomEnd = zoomRange?.[1] ?? totalDist;
  const visibleSpan = Math.max(zoomEnd - zoomStart, MIN_SPAN_KM);
  const isZoomed = zoomRange !== null;

  const toX = (d: number) => padL + ((d - zoomStart) / visibleSpan) * cW;
  const toY = (e: number) => padT + cH - ((e - minEle) / eleRange) * cH;
  const toD = (x: number) => zoomStart + ((x - padL) / cW) * visibleSpan;

  // ---- Zoom logic (shared between wheel and pinch) ----
  const zoomRef = useRef<(centerClientX: number, factor: number) => void>(() => {});
  zoomRef.current = (centerClientX: number, factor: number) => {
    if (!hasData || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(padL, Math.min(padL + cW, centerClientX - rect.left));
    const dCenter = toD(x);
    const newSpan = Math.min(totalDist, Math.max(MIN_SPAN_KM, visibleSpan * factor));
    if (newSpan >= totalDist * 0.999) { setZoomRange(null); return; }
    const ratio = (dCenter - zoomStart) / visibleSpan;
    let newStart = dCenter - ratio * newSpan;
    newStart = Math.max(0, Math.min(totalDist - newSpan, newStart));
    setZoomRange([newStart, newStart + newSpan]);
  };

  // ---- Pan (shift visible range left/right) ----
  const panRef = useRef<(deltaKm: number) => void>(() => {});
  panRef.current = (deltaKm: number) => {
    if (!hasData) return;
    const newStart = Math.max(0, Math.min(totalDist - visibleSpan, zoomStart + deltaKm));
    setZoomRange([newStart, newStart + visibleSpan]);
  };

  // Used inside touch handler (closes over panRef/isZoomed/cW/visibleSpan)
  const touchPanRef = useRef<(dx: number) => void>(() => {});
  touchPanRef.current = (dx: number) => {
    if (!isZoomed) return;
    panRef.current(-(dx / cW) * visibleSpan);
  };
  const isZoomedRef = useRef(false);
  isZoomedRef.current = isZoomed;

  // Handle pixel-x updated every render so the touch handler always has the current position
  const hoverXRef = useRef<number | null>(null);
  const seekDragRef = useRef(false);
  hoverXRef.current = hoverInfo ? toX(hoverInfo.point.dist) : null;

  // ---- Seek (hover) ----
  const seekRef = useRef<(clientX: number) => void>(() => {});
  const clearRef = useRef<() => void>(() => {});

  seekRef.current = (clientX: number) => {
    if (!hasData || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(padL, Math.min(padL + cW, clientX - rect.left));
    const dist = toD(x);
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

  // ---- Wheel zoom ----
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      zoomRef.current(e.clientX, factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [hasData]);

  // ---- Touch: drag handle (seek) / pan elsewhere + pinch zoom (2 fingers) ----
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    let lastPinchDist = 0;
    let touchStartX = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touchX = e.touches[0].clientX;
        const svgX = touchX - el.getBoundingClientRect().left;
        const handleX = hoverXRef.current;
        // No handle yet, or touch is on/near the handle → seek mode
        if (handleX === null || Math.abs(svgX - handleX) < 24) {
          seekDragRef.current = true;
          seekRef.current(touchX);
        } else {
          // Touch elsewhere → pan mode
          seekDragRef.current = false;
          touchStartX = touchX;
        }
      } else if (e.touches.length === 2) {
        seekDragRef.current = false;
        lastPinchDist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const currentX = e.touches[0].clientX;
        if (seekDragRef.current) {
          seekRef.current(currentX);
        } else if (isZoomedRef.current) {
          touchPanRef.current(currentX - touchStartX);
          touchStartX = currentX;
        }
      } else if (e.touches.length === 2) {
        const newDist = Math.abs(e.touches[0].clientX - e.touches[1].clientX);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        if (lastPinchDist > 0 && newDist > 0) {
          zoomRef.current(midX, lastPinchDist / newDist);
        }
        lastPinchDist = newDist;
      }
    };
    const onTouchEnd = () => {
      lastPinchDist = 0;
      seekDragRef.current = false;
      // Handle persists — do not clear hoverInfo on mobile
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [hasData]);

  // ---- Stats ----
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
      .filter((m) => m.types.includes('eau') || m.types.includes('nourriture') || m.types.includes('medical'))
      .find((m) => m.dist > point.dist + 0.05);
    const kmRavit = nextRavit != null ? nextRavit.dist - point.dist : null;
    const nomRavit = nextRavit?.nom ?? null;
    return { kmCumul, kmRestants, pente, dPlusRestants, dMinusRestants, kmRavit, nomRavit };
  }, [hoverInfo, suffixDeniv, profile, totalDist, posteMarkers]);

  useEffect(() => {
    if (!onNextRavitUpdate) return;
    if (stats?.kmRavit != null && stats.nomRavit != null) {
      onNextRavitUpdate({ km: Math.round(stats.kmRavit * 10) / 10, nom: stats.nomRavit });
    } else {
      onNextRavitUpdate(null);
    }
  }, [stats?.kmRavit, stats?.nomRavit]);

  const dash = '—';

  let chartEl: React.ReactNode = null;
  if (hasData) {
    const col = selected!.couleur;
    const pts = profile.map((p) => `${toX(p.dist).toFixed(1)},${toY(p.ele).toFixed(1)}`).join(' L ');
    const linePath = `M ${pts}`;
    const baseline = padT + cH;
    const clipId = 'elevation-chart-clip';

    const yStep = niceStep(eleRange, 4);
    const yStart = Math.ceil(minEle / yStep) * yStep;
    const yGrids: Array<{ y: number; label: string }> = [];
    for (let e = yStart; e <= maxEle + 1; e += yStep)
      yGrids.push({ y: toY(e), label: `${Math.round(e)} m` });

    const xStep = niceStep(visibleSpan, Math.max(1, Math.floor(cW / 70)));
    const xTicks: Array<{ x: number; label: string }> = [];
    const xDecimals = xStep < 1 ? 1 : 0;
    const xTickStart = Math.ceil(zoomStart / xStep) * xStep;
    for (let d = xTickStart; d <= zoomEnd; d += xStep) {
      const x = toX(d);
      if (x >= padL + 10 && x < padL + cW - 10)
        xTicks.push({ x, label: `${d.toFixed(xDecimals)} km` });
    }

    const hx = hoverInfo ? toX(hoverInfo.point.dist) : 0;
    const tooltipRight = hx > padL + cW * 0.6;
    const EMOJI_SPACING = 13;

    chartEl = (
      <svg
        ref={svgRef}
        width={chartPxW}
        height={SVG_H}
        style={{ display: 'block', cursor: isZoomed ? 'zoom-in' : 'crosshair', touchAction: 'none' }}
        onMouseMove={(e) => seekRef.current(e.clientX)}
        onMouseLeave={() => clearRef.current()}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padL} y={padT - 2} width={cW} height={cH + 4} />
          </clipPath>
        </defs>

        {/* Gridlines */}
        {yGrids.map(({ y, label }) => (
          <g key={label}>
            <line x1={padL} y1={y} x2={padL + cW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 4} y={y} dominantBaseline="middle" textAnchor="end" fontSize={9} fill="#9ca3af">{label}</text>
          </g>
        ))}

        {/* Slope-colored area + elevation line (clipped) */}
        <g clipPath={`url(#${clipId})`}>
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
          <path d={linePath} fill="none" stroke={col} strokeWidth={1.5} strokeLinejoin="round" />
        </g>

        {/* Axes */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + cH} stroke="#d1d5db" strokeWidth={1} />
        <line x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} stroke="#d1d5db" strokeWidth={1} />

        {/* X tick labels */}
        {xTicks.map(({ x, label }) => (
          <text key={label} x={x} y={padT + cH + 22} textAnchor="middle" fontSize={9} fill="#c4c4c4">{label}</text>
        ))}

        {/* Poste markers — dashed lines clipped, emoji + name above the chart */}
        <g clipPath={`url(#${clipId})`}>
          {posteMarkers.map(({ dist }, i) => {
            const x = toX(dist);
            return <line key={i} x1={x} y1={padT} x2={x} y2={padT + cH} stroke="#9ca3af" strokeWidth={0.8} strokeDasharray="3 3" strokeOpacity={0.5} />;
          })}
        </g>
        {posteMarkers.map(({ dist, types, nom }, i) => {
          const x = toX(dist);
          if (x < padL || x > padL + cW) return null;
          const ratio = (x - padL) / cW;
          const anchor: 'start' | 'middle' | 'end' =
            ratio < 0.15 ? 'start' : ratio > 0.85 ? 'end' : 'middle';
          const totalW = (types.length - 1) * EMOJI_SPACING;
          const startX = anchor === 'start' ? x : anchor === 'end' ? x - totalW : x - totalW / 2;
          const label = nom.length > 90 ? nom.slice(0, 89) + '…' : nom;
          return (
            <g key={i}>
              <text x={x} y={padT - 20} textAnchor={anchor} fontSize={8} fill="#6b7280">{label}</text>
              {types.map((type, j) => (
                <text key={type} x={startX + j * EMOJI_SPACING} y={padT - 6} textAnchor="middle" dominantBaseline="auto" fontSize={12}>
                  {EMOJI[type]}
                </text>
              ))}
            </g>
          );
        })}

        {/* GPS position */}
        {gpsOnTrace && (() => {
          const gx = toX(gpsOnTrace.dist);
          const gy = toY(gpsOnTrace.ele);
          return (
            <g clipPath={`url(#${clipId})`}>
              <line x1={gx} y1={padT} x2={gx} y2={padT + cH} stroke="#3b82f6" strokeWidth={1.5} />
              <circle cx={gx} cy={gy} r={5} fill="#3b82f6" stroke="white" strokeWidth={2} />
            </g>
          );
        })()}

        {/* Selected position handle — orange bar with drag circle at top */}
        {hoverInfo && (() => {
          const hy = toY(hoverInfo.point.ele);
          const label1 = `${hoverInfo.point.dist.toFixed(1)} km`;
          const label2 = `${Math.round(hoverInfo.point.ele)} m`;
          const ttW = 68, ttH = 28, ttPad = 6;
          const ttX = tooltipRight ? hx - ttW - ttPad : hx + ttPad;
          const ttY = Math.max(padT + 10, Math.min(hy - ttH / 2, padT + cH - ttH));
          const ORANGE = '#f97316';
          return (
            <g>
              {/* Solid orange vertical line clipped to chart area */}
              <line x1={hx} y1={padT} x2={hx} y2={padT + cH} stroke={ORANGE} strokeWidth={1.5} clipPath={`url(#${clipId})`} />
              {/* Drag handle circle at top — target for touch drag on mobile */}
              <circle cx={hx} cy={padT} r={5} fill={ORANGE} stroke="white" strokeWidth={1.5} />
              {/* Small dot on the elevation line */}
              <circle cx={hx} cy={hy} r={3} fill="white" stroke={ORANGE} strokeWidth={1.5} clipPath={`url(#${clipId})`} />
              {/* Tooltip */}
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
              onClick={() => { setSelectedId(p.id); onParcoursChange?.(p.id); }}
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
        {/* Reset zoom */}
        {isZoomed && (
          <button
            type="button"
            onClick={() => setZoomRange(null)}
            className="flex-shrink-0 text-[10px] text-blue-500 hover:text-blue-700 underline whitespace-nowrap"
          >
            Réinitialiser zoom
          </button>
        )}
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

      {/* Scrollbar — visible only when zoomed */}
      {isZoomed && hasData && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-gray-100 bg-white">
          <button
            onClick={() => panRef.current(-visibleSpan * 0.2)}
            className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors text-lg leading-none select-none"
          >
            ‹
          </button>
          <div
            className="flex-1 relative h-2.5 bg-gray-100 rounded-full cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const newStart = Math.max(0, Math.min(totalDist - visibleSpan, ratio * totalDist - visibleSpan / 2));
              setZoomRange([newStart, newStart + visibleSpan]);
            }}
          >
            <div
              className="absolute top-0 h-2.5 bg-gray-400 hover:bg-gray-500 rounded-full cursor-grab active:cursor-grabbing transition-colors"
              style={{
                left: `${(zoomStart / totalDist) * 100}%`,
                width: `${Math.max(4, (visibleSpan / totalDist) * 100)}%`,
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startZoomStart = zoomStart;
                const trackWidth = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect().width;
                const onMove = (me: MouseEvent) => {
                  const deltaKm = ((me.clientX - startX) / trackWidth) * totalDist;
                  const newStart = Math.max(0, Math.min(totalDist - visibleSpan, startZoomStart + deltaKm));
                  setZoomRange([newStart, newStart + visibleSpan]);
                };
                const onUp = () => {
                  document.removeEventListener('mousemove', onMove);
                  document.removeEventListener('mouseup', onUp);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
              }}
            />
          </div>
          <button
            onClick={() => panRef.current(visibleSpan * 0.2)}
            className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors text-lg leading-none select-none"
          >
            ›
          </button>
        </div>
      )}
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

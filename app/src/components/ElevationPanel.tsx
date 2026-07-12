import * as turf from '@turf/turf';
import { useEffect, useRef, useState } from 'react';
import { Parcours } from '../types';

function getProfile(fc: GeoJSON.FeatureCollection): Array<{ dist: number; ele: number }> {
  const coords: number[][] = [];
  for (const f of fc.features) {
    if (f.geometry?.type === 'LineString') coords.push(...(f.geometry as GeoJSON.LineString).coordinates);
    else if (f.geometry?.type === 'MultiLineString')
      for (const seg of (f.geometry as GeoJSON.MultiLineString).coordinates) coords.push(...seg);
  }
  const profile: Array<{ dist: number; ele: number }> = [];
  let cumDist = 0;
  for (let i = 0; i < coords.length; i++) {
    if (i > 0) {
      cumDist += turf.distance(
        turf.point(coords[i - 1].slice(0, 2) as [number, number]),
        turf.point(coords[i].slice(0, 2) as [number, number]),
        { units: 'kilometers' },
      );
    }
    if (coords[i].length >= 3) profile.push({ dist: cumDist, ele: coords[i][2] });
  }
  return profile;
}

function downsample(arr: Array<{ dist: number; ele: number }>, max = 500) {
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

export default function ElevationPanel({
  parcours,
  filterParcoursIds,
  onClose,
}: {
  parcours: Parcours[];
  filterParcoursIds?: string[];
  onClose: () => void;
}) {
  const available = parcours.filter((p) => p.gpx_geojson);
  const defaultId =
    filterParcoursIds?.find((id) => available.some((p) => p.id === id)) ??
    available[0]?.id ??
    null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [chartPxW, setChartPxW] = useState(0);

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

  const SVG_H = 110;
  const padL = 44, padR = 12, padT = 8, padB = 22;
  const cW = Math.max(chartPxW - padL - padR, 1);
  const cH = SVG_H - padT - padB;

  let chartEl: React.ReactNode = null;
  if (profile.length >= 2 && chartPxW > 0) {
    const eles = profile.map((p) => p.ele);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const totalDist = profile[profile.length - 1].dist;
    const eleRange = maxEle - minEle || 1;

    const toX = (d: number) => padL + (d / totalDist) * cW;
    const toY = (e: number) => padT + cH - ((e - minEle) / eleRange) * cH;

    const pts = profile.map((p) => `${toX(p.dist).toFixed(1)},${toY(p.ele).toFixed(1)}`).join(' L ');
    const areaPath = `M ${pts} L ${toX(totalDist)},${padT + cH} L ${padL},${padT + cH} Z`;
    const linePath = `M ${pts}`;
    const col = selected!.couleur;

    const yStep = niceStep(eleRange, 4);
    const yStart = Math.ceil(minEle / yStep) * yStep;
    const yGrids: Array<{ y: number; label: string }> = [];
    for (let e = yStart; e <= maxEle + 1; e += yStep)
      yGrids.push({ y: toY(e), label: `${Math.round(e)} m` });

    const xStep = niceStep(totalDist, Math.max(1, Math.floor(cW / 70)));
    const xTicks: Array<{ x: number; label: string }> = [];
    for (let d = xStep; d < totalDist - xStep * 0.3; d += xStep)
      xTicks.push({ x: toX(d), label: `${d.toFixed(0)} km` });

    chartEl = (
      <svg width={chartPxW} height={SVG_H} style={{ display: 'block' }}>
        {yGrids.map(({ y, label }) => (
          <g key={label}>
            <line x1={padL} y1={y} x2={padL + cW} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={padL - 4} y={y} dominantBaseline="middle" textAnchor="end" fontSize={9} fill="#9ca3af">{label}</text>
          </g>
        ))}
        <path d={areaPath} fill={col} fillOpacity={0.2} />
        <path d={linePath} fill="none" stroke={col} strokeWidth={1.5} strokeLinejoin="round" />
        <line x1={padL} y1={padT} x2={padL} y2={padT + cH} stroke="#d1d5db" strokeWidth={1} />
        <line x1={padL} y1={padT + cH} x2={padL + cW} y2={padT + cH} stroke="#d1d5db" strokeWidth={1} />
        {xTicks.map(({ x, label }) => (
          <text key={label} x={x} y={padT + cH + 13} textAnchor="middle" fontSize={9} fill="#9ca3af">{label}</text>
        ))}
      </svg>
    );
  }

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-[1000]">
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
        <button
          type="button"
          onClick={onClose}
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div ref={containerRef}>
        {profile.length >= 2 ? (
          chartEl
        ) : (
          <div className="flex items-center justify-center h-[110px] text-sm text-gray-400">
            {selected ? "Pas de données d'élévation sur cette trace." : 'Sélectionnez un parcours.'}
          </div>
        )}
      </div>
    </div>
  );
}

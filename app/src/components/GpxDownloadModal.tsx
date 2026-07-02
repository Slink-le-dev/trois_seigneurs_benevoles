import { Parcours } from '../types';

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function geojsonToGpx(fc: GeoJSON.FeatureCollection, name: string): string {
  const segments: string[] = [];
  for (const f of fc.features) {
    let coordsGroups: number[][][] = [];
    if (f.geometry?.type === 'LineString') {
      coordsGroups = [(f.geometry as GeoJSON.LineString).coordinates as number[][]];
    } else if (f.geometry?.type === 'MultiLineString') {
      coordsGroups = (f.geometry as GeoJSON.MultiLineString).coordinates as number[][][];
    }
    for (const coords of coordsGroups) {
      const trkpts = coords
        .map((c) => {
          const [lng, lat, ele] = c;
          const eleTag = ele != null ? `<ele>${ele.toFixed(1)}</ele>` : '';
          return `      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}">${eleTag ? `\n        ${eleTag}\n      ` : ''}</trkpt>`;
        })
        .join('\n');
      segments.push(`    <trkseg>\n${trkpts}\n    </trkseg>`);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1" version="1.1" creator="Trail des Trois Seigneurs">
  <trk>
    <name>${escapeXml(name)}</name>
${segments.join('\n')}
  </trk>
</gpx>`;
}

function downloadGpx(p: Parcours) {
  if (!p.gpx_geojson) return;
  const content = geojsonToGpx(p.gpx_geojson, p.nom);
  const blob = new Blob([content], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${p.nom}.gpx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface GpxDownloadModalProps {
  parcours: Parcours[];
  onClose: () => void;
}

export default function GpxDownloadModal({ parcours, onClose }: GpxDownloadModalProps) {
  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-80 max-w-[calc(100vw-2rem)] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Télécharger la trace GPX</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        {parcours.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun parcours disponible.</p>
        ) : (
          <div className="space-y-2">
            {parcours.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { downloadGpx(p); onClose(); }}
                disabled={!p.gpx_geojson}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.couleur }}
                />
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{p.nom}</div>
                  {(p.distance_km || p.denivele_m) && (
                    <div className="text-xs text-gray-400">
                      {[
                        p.distance_km && `${p.distance_km} km`,
                        p.denivele_m && `${p.denivele_m} m D+`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  )}
                  {!p.gpx_geojson && (
                    <div className="text-xs text-gray-400">Trace non disponible</div>
                  )}
                </div>
                {p.gpx_geojson && (
                  <svg className="ml-auto flex-shrink-0 text-gray-400 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

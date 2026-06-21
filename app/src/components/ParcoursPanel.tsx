import { useRef, useState } from 'react';
import { parseGpxFile } from '../lib/gpx';
import { Parcours } from '../types';

interface ParcoursPanelProps {
  parcours: Parcours[];
  visibility: Record<string, boolean>;
  onToggleVisibility: (id: string) => void;
  onUpdate: (id: string, data: Partial<Parcours>) => Promise<void>;
  onRemoveGpx: (id: string) => Promise<void>;
}

export default function ParcoursPanel({ parcours, visibility, onToggleVisibility, onUpdate, onRemoveGpx }: ParcoursPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFile(p: Parcours, file: File) {
    setBusyId(p.id);
    try {
      const { geojson, distanceKm, deniveleM } = await parseGpxFile(file);
      await onUpdate(p.id, { gpx_geojson: geojson, distance_km: distanceKm, denivele_m: deniveleM });
    } catch (err: any) {
      alert(err.message ?? 'Erreur lors de la lecture du fichier GPX.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm uppercase text-gray-500">Parcours</h2>
      {parcours.map((p) => (
        <div
          key={p.id}
          className="border rounded-lg p-3 space-y-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(p, file);
          }}
        >
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={visibility[p.id] !== false} onChange={() => onToggleVisibility(p.id)} />
            <input
              type="color"
              value={p.couleur}
              onChange={(e) => onUpdate(p.id, { couleur: e.target.value })}
              className="w-7 h-7 border-0 p-0"
            />
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={p.nom}
              onChange={(e) => onUpdate(p.id, { nom: e.target.value })}
            />
          </div>

          <div className="flex gap-2 text-sm">
            <label className="flex items-center gap-1 flex-1">
              Distance (km)
              <input
                type="number"
                step="0.1"
                className="w-20 border rounded px-1 py-0.5"
                value={p.distance_km ?? ''}
                onChange={(e) => onUpdate(p.id, { distance_km: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className="flex items-center gap-1 flex-1">
              Dénivelé (m)
              <input
                type="number"
                className="w-20 border rounded px-1 py-0.5"
                value={p.denivele_m ?? ''}
                onChange={(e) => onUpdate(p.id, { denivele_m: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <input
              ref={(el) => (fileInputs.current[p.id] = el)}
              type="file"
              accept=".gpx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(p, file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className="px-2 py-1 border rounded hover:bg-gray-50"
              onClick={() => fileInputs.current[p.id]?.click()}
              disabled={busyId === p.id}
            >
              {busyId === p.id ? 'Import…' : p.gpx_geojson ? 'Remplacer le GPX' : 'Importer un GPX'}
            </button>
            {p.gpx_geojson && (
              <button type="button" className="px-2 py-1 border rounded text-red-600 hover:bg-red-50" onClick={() => onRemoveGpx(p.id)}>
                Supprimer
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">Glisser-déposer un fichier .gpx possible sur cette carte.</p>
        </div>
      ))}
    </div>
  );
}

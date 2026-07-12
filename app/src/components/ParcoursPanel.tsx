import { useRef, useState } from 'react';
import { parseGpxFile } from '../lib/gpx';
import { Parcours } from '../types';

interface ParcoursPanelProps {
  parcours: Parcours[];
  visibility: Record<string, boolean>;
  onToggleVisibility: (id: string) => void;
  onUpdate: (id: string, data: Partial<Parcours>) => Promise<void>;
  onRemoveGpx: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreate: () => Promise<void>;
}

const PRESET_COLORS = [
  '#2563eb', '#0ea5e9', '#0891b2', '#1d4ed8',
  '#16a34a', '#15803d', '#84cc16', '#65a30d',
  '#dc2626', '#b91c1c', '#f97316', '#ea580c',
  '#eab308', '#d97706', '#7c3aed', '#9333ea',
  '#db2777', '#ec4899', '#374151', '#6b7280',
];

export default function ParcoursPanel({ parcours, visibility, onToggleVisibility, onUpdate, onRemoveGpx, onDelete, onCreate }: ParcoursPanelProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null);
  const [hexInput, setHexInput] = useState('');
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

  function openPicker(p: Parcours) {
    setPickerOpenId(p.id);
    setHexInput(p.couleur);
  }

  function selectColor(p: Parcours, color: string) {
    onUpdate(p.id, { couleur: color });
    setPickerOpenId(null);
  }

  function handleHexChange(p: Parcours, value: string) {
    setHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      onUpdate(p.id, { couleur: value });
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

            {/* Color swatch + picker */}
            <div className="relative">
              <button
                type="button"
                title="Changer la couleur"
                className="w-7 h-7 rounded border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: p.couleur }}
                onClick={() => pickerOpenId === p.id ? setPickerOpenId(null) : openPicker(p)}
              />
              {pickerOpenId === p.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setPickerOpenId(null)} />
                  <div className="absolute left-0 top-9 z-20 bg-white border rounded-lg shadow-lg p-3 w-52">
                    <div className="grid grid-cols-5 gap-1.5 mb-3">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          title={color}
                          className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: color,
                            borderColor: p.couleur === color ? '#111' : 'transparent',
                          }}
                          onClick={() => selectColor(p, color)}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded border flex-shrink-0" style={{ backgroundColor: hexInput }} />
                      <input
                        type="text"
                        value={hexInput}
                        onChange={(e) => handleHexChange(p, e.target.value)}
                        placeholder="#000000"
                        maxLength={7}
                        className="flex-1 border rounded px-1.5 py-0.5 text-xs font-mono"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

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
              <button type="button" className="px-2 py-1 border rounded text-gray-500 hover:bg-gray-50 text-xs" onClick={() => onRemoveGpx(p.id)}>
                Retirer le GPX
              </button>
            )}
            <button
              type="button"
              className="px-2 py-1 border rounded text-red-600 hover:bg-red-50 ml-auto"
              onClick={() => { if (window.confirm(`Supprimer le parcours « ${p.nom} » ?`)) onDelete(p.id); }}
            >
              Supprimer
            </button>
          </div>
          <p className="text-xs text-gray-400">Glisser-déposer un fichier .gpx possible sur cette carte.</p>
        </div>
      ))}
      <button
        type="button"
        disabled={creating}
        onClick={async () => { setCreating(true); try { await onCreate(); } finally { setCreating(false); } }}
        className="w-full mt-1 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
      >
        {creating ? 'Création…' : '+ Ajouter un nouveau parcours'}
      </button>
    </div>
  );
}

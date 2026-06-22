import { PointExtraction } from '../types';
import NavButtons from './NavButtons';

interface PointExtractionFormProps {
  point: PointExtraction;
  isAdmin: boolean;
  onClose: () => void;
  onUpdate?: (data: Partial<PointExtraction>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function PointExtractionForm({ point, isAdmin, onClose, onUpdate, onDelete }: PointExtractionFormProps) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-3 gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm text-gray-500 whitespace-nowrap">
                Lettre
                <input
                  className="w-14 ml-1 border rounded px-2 py-1 text-sm"
                  defaultValue={point.lettre}
                  onBlur={(e) => e.target.value !== point.lettre && onUpdate?.({ lettre: e.target.value })}
                />
              </label>
              <input
                className="text-lg font-semibold border rounded px-2 py-1 flex-1"
                defaultValue={point.libelle}
                onBlur={(e) => e.target.value !== point.libelle && onUpdate?.({ libelle: e.target.value })}
              />
            </div>
          ) : (
            <h2 className="text-lg font-semibold">
              {point.lettre} — {point.libelle}
            </h2>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="text-sm mb-4">
          <span className="text-gray-500">Coordonnées GPS : </span>
          {isAdmin ? (
            <span className="inline-flex gap-1">
              <input
                type="number"
                step="0.00001"
                className="border rounded px-1 w-28"
                defaultValue={point.lat}
                onBlur={(e) => onUpdate?.({ lat: Number(e.target.value) })}
              />
              <input
                type="number"
                step="0.00001"
                className="border rounded px-1 w-28"
                defaultValue={point.lng}
                onBlur={(e) => onUpdate?.({ lng: Number(e.target.value) })}
              />
            </span>
          ) : (
            <span>
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
            </span>
          )}
        </div>

        <div className="flex justify-between pt-3 border-t flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <NavButtons lat={point.lat} lng={point.lng} />
          </div>
          {isAdmin && (
            <button
              className="text-sm px-3 py-1.5 border rounded text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (confirm("Supprimer ce point d'extraction ?")) {
                  await onDelete?.();
                  onClose();
                }
              }}
            >
              Supprimer le point
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

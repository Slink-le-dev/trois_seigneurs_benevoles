import { useState } from 'react';
import { Benevole } from '../types';

interface BenevoleModalProps {
  benevole: Benevole;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Benevole>) => Promise<void>;
}

export default function BenevoleModal({ benevole, onClose, onUpdate }: BenevoleModalProps) {
  const [nom, setNom] = useState(benevole.nom);
  const [telephone, setTelephone] = useState(benevole.telephone ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!nom.trim()) {
      alert('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      await onUpdate(benevole.id, { nom: nom.trim(), telephone: telephone.trim() || null });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold">Modifier le bénévole</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <label className="block">
            Nom
            <input
              className="border rounded w-full px-2 py-1 mt-1"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
            />
          </label>
          <label className="block">
            Téléphone
            <input
              className="border rounded w-full px-2 py-1 mt-1"
              placeholder="(optionnel)"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-3 border-t">
          <button className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50" onClick={onClose}>
            Annuler
          </button>
          <button className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded" onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

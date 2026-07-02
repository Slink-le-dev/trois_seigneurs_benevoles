import { useState } from 'react';
import logo from '../assets/logo.png';
import MapView from '../components/MapView';
import { useAppData } from '../lib/useAppData';
import { POSTE_TYPES, Poste } from '../types';

function PosteMiniCard({ poste, onClose }: { poste: Poste; onClose: () => void }) {
  const types = POSTE_TYPES.filter((t) => poste.types.includes(t.code));
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white border-t shadow-lg z-[1000] p-4 flex items-start justify-between gap-4">
      <div>
        <div className="font-semibold text-base">
          {types.map((t) => t.emoji).join(' ')} Poste {poste.numero} — {poste.nom}
        </div>
        <div className="text-sm text-gray-500 mt-0.5">
          {types.map((t) => t.label).join(' · ')}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0"
        aria-label="Fermer"
      >
        ×
      </button>
    </div>
  );
}

export default function ParticipantView() {
  const data = useAppData(false);
  const [parcoursVisibility, setParcoursVisibility] = useState<Record<string, boolean>>({});
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);

  const ravitaillementPostes = data.postes.filter(
    (p) => p.types.includes('eau') || p.types.includes('nourriture'),
  );

  const selectedPoste = ravitaillementPostes.find((p) => p.id === selectedPosteId) ?? null;

  function toggleParcours(id: string) {
    setParcoursVisibility((v) => ({ ...v, [id]: v[id] === false }));
  }

  if (data.loading) {
    return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#005F61] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo VO2max Tarascon" className="h-8 w-8 rounded-full" />
          <h1 className="font-semibold">Trail du Pic des Trois Seigneurs — Vue participant</h1>
        </div>
        <a href="/" className="text-sm underline opacity-80 hover:opacity-100">
          Vue bénévole
        </a>
      </header>

      {/* Parcours legend */}
      {data.parcours.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-white border-b text-sm flex-wrap">
          <span className="text-xs text-gray-400 uppercase tracking-wide font-medium flex-shrink-0">
            Parcours :
          </span>
          {data.parcours.map((p) => {
            const visible = parcoursVisibility[p.id] !== false;
            return (
              <label key={p.id} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => toggleParcours(p.id)}
                  className="accent-[#005F61]"
                />
                <span className="font-bold" style={{ color: p.couleur }}>
                  ●
                </span>
                <span className={visible ? '' : 'text-gray-400 line-through'}>{p.nom}</span>
                {(p.distance_km || p.denivele_m) && (
                  <span className="text-gray-400 text-xs">
                    {p.distance_km ? `${p.distance_km} km` : ''}
                    {p.distance_km && p.denivele_m ? ' / ' : ''}
                    {p.denivele_m ? `${p.denivele_m} m D+` : ''}
                  </span>
                )}
              </label>
            );
          })}
        </div>
      )}

      <div className="flex-1 relative">
        <MapView
          parcours={data.parcours}
          parcoursVisibility={parcoursVisibility}
          postes={ravitaillementPostes}
          benevoles={[]}
          getParcoursIdsForPoste={data.getParcoursIdsForPoste}
          getAffectationsForPoste={() => []}
          isAdmin={false}
          selectedPosteId={selectedPosteId}
          onSelectPoste={(id) => setSelectedPosteId((prev) => (prev === id ? null : id))}
        />

        {selectedPoste && (
          <PosteMiniCard poste={selectedPoste} onClose={() => setSelectedPosteId(null)} />
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import logo from '../assets/logo.png';
import FilterBar from '../components/FilterBar';
import MapView from '../components/MapView';
import PosteForm from '../components/PosteForm';
import { useAppData } from '../lib/useAppData';
import { PosteStatut, PosteTypeCode } from '../types';

export default function PublicConsultation() {
  const data = useAppData(false);
  const [parcoursVisibility, setParcoursVisibility] = useState<Record<string, boolean>>({});
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);
  const [filterParcoursIds, setFilterParcoursIds] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<PosteTypeCode[]>([]);
  const [filterStatuts, setFilterStatuts] = useState<PosteStatut[]>([]);
  const [showPois, setShowPois] = useState(false);

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;

  if (data.loading) {
    return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#005F61] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo VO2max Tarascon" className="h-8 w-8 rounded-full" />
          <h1 className="font-semibold">Postes Signaleurs — Course de montagne</h1>
        </div>
        <a href="/admin" className="text-sm underline opacity-80 hover:opacity-100">
          Espace organisateur
        </a>
      </header>

      <FilterBar
        parcours={data.parcours}
        filterParcoursIds={filterParcoursIds}
        setFilterParcoursIds={setFilterParcoursIds}
        filterTypes={filterTypes}
        setFilterTypes={setFilterTypes}
        filterStatuts={filterStatuts}
        setFilterStatuts={setFilterStatuts}
        showPois={showPois}
        setShowPois={setShowPois}
      />

      <div className="flex-1 relative">
        <MapView
          parcours={data.parcours}
          parcoursVisibility={parcoursVisibility}
          postes={data.postes}
          benevoles={data.benevoles}
          getParcoursIdsForPoste={data.getParcoursIdsForPoste}
          getAffectationsForPoste={data.getAffectationsForPoste}
          isAdmin={false}
          selectedPosteId={selectedPosteId}
          onSelectPoste={setSelectedPosteId}
          filterTypes={filterTypes}
          filterStatuts={filterStatuts}
          filterParcoursIds={filterParcoursIds}
          showPois={showPois}
        />
        <ParcoursLegend visibility={parcoursVisibility} setVisibility={setParcoursVisibility} parcours={data.parcours} />
      </div>

      {selectedPoste && (
        <PosteForm
          poste={selectedPoste}
          parcours={data.parcours}
          selectedParcoursIds={data.getParcoursIdsForPoste(selectedPoste.id)}
          affectations={data.affectations}
          benevoles={data.benevoles}
          isAdmin={false}
          onClose={() => setSelectedPosteId(null)}
        />
      )}
    </div>
  );
}

function ParcoursLegend({
  parcours,
  visibility,
  setVisibility,
}: {
  parcours: { id: string; nom: string; couleur: string }[];
  visibility: Record<string, boolean>;
  setVisibility: (v: Record<string, boolean>) => void;
}) {
  if (!parcours.length) return null;
  return (
    <div className="absolute top-2 right-2 bg-white/95 rounded shadow p-2 text-sm space-y-1 z-[500]">
      {parcours.map((p) => (
        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibility[p.id] !== false}
            onChange={() => setVisibility({ ...visibility, [p.id]: visibility[p.id] === false })}
          />
          <span style={{ color: p.couleur }}>●</span> {p.nom}
        </label>
      ))}
    </div>
  );
}

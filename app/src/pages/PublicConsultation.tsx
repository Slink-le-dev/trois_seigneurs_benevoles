import { useState } from 'react';
import logo from '../assets/logo.png';
import FilterBar from '../components/FilterBar';
import MapView from '../components/MapView';
import PointExtractionForm from '../components/PointExtractionForm';
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
  const [searchBenevole, setSearchBenevole] = useState('');
  const [showExtractions, setShowExtractions] = useState(true);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [onlyFormation, setOnlyFormation] = useState(false);

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;
  const selectedExtraction = data.pointsExtraction.find((p) => p.id === selectedExtractionId) ?? null;

  if (data.loading) {
    return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#005F61] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo VO2max Tarascon" className="h-8 w-8 rounded-full" />
          <h1 className="font-semibold">Postes bénévoles — Trail du Pic des Trois Seigneurs</h1>
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
        parcoursVisibility={parcoursVisibility}
        setParcoursVisibility={setParcoursVisibility}
        showPois={showPois}
        setShowPois={setShowPois}
        showExtractions={showExtractions}
        setShowExtractions={setShowExtractions}
        searchBenevole={searchBenevole}
        setSearchBenevole={setSearchBenevole}
        onlyFormation={onlyFormation}
        setOnlyFormation={setOnlyFormation}
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
          searchBenevole={searchBenevole}
          onlyFormation={onlyFormation}
          pointsExtraction={data.pointsExtraction}
          showExtractions={showExtractions}
          selectedExtractionId={selectedExtractionId}
          onSelectExtraction={setSelectedExtractionId}
        />
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

      {selectedExtraction && (
        <PointExtractionForm point={selectedExtraction} isAdmin={false} onClose={() => setSelectedExtractionId(null)} />
      )}
    </div>
  );
}

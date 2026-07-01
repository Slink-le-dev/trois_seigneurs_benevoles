import { useState } from 'react';
import logo from '../assets/logo.png';
import AbriTemporaireForm from '../components/AbriTemporaireForm';
import FilterBar from '../components/FilterBar';
import MapView from '../components/MapView';
import PointExtractionForm from '../components/PointExtractionForm';
import PosteForm from '../components/PosteForm';
import { useAppData } from '../lib/useAppData';
import { PosteMaterielCode, PosteStatut, PosteTypeCode } from '../types';

export default function PublicConsultation() {
  const data = useAppData(false);
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);
  const [filterParcoursIds, setFilterParcoursIds] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<PosteTypeCode[]>([]);
  const [filterStatuts, setFilterStatuts] = useState<PosteStatut[]>([]);
  const [filterMateriel, setFilterMateriel] = useState<PosteMaterielCode[]>([]);
  const [searchBenevole, setSearchBenevole] = useState('');
  const [showExtractions, setShowExtractions] = useState(false);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [showAbris, setShowAbris] = useState(false);
  const [selectedAbriId, setSelectedAbriId] = useState<string | null>(null);
  const [onlyFormation, setOnlyFormation] = useState(false);
  const [onlyPointPassage, setOnlyPointPassage] = useState(false);
  const [showKmMarkers, setShowKmMarkers] = useState(true);

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;
  const selectedExtraction = data.pointsExtraction.find((p) => p.id === selectedExtractionId) ?? null;
  const selectedAbri = data.abrisTemporaires.find((a) => a.id === selectedAbriId) ?? null;

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
        filterMateriel={filterMateriel}
        setFilterMateriel={setFilterMateriel}
        showExtractions={showExtractions}
        setShowExtractions={setShowExtractions}
        showAbris={showAbris}
        setShowAbris={setShowAbris}
        searchBenevole={searchBenevole}
        setSearchBenevole={setSearchBenevole}
        onlyFormation={onlyFormation}
        setOnlyFormation={setOnlyFormation}
        onlyPointPassage={onlyPointPassage}
        setOnlyPointPassage={setOnlyPointPassage}
        showKmMarkers={showKmMarkers}
        setShowKmMarkers={setShowKmMarkers}
      />

      <div className="flex-1 relative">
        <MapView
          parcours={data.parcours}
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
          filterMateriel={filterMateriel}
          searchBenevole={searchBenevole}
          onlyFormation={onlyFormation}
          onlyPointPassage={onlyPointPassage}
          showKmMarkers={showKmMarkers}
          pointsExtraction={data.pointsExtraction}
          showExtractions={showExtractions}
          selectedExtractionId={selectedExtractionId}
          onSelectExtraction={setSelectedExtractionId}
          abrisTemporaires={data.abrisTemporaires}
          showAbris={showAbris}
          selectedAbriId={selectedAbriId}
          onSelectAbri={setSelectedAbriId}
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

      {selectedAbri && (
        <AbriTemporaireForm abri={selectedAbri} isAdmin={false} onClose={() => setSelectedAbriId(null)} />
      )}
    </div>
  );
}

import { useState } from 'react';
import logo from '../assets/logo.png';
import AbriTemporaireForm from '../components/AbriTemporaireForm';
import FilterBar from '../components/FilterBar';
import GpxDownloadModal from '../components/GpxDownloadModal';
import MapView from '../components/MapView';
import PointExtractionForm from '../components/PointExtractionForm';
import PosteForm from '../components/PosteForm';
import { useAppData } from '../lib/useAppData';
import { PosteMaterielCode, PosteMissionCode, PosteStatut, PosteTypeCode } from '../types';

export default function PublicConsultation() {
  const data = useAppData(false);
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);
  const [filterParcoursIds, setFilterParcoursIds] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<PosteTypeCode[]>([]);
  const [filterStatuts, setFilterStatuts] = useState<PosteStatut[]>([]);
  const [filterMateriel, setFilterMateriel] = useState<PosteMaterielCode[]>([]);
  const [filterMissions, setFilterMissions] = useState<PosteMissionCode[]>([]);
  const [searchBenevole, setSearchBenevole] = useState('');
  const [showExtractions, setShowExtractions] = useState(false);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [showAbris, setShowAbris] = useState(false);
  const [selectedAbriId, setSelectedAbriId] = useState<string | null>(null);
  const [onlyFormation, setOnlyFormation] = useState(false);
  const [onlyPointPassage, setOnlyPointPassage] = useState(false);
  const [showKmMarkers, setShowKmMarkers] = useState(false);
  const [showGpxModal, setShowGpxModal] = useState(false);

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
        <div className="flex items-center gap-3 text-sm">
          {data.settings.show_gpx_download_benevoles && (
            <button
              type="button"
              onClick={() => setShowGpxModal(true)}
              className="flex items-center gap-1.5 opacity-80 hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Trace GPX
            </button>
          )}
          {data.settings.telephone_pc_securite && (
            <a
              href={`tel:${data.settings.telephone_pc_securite}`}
              className="flex items-center gap-1.5 opacity-80 hover:opacity-100"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="hidden sm:inline">PC Sécurité : </span>{data.settings.telephone_pc_securite}
            </a>
          )}
          <a href="/admin" className="underline opacity-80 hover:opacity-100">
            Espace organisateur
          </a>
        </div>
      </header>
      {showGpxModal && <GpxDownloadModal parcours={data.parcours} onClose={() => setShowGpxModal(false)} />}

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
        filterMissions={filterMissions}
        setFilterMissions={setFilterMissions}
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
          filterMissions={filterMissions}
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
          abrisTemporaires={data.abrisTemporaires}
          selectedAbriIds={data.getAbriIdsForPoste(selectedPoste.id)}
          pointsExtraction={data.pointsExtraction}
          selectedExtractionIds={data.getExtractionIdsForPoste(selectedPoste.id)}
          affectations={data.affectations}
          benevoles={data.benevoles}
          isAdmin={false}
          onClose={() => setSelectedPosteId(null)}
          allPostes={data.postes}
          getParcoursIdsForPoste={data.getParcoursIdsForPoste}
          showDenivele={data.settings.show_denivele}
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

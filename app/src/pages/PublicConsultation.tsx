import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import logo from '../assets/logo-las-quatras-cabanas.png';
import AbriTemporaireForm from '../components/AbriTemporaireForm';
import FilterBar from '../components/FilterBar';
import GpxDownloadModal from '../components/GpxDownloadModal';
import MapView from '../components/MapView';
import PointExtractionForm from '../components/PointExtractionForm';
import PosteForm from '../components/PosteForm';
import { supabase } from '../lib/supabaseClient';
import { useAppData } from '../lib/useAppData';
import { PosteMaterielCode, PosteMissionCode, PosteStatut, PosteTypeCode } from '../types';

export default function PublicConsultation() {
  const { slug } = useParams<{ slug: string }>();
  const [evenement, setEvenement] = useState<{ id: string; nom: string } | null>(null);
  const [evenementLoading, setEvenementLoading] = useState(true);

  useEffect(() => {
    if (!slug) { setEvenementLoading(false); return; }
    supabase.from('evenements').select('id, nom').eq('slug', slug).single()
      .then(({ data }) => {
        setEvenement(data ? { id: data.id, nom: data.nom } : null);
        setEvenementLoading(false);
      });
  }, [slug]);

  if (evenementLoading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  if (!evenement) return <div className="p-6 text-center text-red-500">Évènement introuvable.</div>;
  return <PublicConsultationContent evenement={evenement} slug={slug!} />;
}

function PublicConsultationContent({ evenement, slug }: { evenement: { id: string; nom: string }; slug: string }) {
  const data = useAppData(false, null, null, evenement.id);
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
  const [nextRavit, setNextRavit] = useState<{ km: number; nom: string; dPlus: number | null; dMoins: number | null } | null>(null);

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;
  const selectedExtraction = data.pointsExtraction.find((p) => p.id === selectedExtractionId) ?? null;
  const selectedAbri = data.abrisTemporaires.find((a) => a.id === selectedAbriId) ?? null;

  if (data.loading) {
    return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="text-white px-4 py-2 flex items-center justify-between" style={{ backgroundColor: data.settings.couleur_secondaire }}>
        <div className="flex items-center gap-2">
          <img src={data.settings.logo_url ?? logo} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
          <h1 className="font-semibold">{evenement.nom} — Vue bénévole</h1>
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
          <a href={`/admin/${slug}`} className="underline opacity-80 hover:opacity-100">
            Vue organisateur
          </a>
          <a href={`/participant/${slug}`} className="underline opacity-80 hover:opacity-100">
            Vue participant
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
        telephonePcSecurite={data.settings.telephone_pc_securite}
      />

      {nextRavit && (
        <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap px-4 py-1.5 bg-teal-50 border-b border-teal-100 text-sm">
          <span className="text-base leading-none">💧</span>
          <span className="font-medium text-teal-900 truncate">{nextRavit.nom}</span>
          <span className="ml-auto flex items-center gap-3 flex-shrink-0 font-semibold text-teal-800">
            <span>{nextRavit.km} km</span>
            {nextRavit.dPlus != null && <span>D+ {nextRavit.dPlus} m</span>}
            {nextRavit.dMoins != null && <span>D− {nextRavit.dMoins} m</span>}
          </span>
        </div>
      )}

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
          alwaysShowElevation
          onElevationParcoursChange={(id) => setFilterParcoursIds([id])}
          onElevationNextRavitUpdate={setNextRavit}
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

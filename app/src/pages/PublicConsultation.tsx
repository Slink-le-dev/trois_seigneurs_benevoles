import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import logo from '../assets/logo-las-quatras-cabanas.png';
import AbriTemporaireForm from '../components/AbriTemporaireForm';
import GpxDownloadModal from '../components/GpxDownloadModal';
import MapView from '../components/MapView';
import PointExtractionForm from '../components/PointExtractionForm';
import PosteForm from '../components/PosteForm';
import { supabase } from '../lib/supabaseClient';
import { useAppData } from '../lib/useAppData';
import {
  POSTE_MATERIELS,
  POSTE_STATUTS,
  POSTE_TYPES,
  PosteMaterielCode,
  PosteMissionCode,
  PosteStatut,
  PosteTypeCode,
} from '../types';

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

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

  // Filters — primary (inline bar)
  const [filterParcoursIds, setFilterParcoursIds] = useState<string[]>([]);
  const [searchBenevole, setSearchBenevole] = useState('');
  const [showKmMarkers, setShowKmMarkers] = useState(false);

  // Filters — secondary (popup)
  const [filterTypes, setFilterTypes] = useState<PosteTypeCode[]>([]);
  const [filterStatuts, setFilterStatuts] = useState<PosteStatut[]>([]);
  const [filterMateriel, setFilterMateriel] = useState<PosteMaterielCode[]>([]);
  const [filterMissions] = useState<PosteMissionCode[]>([]);
  const [onlyFormation, setOnlyFormation] = useState(false);
  const [showExtractions, setShowExtractions] = useState(false);
  const [showAbris, setShowAbris] = useState(false);
  const [onlyPointPassage, setOnlyPointPassage] = useState(false);

  // "Tous les filtres" popup
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [draftTypes, setDraftTypes] = useState<PosteTypeCode[]>([]);
  const [draftStatuts, setDraftStatuts] = useState<PosteStatut[]>([]);
  const [draftMateriel, setDraftMateriel] = useState<PosteMaterielCode[]>([]);
  const [draftOnlyFormation, setDraftOnlyFormation] = useState(false);
  const [draftShowExtractions, setDraftShowExtractions] = useState(false);
  const [draftShowAbris, setDraftShowAbris] = useState(false);
  const [draftOnlyPointPassage, setDraftOnlyPointPassage] = useState(false);

  // Other state
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [selectedAbriId, setSelectedAbriId] = useState<string | null>(null);
  const [showGpxModal, setShowGpxModal] = useState(false);
  const [nextRavit, setNextRavit] = useState<{ km: number; nom: string; dPlus: number | null; dMoins: number | null } | null>(null);

  const hasSecondaryFilters =
    filterTypes.length > 0 ||
    filterStatuts.length > 0 ||
    filterMateriel.length > 0 ||
    onlyFormation ||
    showExtractions ||
    showAbris ||
    onlyPointPassage;

  function openAllFilters() {
    setDraftTypes(filterTypes);
    setDraftStatuts(filterStatuts);
    setDraftMateriel(filterMateriel);
    setDraftOnlyFormation(onlyFormation);
    setDraftShowExtractions(showExtractions);
    setDraftShowAbris(showAbris);
    setDraftOnlyPointPassage(onlyPointPassage);
    setShowAllFilters(true);
  }

  function applyAllFilters() {
    setFilterTypes(draftTypes);
    setFilterStatuts(draftStatuts);
    setFilterMateriel(draftMateriel);
    setOnlyFormation(draftOnlyFormation);
    setShowExtractions(draftShowExtractions);
    setShowAbris(draftShowAbris);
    setOnlyPointPassage(draftOnlyPointPassage);
    setShowAllFilters(false);
  }

  function resetAllFilters() {
    setFilterTypes([]);
    setFilterStatuts([]);
    setFilterMateriel([]);
    setOnlyFormation(false);
    setShowExtractions(false);
    setShowAbris(false);
    setOnlyPointPassage(false);
    setShowAllFilters(false);
  }

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;
  const selectedExtraction = data.pointsExtraction.find((p) => p.id === selectedExtractionId) ?? null;
  const selectedAbri = data.abrisTemporaires.find((a) => a.id === selectedAbriId) ?? null;

  if (data.loading) {
    return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  }

  const accentColor = data.settings.couleur_secondaire;

  return (
    <div className="h-screen flex flex-col">
      {/* ---- Header ---- */}
      <header className="text-white px-4 py-2 flex items-center justify-between" style={{ backgroundColor: accentColor }}>
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
          <a href={`/admin/${slug}`} className="underline opacity-80 hover:opacity-100">Vue organisateur</a>
          <a href={`/participant/${slug}`} className="underline opacity-80 hover:opacity-100">Vue participant</a>
        </div>
      </header>

      {showGpxModal && <GpxDownloadModal parcours={data.parcours} onClose={() => setShowGpxModal(false)} />}

      {/* ---- Inline filter bar ---- */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b text-sm overflow-x-auto flex-nowrap sm:flex-wrap">

        {/* PC Sécurité */}
        {data.settings.telephone_pc_securite && (
          <>
            <a
              href={`tel:${data.settings.telephone_pc_securite.replace(/\s/g, '')}`}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-300 bg-red-50 text-red-700 text-sm hover:bg-red-100 select-none"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              PC Sécurité
            </a>
            <span className="text-gray-200 select-none flex-shrink-0">|</span>
          </>
        )}

        {/* Search */}
        <div className="flex-shrink-0 relative">
          <input
            type="text"
            placeholder="Rechercher un bénévole…"
            value={searchBenevole}
            onChange={(e) => setSearchBenevole(e.target.value)}
            className="border rounded-full px-3 py-1 pr-7 text-sm w-40 sm:w-52 focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
          {searchBenevole && (
            <button
              type="button"
              onClick={() => setSearchBenevole('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Parcours pills */}
        {data.parcours.length > 0 && (
          <>
            <span className="text-gray-200 select-none flex-shrink-0">|</span>
            <span className="hidden sm:inline text-xs text-gray-400 uppercase tracking-wide font-medium flex-shrink-0">Parcours :</span>
            {data.parcours.map((p) => {
              const active = filterParcoursIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setFilterParcoursIds(toggle(filterParcoursIds, p.id))}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm transition-colors select-none ${
                    active ? 'text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                  style={active ? { backgroundColor: p.couleur, borderColor: p.couleur } : {}}
                >
                  <span className="font-bold" style={{ color: active ? 'white' : p.couleur }}>●</span>
                  <span>{p.nom}</span>
                </button>
              );
            })}
          </>
        )}

        {/* Km markers */}
        <button
          type="button"
          onClick={() => setShowKmMarkers((v) => !v)}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm transition-colors select-none ${
            showKmMarkers ? 'bg-gray-700 text-white border-transparent' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Km
        </button>

        {/* Tous les filtres */}
        <button
          type="button"
          onClick={openAllFilters}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm transition-colors select-none ${
            hasSecondaryFilters
              ? 'border-gray-700 text-gray-800 bg-gray-50'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Tous les filtres
          {hasSecondaryFilters && (
            <span className="w-2 h-2 rounded-full bg-gray-700 flex-shrink-0" />
          )}
        </button>
      </div>

      {/* ---- Next ravitaillement banner ---- */}
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

      {/* ---- Map ---- */}
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

      {/* ---- Poste / extraction / abri forms ---- */}
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

      {/* ---- "Tous les filtres" popup ---- */}
      {showAllFilters && (
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[1000] p-4"
          onClick={() => setShowAllFilters(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold">Tous les filtres</h2>
              <button onClick={() => setShowAllFilters(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Type</h3>
                <div className="flex flex-wrap gap-3">
                  {POSTE_TYPES.map((t) => (
                    <label key={t.code} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftTypes.includes(t.code)}
                        onChange={() => setDraftTypes(toggle(draftTypes, t.code))}
                      />
                      {t.emoji} {t.label}
                    </label>
                  ))}
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={draftShowExtractions} onChange={(e) => setDraftShowExtractions(e.target.checked)} />
                    🚑 Points d'extraction
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={draftShowAbris} onChange={(e) => setDraftShowAbris(e.target.checked)} />
                    🏠 Abris temporaires
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={draftOnlyPointPassage} onChange={(e) => setDraftOnlyPointPassage(e.target.checked)} />
                    📍 Point de passage intermédiaire
                  </label>
                </div>
              </div>

              {/* Bénévoles */}
              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Bénévoles</h3>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={draftOnlyFormation} onChange={(e) => setDraftOnlyFormation(e.target.checked)} />
                    Avec bénévole formé (médecin, infirmier, pompier, PSC1…)
                  </label>
                </div>
              </div>

              {/* Matériel */}
              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Matériel</h3>
                <div className="flex flex-wrap gap-3">
                  {POSTE_MATERIELS.map((m) => (
                    <label key={m.code} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftMateriel.includes(m.code)}
                        onChange={() => setDraftMateriel(toggle(draftMateriel, m.code))}
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Statut */}
              <div>
                <h3 className="font-semibold text-gray-500 uppercase text-xs mb-2">Statut</h3>
                <div className="flex flex-wrap gap-3">
                  {POSTE_STATUTS.map((s) => (
                    <label key={s.code} className="flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={draftStatuts.includes(s.code)}
                        onChange={() => setDraftStatuts(toggle(draftStatuts, s.code))}
                      />
                      <span style={{ color: s.couleur }}>●</span> {s.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-2 mt-5 pt-3 border-t">
              <button
                className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
                onClick={resetAllFilters}
              >
                Réinitialiser
              </button>
              <button
                className="text-sm px-3 py-1.5 text-white rounded"
                style={{ backgroundColor: accentColor }}
                onClick={applyAllFilters}
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

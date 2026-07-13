import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import logo from '../assets/logo.png';
import GpxDownloadModal from '../components/GpxDownloadModal';
import MapView from '../components/MapView';
import PosteFormParticipant from '../components/PosteFormParticipant';
import { supabase } from '../lib/supabaseClient';
import { useAppData } from '../lib/useAppData';

export default function ParticipantView() {
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
  return <ParticipantViewContent evenement={evenement} />;
}

function ParticipantViewContent({ evenement }: { evenement: { id: string; nom: string } }) {
  const data = useAppData(false, null, null, evenement.id);
  const [selectedParcoursId, setSelectedParcoursId] = useState<string | null>(null);
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);
  const [showGpxModal, setShowGpxModal] = useState(false);
  const [showKmMarkers, setShowKmMarkers] = useState(false);
  const [nextRavit, setNextRavit] = useState<{ km: number; nom: string; dPlus: number | null; dMoins: number | null } | null>(null);

  const parcoursVisibility: Record<string, boolean> = selectedParcoursId
    ? Object.fromEntries(data.parcours.map((p) => [p.id, p.id === selectedParcoursId]))
    : {};

  const ravitaillementPostes = data.postes.filter(
    (p) => p.types.includes('eau') || p.types.includes('nourriture') || p.types.includes('medical'),
  );

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;


  if (data.loading) {
    return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#005F61] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={data.settings.logo_url ?? logo} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
          <h1 className="font-semibold">{evenement.nom} — Vue participant</h1>
        </div>
        {data.settings.show_gpx_download_participant && (
          <button
            type="button"
            onClick={() => setShowGpxModal(true)}
            className="text-sm flex items-center gap-1.5 opacity-80 hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Trace GPX
          </button>
        )}
      </header>
      {showGpxModal && <GpxDownloadModal parcours={data.parcours} onClose={() => setShowGpxModal(false)} />}

      {/* Parcours selector + km markers toggle */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b text-sm overflow-x-auto flex-nowrap sm:flex-wrap">
        {data.parcours.length > 0 && (
          <>
            <span className="hidden sm:inline text-xs text-gray-400 uppercase tracking-wide font-medium flex-shrink-0">
              Mon parcours :
            </span>
            {data.parcours.map((p) => {
              const active = selectedParcoursId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedParcoursId(active ? null : p.id)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm transition-colors select-none ${
                    active
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                  style={active ? { backgroundColor: p.couleur, borderColor: p.couleur } : {}}
                >
                  <span className="font-bold" style={{ color: active ? 'white' : p.couleur }}>
                    ●
                  </span>
                  <span>{p.nom}</span>
                  {(p.distance_km || p.denivele_m) && (
                    <span className={`hidden sm:inline ${active ? 'opacity-80 text-xs' : 'text-gray-400 text-xs'}`}>
                      {p.distance_km ? `${p.distance_km} km` : ''}
                      {p.distance_km && p.denivele_m ? ' / ' : ''}
                      {p.denivele_m ? `${p.denivele_m} m D+` : ''}
                    </span>
                  )}
                </button>
              );
            })}
            <span className="hidden sm:inline text-gray-200 select-none">|</span>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowKmMarkers((v) => !v)}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm transition-colors select-none ${
            showKmMarkers
              ? 'bg-gray-700 text-white border-transparent'
              : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Km
        </button>
      </div>

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
          parcoursVisibility={parcoursVisibility}
          postes={ravitaillementPostes}
          benevoles={[]}
          getParcoursIdsForPoste={data.getParcoursIdsForPoste}
          getAffectationsForPoste={() => []}
          filterParcoursIds={selectedParcoursId ? [selectedParcoursId] : []}
          isAdmin={false}
          selectedPosteId={selectedPosteId}
          onSelectPoste={setSelectedPosteId}
          showKmMarkers={showKmMarkers}
          hidePersonnelInfo
          alwaysShowElevation
          onElevationParcoursChange={setSelectedParcoursId}
          onElevationNextRavitUpdate={setNextRavit}
        />
      </div>

      {selectedPoste && (
        <PosteFormParticipant
          poste={selectedPoste}
          parcours={data.parcours}
          allPostes={data.postes}
          selectedParcoursId={selectedParcoursId}
          getParcoursIdsForPoste={data.getParcoursIdsForPoste}
          getBarriereHoraire={data.getBarriereHoraireForPoste}
          showDenivele={data.settings.show_denivele}
          onClose={() => setSelectedPosteId(null)}
        />
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import logo from '../assets/logo.png';
import BenevolesTable from '../components/BenevolesTable';
import DebrayabilitesTab from '../components/DebrayabilitesTab';
import ExportTab from '../components/ExportTab';
import GpxDownloadModal from '../components/GpxDownloadModal';
import FilterBar from '../components/FilterBar';
import MapView from '../components/MapView';
import ParcoursPanel from '../components/ParcoursPanel';
import AbriTemporaireForm from '../components/AbriTemporaireForm';
import PointExtractionForm from '../components/PointExtractionForm';
import PosteForm from '../components/PosteForm';
import StatusDashboard from '../components/StatusDashboard';
import MainCouranteTab from '../components/MainCouranteTab';
import ProfileModal from '../components/ProfileModal';
import { useAppData } from '../lib/useAppData';
import { supabase } from '../lib/supabaseClient';
import { useSession } from '../lib/useSession';
import { PosteMaterielCode, PosteMissionCode, PosteStatut, PosteTypeCode } from '../types';
import AdminLogin from './AdminLogin';

const DEFAULT_COULEURS = ['#2563eb', '#16a34a', '#dc2626'];

type Tab = 'carte' | 'benevoles' | 'dashboard' | 'maincourante' | 'export' | 'debrayabilites';

export default function AdminDashboard() {
  const { session, loading: sessionLoading, signOut } = useSession();
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

  if (sessionLoading || evenementLoading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  if (!session) return <AdminLogin />;
  if (!evenement) return <div className="p-6 text-center text-red-500">Évènement introuvable.</div>;

  return <AdminContent onSignOut={signOut} currentUserId={session.user.id} currentUserEmail={session.user.email ?? null} evenement={evenement} />;
}

function AdminContent({
  onSignOut,
  currentUserId,
  currentUserEmail,
  evenement,
}: {
  onSignOut: () => void;
  currentUserId: string;
  currentUserEmail: string | null;
  evenement: { id: string; nom: string };
}) {
  const data = useAppData(true, currentUserId, currentUserEmail, evenement.id);
  const [tab, setTab] = useState<Tab>('carte');
  const [showGpxModal, setShowGpxModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [parcoursVisibility, setParcoursVisibility] = useState<Record<string, boolean>>({});
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [filterParcoursIds, setFilterParcoursIds] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<PosteTypeCode[]>([]);
  const [filterStatuts, setFilterStatuts] = useState<PosteStatut[]>([]);
  const [filterMateriel, setFilterMateriel] = useState<PosteMaterielCode[]>([]);
  const [filterMissions, setFilterMissions] = useState<PosteMissionCode[]>([]);
  const [searchBenevole, setSearchBenevole] = useState('');
  const [showExtractions, setShowExtractions] = useState(false);
  const [onlyFormation, setOnlyFormation] = useState(false);
  const [onlyPointPassage, setOnlyPointPassage] = useState(false);
  const [showKmMarkers, setShowKmMarkers] = useState(false);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [placingModeExtraction, setPlacingModeExtraction] = useState(false);
  const [manualLatExtraction, setManualLatExtraction] = useState('');
  const [manualLngExtraction, setManualLngExtraction] = useState('');
  const [showAbris, setShowAbris] = useState(false);
  const [selectedAbriId, setSelectedAbriId] = useState<string | null>(null);
  const [placingModeAbri, setPlacingModeAbri] = useState(false);
  const [manualLatAbri, setManualLatAbri] = useState('');
  const [manualLngAbri, setManualLngAbri] = useState('');

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;
  const selectedExtraction = data.pointsExtraction.find((p) => p.id === selectedExtractionId) ?? null;
  const selectedAbri = data.abrisTemporaires.find((a) => a.id === selectedAbriId) ?? null;
  const radiosAttribuees = data.postes.filter((p) => p.materiel?.includes('radio')).length;
  const troussesAttribuees = data.postes.filter((p) => p.materiel?.includes('trousse_soin')).length;

  async function handleMapClickCreate(lat: number, lng: number) {
    const poste = await data.createPoste({ nom: 'Nouveau poste', lat, lng, types: [], statut: 'non_active' }, []);
    setPlacingMode(false);
    setSelectedPosteId(poste.id);
  }

  async function handleManualCreate() {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert('Coordonnées GPS invalides.');
      return;
    }
    const poste = await data.createPoste({ nom: 'Nouveau poste', lat, lng, types: [], statut: 'non_active' }, []);
    setManualLat('');
    setManualLng('');
    setSelectedPosteId(poste.id);
  }

  function togglePlacingMode() {
    setPlacingModeExtraction(false);
    setPlacingModeAbri(false);
    setPlacingMode((v) => !v);
  }

  function togglePlacingModeExtraction() {
    setPlacingMode(false);
    setPlacingModeAbri(false);
    setPlacingModeExtraction((v) => !v);
  }

  function togglePlacingModeAbri() {
    setPlacingMode(false);
    setPlacingModeExtraction(false);
    setPlacingModeAbri((v) => !v);
  }

  async function handleMapClickCreateExtraction(lat: number, lng: number) {
    const point = await data.createPointExtraction({ libelle: 'Nouveau point', lat, lng });
    setPlacingModeExtraction(false);
    setSelectedExtractionId(point.id);
  }

  async function handleManualCreateExtraction() {
    const lat = Number(manualLatExtraction);
    const lng = Number(manualLngExtraction);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert('Coordonnées GPS invalides.');
      return;
    }
    const point = await data.createPointExtraction({ libelle: 'Nouveau point', lat, lng });
    setManualLatExtraction('');
    setManualLngExtraction('');
    setSelectedExtractionId(point.id);
  }

  async function handleMapClickCreateAbri(lat: number, lng: number) {
    const abri = await data.createAbriTemporaire({ nom: 'Nouvel abri', capacite: 1, lat, lng });
    setPlacingModeAbri(false);
    setSelectedAbriId(abri.id);
  }

  async function handleManualCreateAbri() {
    const lat = Number(manualLatAbri);
    const lng = Number(manualLngAbri);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert('Coordonnées GPS invalides.');
      return;
    }
    const abri = await data.createAbriTemporaire({ nom: 'Nouvel abri', capacite: 1, lat, lng });
    setManualLatAbri('');
    setManualLngAbri('');
    setSelectedAbriId(abri.id);
  }

  if (data.loading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#00C389] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={data.settings.logo_url ?? logo} alt="Logo Marmota" className="h-8 w-8 rounded-full object-cover" />
          <div>
            <Link to="/admin" className="text-xs opacity-70 hover:opacity-100 hover:underline">← Mes évènements</Link>
            <h1 className="font-semibold leading-tight">
              Marmota{data.settings.organisateur_nom ? ` — ${data.settings.organisateur_nom}` : ''}
            </h1>
            <p className="text-xs opacity-80 leading-tight">{evenement.nom}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
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
          <a href="/benevoles" target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">
            Vue bénévole
          </a>
          <a href="/participant" target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100">
            Vue participant
          </a>
          <button
            onClick={() => setShowProfile(true)}
            title="Profil"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors opacity-80 hover:opacity-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowSignOutConfirm(true)}
            title="Déconnexion"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors opacity-80 hover:opacity-100"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSignOutConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-900 font-semibold text-center mb-5">Êtes-vous sûr de vouloir vous déconnecter ?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 border rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Rester connecté
              </button>
              <button
                onClick={onSignOut}
                className="flex-1 bg-[#00C389] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#00a874]"
              >
                Me déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
      {showGpxModal && <GpxDownloadModal parcours={data.parcours} onClose={() => setShowGpxModal(false)} />}

      <nav className="flex border-b bg-white text-sm overflow-x-auto">
        {(['carte', 'benevoles', 'dashboard', 'maincourante', 'export', 'debrayabilites'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 whitespace-nowrap flex-shrink-0 ${tab === t ? 'border-b-2 border-[#F3EA5D] font-medium' : 'text-gray-500'}`}
            onClick={() => setTab(t)}
          >
            {t === 'carte'
              ? 'Carte & postes'
              : t === 'benevoles'
              ? 'Bénévoles'
              : t === 'dashboard'
              ? 'Tableau de bord'
              : t === 'maincourante'
              ? 'Main courante'
              : t === 'export'
              ? 'Export'
              : 'Débrayabilités'}
          </button>
        ))}
      </nav>

      {tab === 'carte' && (
        <>
          <div className="flex items-center justify-between bg-white border-b flex-wrap">
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
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 whitespace-nowrap">
              <span>
                📻 Radios :{' '}
                <strong className={radiosAttribuees > 25 ? 'text-red-600' : ''}>{radiosAttribuees}</strong>/25
              </span>
              <span>
                🩹 Trousses de soin : <strong>{troussesAttribuees}</strong>
              </span>
            </div>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-80 border-r overflow-y-auto p-3 space-y-4 hidden md:block">
              <ParcoursPanel
                parcours={data.parcours}
                visibility={parcoursVisibility}
                onToggleVisibility={(id) => setParcoursVisibility((v) => ({ ...v, [id]: v[id] === false }))}
                onUpdate={data.updateParcours}
                onRemoveGpx={data.deleteParcoursGpx}
                onDelete={data.deleteParcours}
                onCreate={async () => { await data.createParcours({ nom: 'Nouveau parcours', couleur: DEFAULT_COULEURS[data.parcours.length % DEFAULT_COULEURS.length] }); }}
              />

              <div className="border-t pt-3 space-y-2">
                <h2 className="font-semibold text-sm uppercase text-gray-500">Nouveau poste</h2>
                <button
                  className={`w-full py-2 rounded text-sm ${placingMode ? 'bg-blue-700 text-white' : 'border hover:bg-gray-50'}`}
                  onClick={togglePlacingMode}
                >
                  {placingMode ? 'Cliquez sur la carte…' : '📍 Cliquer sur la carte'}
                </button>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Latitude"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                  />
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Longitude"
                    value={manualLng}
                    onChange={(e) => setManualLng(e.target.value)}
                  />
                </div>
                <button className="w-full py-2 rounded border text-sm hover:bg-gray-50" onClick={handleManualCreate}>
                  Créer via coordonnées
                </button>
              </div>

              <div className="border-t pt-3 space-y-2">
                <h2 className="font-semibold text-sm uppercase text-gray-500">Nouveau point d'extraction</h2>
                <button
                  className={`w-full py-2 rounded text-sm ${placingModeExtraction ? 'bg-red-600 text-white' : 'border hover:bg-gray-50'}`}
                  onClick={togglePlacingModeExtraction}
                >
                  {placingModeExtraction ? 'Cliquez sur la carte…' : '📍 Cliquer sur la carte'}
                </button>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Latitude"
                    value={manualLatExtraction}
                    onChange={(e) => setManualLatExtraction(e.target.value)}
                  />
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Longitude"
                    value={manualLngExtraction}
                    onChange={(e) => setManualLngExtraction(e.target.value)}
                  />
                </div>
                <button className="w-full py-2 rounded border text-sm hover:bg-gray-50" onClick={handleManualCreateExtraction}>
                  Créer via coordonnées
                </button>
              </div>

              <div className="border-t pt-3 space-y-2">
                <h2 className="font-semibold text-sm uppercase text-gray-500">Nouveau abri temporaire</h2>
                <button
                  className={`w-full py-2 rounded text-sm ${placingModeAbri ? 'bg-violet-600 text-white' : 'border hover:bg-gray-50'}`}
                  onClick={togglePlacingModeAbri}
                >
                  {placingModeAbri ? 'Cliquez sur la carte…' : '📍 Cliquer sur la carte'}
                </button>
                <div className="flex gap-2">
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Latitude"
                    value={manualLatAbri}
                    onChange={(e) => setManualLatAbri(e.target.value)}
                  />
                  <input
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Longitude"
                    value={manualLngAbri}
                    onChange={(e) => setManualLngAbri(e.target.value)}
                  />
                </div>
                <button className="w-full py-2 rounded border text-sm hover:bg-gray-50" onClick={handleManualCreateAbri}>
                  Créer via coordonnées
                </button>
              </div>
            </aside>

            <div className="flex-1 relative">
              <MapView
                parcours={data.parcours}
                parcoursVisibility={parcoursVisibility}
                postes={data.postes}
                benevoles={data.benevoles}
                getParcoursIdsForPoste={data.getParcoursIdsForPoste}
                getAffectationsForPoste={data.getAffectationsForPoste}
                isAdmin
                selectedPosteId={selectedPosteId}
                onSelectPoste={setSelectedPosteId}
                placingMode={placingMode}
                onMapClickCreate={handleMapClickCreate}
                onMovePoste={data.movePoste}
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
                placingModeExtraction={placingModeExtraction}
                onMapClickCreateExtraction={handleMapClickCreateExtraction}
                onMoveExtraction={data.moveExtraction}
                abrisTemporaires={data.abrisTemporaires}
                showAbris={showAbris}
                selectedAbriId={selectedAbriId}
                onSelectAbri={setSelectedAbriId}
                placingModeAbri={placingModeAbri}
                onMapClickCreateAbri={handleMapClickCreateAbri}
                onMoveAbri={data.moveAbriTemporaire}
              />
            </div>
          </div>
        </>
      )}

      {tab === 'benevoles' && (
        <div className="flex-1 overflow-y-auto p-4">
          <BenevolesTable
            benevoles={data.benevoles}
            affectations={data.affectations}
            postes={data.postes}
            onCreateBenevole={data.createBenevole}
            onUpdateBenevole={data.updateBenevole}
            onDeleteBenevole={data.deleteBenevole}
            onCreateAffectation={data.createAffectation}
            onDeleteAffectation={data.deleteAffectation}
          />
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="flex-1 overflow-y-auto p-4">
          <StatusDashboard postes={data.postes} affectations={data.affectations} onSelectPoste={(id) => { setTab('carte'); setSelectedPosteId(id); }} />
        </div>
      )}

      {tab === 'maincourante' && (
        <div className="flex-1 overflow-y-auto p-4">
          <MainCouranteTab
            events={data.mainCourante}
            postes={data.postes}
            benevoles={data.benevoles}
            parcours={data.parcours}
            affectations={data.affectations}
            journal={data.mainCouranteJournal}
            commentaires={data.mainCouranteCommentaires}
            onCreate={data.createMainCourante}
            onUpdate={data.updateMainCourante}
            onDelete={data.deleteMainCourante}
            onAddCommentaire={data.createMainCouranteCommentaire}
          />
        </div>
      )}

      {tab === 'export' && (
        <div className="flex-1 overflow-y-auto">
          <ExportTab
            postes={data.postes}
            benevoles={data.benevoles}
            affectations={data.affectations}
          />
        </div>
      )}

      {tab === 'debrayabilites' && (
        <div className="flex-1 overflow-y-auto">
          <DebrayabilitesTab settings={data.settings} onUpdateSettings={data.updateSettings} />
        </div>
      )}

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
          isAdmin
          onClose={() => setSelectedPosteId(null)}
          onUpdate={(d) => data.updatePoste(selectedPoste.id, d)}
          onDelete={() => data.deletePoste(selectedPoste.id)}
          onSetParcoursIds={(ids) => data.setPosteParcoursLinks(selectedPoste.id, ids)}
          onSetAbriIds={(ids) => data.setPosteAbrisLinks(selectedPoste.id, ids)}
          onSetExtractionIds={(ids) => data.setPosteExtractionsLinks(selectedPoste.id, ids)}
          onSetStatut={(s) => data.setPosteStatut(selectedPoste.id, s)}
          onCreateBenevole={data.createBenevole}
          onCreateAffectation={data.createAffectation}
          onDeleteAffectation={data.deleteAffectation}
          allPostes={data.postes}
          getParcoursIdsForPoste={data.getParcoursIdsForPoste}
        />
      )}

      {selectedExtraction && (
        <PointExtractionForm
          point={selectedExtraction}
          isAdmin
          onClose={() => setSelectedExtractionId(null)}
          onUpdate={(d) => data.updatePointExtraction(selectedExtraction.id, d)}
          onDelete={() => data.deletePointExtraction(selectedExtraction.id)}
        />
      )}

      {selectedAbri && (
        <AbriTemporaireForm
          abri={selectedAbri}
          isAdmin
          onClose={() => setSelectedAbriId(null)}
          onUpdate={(d) => data.updateAbriTemporaire(selectedAbri.id, d)}
          onDelete={() => data.deleteAbriTemporaire(selectedAbri.id)}
        />
      )}
    </div>
  );
}

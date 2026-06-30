import { useEffect, useRef, useState } from 'react';
import logo from '../assets/logo.png';
import BenevolesTable from '../components/BenevolesTable';
import FilterBar from '../components/FilterBar';
import MapView from '../components/MapView';
import ParcoursPanel from '../components/ParcoursPanel';
import PointExtractionForm from '../components/PointExtractionForm';
import PosteForm from '../components/PosteForm';
import StatusDashboard from '../components/StatusDashboard';
import MainCouranteTab from '../components/MainCouranteTab';
import { useAppData } from '../lib/useAppData';
import { useSession } from '../lib/useSession';
import { PosteStatut, PosteTypeCode } from '../types';
import AdminLogin from './AdminLogin';

const DEFAULT_COULEURS = ['#2563eb', '#16a34a', '#dc2626'];

type Tab = 'carte' | 'benevoles' | 'dashboard' | 'maincourante';

export default function AdminDashboard() {
  const { session, loading: sessionLoading, signOut } = useSession();

  if (sessionLoading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  if (!session) return <AdminLogin />;

  return <AdminContent onSignOut={signOut} currentUserId={session.user.id} currentUserEmail={session.user.email ?? null} />;
}

function AdminContent({
  onSignOut,
  currentUserId,
  currentUserEmail,
}: {
  onSignOut: () => void;
  currentUserId: string;
  currentUserEmail: string | null;
}) {
  const data = useAppData(true, currentUserId, currentUserEmail);
  const [tab, setTab] = useState<Tab>('carte');
  const [parcoursVisibility, setParcoursVisibility] = useState<Record<string, boolean>>({});
  const [selectedPosteId, setSelectedPosteId] = useState<string | null>(null);
  const [placingMode, setPlacingMode] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [filterParcoursIds, setFilterParcoursIds] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<PosteTypeCode[]>([]);
  const [filterStatuts, setFilterStatuts] = useState<PosteStatut[]>([]);
  const [showPois, setShowPois] = useState(false);
  const [searchBenevole, setSearchBenevole] = useState('');
  const [showExtractions, setShowExtractions] = useState(false);
  const [onlyFormation, setOnlyFormation] = useState(false);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [placingModeExtraction, setPlacingModeExtraction] = useState(false);
  const [manualLatExtraction, setManualLatExtraction] = useState('');
  const [manualLngExtraction, setManualLngExtraction] = useState('');

  // Garantit l'existence des 3 parcours de la course (une seule fois)
  const seedingParcours = useRef(false);
  useEffect(() => {
    if (data.loading || seedingParcours.current) return;
    const missing = 3 - data.parcours.length;
    if (missing > 0) {
      seedingParcours.current = true;
      (async () => {
        for (let i = 0; i < missing; i++) {
          const index = data.parcours.length + i;
          await data.createParcours({ nom: `Parcours ${index + 1}`, couleur: DEFAULT_COULEURS[index % 3] });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.loading, data.parcours.length]);

  const selectedPoste = data.postes.find((p) => p.id === selectedPosteId) ?? null;
  const selectedExtraction = data.pointsExtraction.find((p) => p.id === selectedExtractionId) ?? null;

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
    setPlacingMode((v) => !v);
  }

  function togglePlacingModeExtraction() {
    setPlacingMode(false);
    setPlacingModeExtraction((v) => !v);
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

  if (data.loading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-[#00C389] text-white px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo VO2max Tarascon" className="h-8 w-8 rounded-full" />
          <h1 className="font-semibold">Espace organisateur</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a href="/" className="underline opacity-80 hover:opacity-100">
            Vue consultation
          </a>
          <button onClick={onSignOut} className="underline opacity-80 hover:opacity-100">
            Déconnexion
          </button>
        </div>
      </header>

      <nav className="flex border-b bg-white text-sm">
        {(['carte', 'benevoles', 'dashboard', 'maincourante'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 ${tab === t ? 'border-b-2 border-[#F3EA5D] font-medium' : 'text-gray-500'}`}
            onClick={() => setTab(t)}
          >
            {t === 'carte'
              ? 'Carte & postes'
              : t === 'benevoles'
              ? 'Bénévoles'
              : t === 'dashboard'
              ? 'Tableau de bord'
              : 'Main courante'}
          </button>
        ))}
      </nav>

      {tab === 'carte' && (
        <>
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
          <div className="flex-1 flex overflow-hidden">
            <aside className="w-80 border-r overflow-y-auto p-3 space-y-4 hidden md:block">
              <ParcoursPanel
                parcours={data.parcours}
                visibility={parcoursVisibility}
                onToggleVisibility={(id) => setParcoursVisibility((v) => ({ ...v, [id]: v[id] === false }))}
                onUpdate={data.updateParcours}
                onRemoveGpx={data.deleteParcoursGpx}
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
                showPois={showPois}
                searchBenevole={searchBenevole}
                onlyFormation={onlyFormation}
                pointsExtraction={data.pointsExtraction}
                showExtractions={showExtractions}
                selectedExtractionId={selectedExtractionId}
                onSelectExtraction={setSelectedExtractionId}
                placingModeExtraction={placingModeExtraction}
                onMapClickCreateExtraction={handleMapClickCreateExtraction}
                onMoveExtraction={data.moveExtraction}
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

      {selectedPoste && (
        <PosteForm
          poste={selectedPoste}
          parcours={data.parcours}
          selectedParcoursIds={data.getParcoursIdsForPoste(selectedPoste.id)}
          affectations={data.affectations}
          benevoles={data.benevoles}
          isAdmin
          onClose={() => setSelectedPosteId(null)}
          onUpdate={(d) => data.updatePoste(selectedPoste.id, d)}
          onDelete={() => data.deletePoste(selectedPoste.id)}
          onSetParcoursIds={(ids) => data.setPosteParcoursLinks(selectedPoste.id, ids)}
          onSetStatut={(s) => data.setPosteStatut(selectedPoste.id, s)}
          onCreateBenevole={data.createBenevole}
          onCreateAffectation={data.createAffectation}
          onDeleteAffectation={data.deleteAffectation}
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
    </div>
  );
}

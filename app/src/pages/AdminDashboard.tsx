import { useEffect, useRef, useState } from 'react';
import logo from '../assets/logo.png';
import BenevolesTable from '../components/BenevolesTable';
import FilterBar from '../components/FilterBar';
import MapView from '../components/MapView';
import ParcoursPanel from '../components/ParcoursPanel';
import PosteForm from '../components/PosteForm';
import StatusDashboard from '../components/StatusDashboard';
import { useAppData } from '../lib/useAppData';
import { useSession } from '../lib/useSession';
import { PosteStatut, PosteTypeCode } from '../types';
import AdminLogin from './AdminLogin';

const DEFAULT_COULEURS = ['#2563eb', '#16a34a', '#dc2626'];

type Tab = 'carte' | 'benevoles' | 'dashboard';

export default function AdminDashboard() {
  const { session, loading: sessionLoading, signOut } = useSession();

  if (sessionLoading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  if (!session) return <AdminLogin />;

  return <AdminContent onSignOut={signOut} />;
}

function AdminContent({ onSignOut }: { onSignOut: () => void }) {
  const data = useAppData(true);
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
        {(['carte', 'benevoles', 'dashboard'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 ${tab === t ? 'border-b-2 border-blue-700 font-medium' : 'text-gray-500'}`}
            onClick={() => setTab(t)}
          >
            {t === 'carte' ? 'Carte & postes' : t === 'benevoles' ? 'Bénévoles' : 'Tableau de bord'}
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
                  onClick={() => setPlacingMode((v) => !v)}
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
    </div>
  );
}

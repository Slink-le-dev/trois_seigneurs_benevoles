import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo-las-quatras-cabanas.png';
import ProfileModal from '../components/ProfileModal';
import AdminLogin from './AdminLogin';
import { supabase } from '../lib/supabaseClient';
import { useSession } from '../lib/useSession';
import { Evenement } from '../types';

export default function EvenementsPage() {
  const { session, loading: sessionLoading, signOut } = useSession();

  if (sessionLoading) return <div className="p-6 text-center text-gray-500">Chargement…</div>;
  if (!session) return <AdminLogin />;

  return <EvenementsContent onSignOut={signOut} />;
}

function toSlug(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function formatDate(debut: string, fin?: string | null) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
  const d = new Date(debut + 'T12:00:00').toLocaleDateString('fr-FR', opts);
  if (fin) {
    const f = new Date(fin + 'T12:00:00').toLocaleDateString('fr-FR', opts);
    return `${d} – ${f}`;
  }
  return d;
}

function IconPencil() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function EventCard({
  evt,
  past,
  onEdit,
  onDelete,
}: {
  evt: Evenement;
  past?: boolean;
  onEdit: (evt: Evenement) => void;
  onDelete: (evt: Evenement) => void;
}) {
  return (
    <div className={`relative flex items-center bg-white rounded-lg border transition-all group ${past ? 'border-gray-100 opacity-70 hover:opacity-100' : 'border-gray-200'} hover:border-[#00C389] hover:shadow-sm`}>
      <Link to={`/admin/${evt.slug}`} className="flex-1 flex items-center justify-between px-5 py-4">
        <div>
          <div className={`font-semibold group-hover:text-[#005F61] ${past ? 'text-gray-600' : 'text-gray-900'}`}>{evt.nom}</div>
          <div className="text-sm text-gray-500 mt-0.5">{formatDate(evt.date_debut, evt.date_fin)}</div>
        </div>
        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#00C389] flex-shrink-0 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onEdit(evt); }}
        className="flex-shrink-0 p-3 text-gray-300 hover:text-blue-500 transition-colors"
        title="Modifier"
      >
        <IconPencil />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); onDelete(evt); }}
        className="flex-shrink-0 p-3 mr-1 text-gray-300 hover:text-red-500 transition-colors"
        title="Supprimer"
      >
        <IconTrash />
      </button>
    </div>
  );
}

interface EventForm {
  nom: string;
  date_debut: string;
  date_fin: string;
  slug: string;
}

const EMPTY_FORM: EventForm = { nom: '', date_debut: '', date_fin: '', slug: '' };

function formFromEvt(evt: Evenement): EventForm {
  return { nom: evt.nom, date_debut: evt.date_debut, date_fin: evt.date_fin ?? '', slug: evt.slug };
}

function EvenementsContent({ onSignOut }: { onSignOut: () => void }) {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [organisateurNom, setOrganisateurNom] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    supabase.from('app_settings').select('organisateur_nom, logo_url').single().then(({ data }) => {
      if (!data) return;
      const d = data as any;
      setOrganisateurNom(d.organisateur_nom ?? '');
      setLogoUrl(d.logo_url ?? null);
    });
  }, []);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<EventForm>(EMPTY_FORM);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit modal
  const [editTarget, setEditTarget] = useState<Evenement | null>(null);
  const [editForm, setEditForm] = useState<EventForm>(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Evenement | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const aVenir = evenements.filter((e) => e.date_debut >= today).sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  const passes = evenements.filter((e) => e.date_debut < today).sort((a, b) => b.date_debut.localeCompare(a.date_debut));

  function fetchEvenements() {
    supabase.from('evenements').select('*').then(({ data }) => {
      setEvenements(data ?? []);
      setLoading(false);
    });
  }

  useEffect(() => { fetchEvenements(); }, []);

  // ---- Create ----
  function handleCreateNomChange(nom: string) {
    setCreateForm((f) => ({ ...f, nom, slug: toSlug(nom) }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.nom || !createForm.date_debut || !createForm.slug) return;
    setCreateSaving(true);
    setCreateError(null);
    const { error: err } = await supabase.from('evenements').insert({
      nom: createForm.nom,
      date_debut: createForm.date_debut,
      date_fin: createForm.date_fin || null,
      slug: createForm.slug,
    });
    setCreateSaving(false);
    if (err) {
      setCreateError(err.message.includes('unique') ? 'Ce slug est déjà utilisé. Modifiez-le.' : err.message);
      return;
    }
    setShowCreate(false);
    setCreateForm(EMPTY_FORM);
    fetchEvenements();
  }

  function handleCreateClose() {
    setShowCreate(false);
    setCreateForm(EMPTY_FORM);
    setCreateError(null);
  }

  // ---- Edit ----
  function openEdit(evt: Evenement) {
    setEditTarget(evt);
    setEditForm(formFromEvt(evt));
    setEditError(null);
  }

  function handleEditNomChange(nom: string) {
    setEditForm((f) => ({ ...f, nom, slug: toSlug(nom) }));
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editForm.nom || !editForm.date_debut || !editForm.slug) return;
    setEditSaving(true);
    setEditError(null);
    const { error: err } = await supabase.from('evenements').update({
      nom: editForm.nom,
      date_debut: editForm.date_debut,
      date_fin: editForm.date_fin || null,
      slug: editForm.slug,
    }).eq('id', editTarget.id);
    setEditSaving(false);
    if (err) {
      setEditError(err.message.includes('unique') ? 'Ce slug est déjà utilisé. Modifiez-le.' : err.message);
      return;
    }
    setEditTarget(null);
    fetchEvenements();
  }

  // ---- Delete ----
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('evenements').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    fetchEvenements();
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-[#00C389] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logoUrl ?? logo} alt="Logo Marmota" className="h-8 w-8 rounded-full object-cover" />
          <h1 className="font-semibold">Marmota{organisateurNom ? ` — ${organisateurNom}` : ''}</h1>
        </div>
        <div className="flex items-center gap-1">
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

      <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-800">Mes évènements à venir</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-[#00C389] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#00a874] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nouvel évènement
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement…</div>
        ) : (
          <>
            {aVenir.length === 0 ? (
              <div className="text-center text-gray-400 py-8 bg-white rounded-lg border border-gray-200">Aucun évènement à venir.</div>
            ) : (
              <div className="space-y-3">
                {aVenir.map((evt) => (
                  <EventCard key={evt.id} evt={evt} onEdit={openEdit} onDelete={setDeleteTarget} />
                ))}
              </div>
            )}

            {passes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-500 mb-4">Mes évènements passés</h2>
                <div className="space-y-3">
                  {passes.map((evt) => (
                    <EventCard key={evt.id} evt={evt} past onEdit={openEdit} onDelete={setDeleteTarget} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ---- Edit modal ---- */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Modifier l'évènement</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'évènement</label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={editForm.nom}
                  onChange={(e) => handleEditNomChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                  <input
                    required
                    type="date"
                    value={editForm.date_debut}
                    onChange={(e) => setEditForm((f) => ({ ...f, date_debut: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin <span className="text-gray-400 font-normal">(optionnelle)</span></label>
                  <input
                    type="date"
                    value={editForm.date_fin}
                    onChange={(e) => setEditForm((f) => ({ ...f, date_fin: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant URL</label>
                <input
                  required
                  type="text"
                  value={editForm.slug}
                  onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                />
                <p className="text-xs text-gray-400 mt-1">Modifie l'URL d'accès à cet évènement · doit être unique</p>
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="flex-1 border rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 bg-[#00C389] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#00a874] disabled:opacity-60"
                >
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Delete modal ---- */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <IconTrash />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Êtes-vous sûr de vouloir supprimer «&nbsp;{deleteTarget.nom}&nbsp;» ?</h3>
                <p className="text-sm text-gray-500 mt-1">Cette action est définitive.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Create modal ---- */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={handleCreateClose}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Nouvel évènement</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'évènement</label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={createForm.nom}
                  onChange={(e) => handleCreateNomChange(e.target.value)}
                  placeholder="Trail des Trois Seigneurs"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                  <input
                    required
                    type="date"
                    value={createForm.date_debut}
                    onChange={(e) => setCreateForm((f) => ({ ...f, date_debut: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin <span className="text-gray-400 font-normal">(optionnelle)</span></label>
                  <input
                    type="date"
                    value={createForm.date_fin}
                    onChange={(e) => setCreateForm((f) => ({ ...f, date_fin: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant URL</label>
                <input
                  required
                  type="text"
                  value={createForm.slug}
                  onChange={(e) => setCreateForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="trail-des-trois-seigneurs"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                />
                <p className="text-xs text-gray-400 mt-1">Généré automatiquement · modifiable · doit être unique</p>
              </div>
              {createError && <p className="text-sm text-red-600">{createError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleCreateClose} className="flex-1 border rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Annuler
                </button>
                <button type="submit" disabled={createSaving} className="flex-1 bg-[#00C389] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#00a874] disabled:opacity-60">
                  {createSaving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

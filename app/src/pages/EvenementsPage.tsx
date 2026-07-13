import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
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

function EventCard({ evt, past }: { evt: Evenement; past?: boolean }) {
  return (
    <Link
      to={`/admin/${evt.slug}`}
      className={`flex items-center justify-between bg-white rounded-lg border px-5 py-4 hover:border-[#00C389] hover:shadow-sm transition-all group ${past ? 'border-gray-100 opacity-70 hover:opacity-100' : 'border-gray-200'}`}
    >
      <div>
        <div className={`font-semibold group-hover:text-[#005F61] ${past ? 'text-gray-600' : 'text-gray-900'}`}>{evt.nom}</div>
        <div className="text-sm text-gray-500 mt-0.5">{formatDate(evt.date_debut, evt.date_fin)}</div>
      </div>
      <svg className="w-5 h-5 text-gray-400 group-hover:text-[#00C389] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

interface CreateForm {
  nom: string;
  date_debut: string;
  date_fin: string;
  slug: string;
}

const EMPTY_FORM: CreateForm = { nom: '', date_debut: '', date_fin: '', slug: '' };

function EvenementsContent({ onSignOut }: { onSignOut: () => void }) {
  const [evenements, setEvenements] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const aVenir = evenements.filter((e) => e.date_debut >= today).sort((a, b) => a.date_debut.localeCompare(b.date_debut));
  const passes = evenements.filter((e) => e.date_debut < today).sort((a, b) => b.date_debut.localeCompare(a.date_debut));

  function fetchEvenements() {
    supabase
      .from('evenements')
      .select('*')
      .then(({ data }) => {
        setEvenements(data ?? []);
        setLoading(false);
      });
  }

  useEffect(() => { fetchEvenements(); }, []);

  function handleNomChange(nom: string) {
    setForm((f) => ({ ...f, nom, slug: toSlug(nom) }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom || !form.date_debut || !form.slug) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('evenements').insert({
      nom: form.nom,
      date_debut: form.date_debut,
      date_fin: form.date_fin || null,
      slug: form.slug,
    });
    setSaving(false);
    if (err) {
      setError(err.message.includes('unique') ? 'Ce slug est déjà utilisé. Modifiez-le.' : err.message);
      return;
    }
    setShowCreate(false);
    setForm(EMPTY_FORM);
    fetchEvenements();
  }

  function handleClose() {
    setShowCreate(false);
    setForm(EMPTY_FORM);
    setError(null);
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-[#00C389] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Logo VO2max Tarascon" className="h-8 w-8 rounded-full" />
          <h1 className="font-semibold">Espace organisateur</h1>
        </div>
        <button onClick={onSignOut} className="text-sm underline opacity-80 hover:opacity-100">
          Déconnexion
        </button>
      </header>

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
                  <EventCard key={evt.id} evt={evt} />
                ))}
              </div>
            )}

            {passes.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-bold text-gray-500 mb-4">Mes évènements passés</h2>
                <div className="space-y-3">
                  {passes.map((evt) => (
                    <EventCard key={evt.id} evt={evt} past />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={handleClose}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-5">Nouvel évènement</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'évènement</label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={form.nom}
                  onChange={(e) => handleNomChange(e.target.value)}
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
                    value={form.date_debut}
                    onChange={(e) => setForm((f) => ({ ...f, date_debut: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin <span className="text-gray-400 font-normal">(optionnelle)</span></label>
                  <input
                    type="date"
                    value={form.date_fin}
                    onChange={(e) => setForm((f) => ({ ...f, date_fin: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identifiant URL</label>
                <input
                  required
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="trail-des-trois-seigneurs"
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00C389]"
                />
                <p className="text-xs text-gray-400 mt-1">Généré automatiquement · modifiable · doit être unique</p>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 border rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#00C389] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#00a874] disabled:opacity-60"
                >
                  {saving ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
